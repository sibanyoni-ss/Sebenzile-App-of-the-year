const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabasePublic, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const emailService = require('../services/emailService');

// In-memory secure OTP store for pending email verifications with automatic TTL expiry
const pendingVerifications = new Map();

// Helper to sanitize and trim string inputs
const cleanStr = val => (typeof val === 'string' ? val.trim() : '');

// Cryptographic hash for OTPs to prevent plaintext storage in memory
function hashOtpCode(email, code) {
    return crypto.createHash('sha256').update(`${email.trim().toLowerCase()}:${code.trim()}`).digest('hex');
}

/**
 * Clean up expired OTPs periodically (every 5 minutes)
 */
setInterval(() => {
    const now = Date.now();
    for (const [email, entry] of pendingVerifications.entries()) {
        if (entry.expiresAt < now) {
            pendingVerifications.delete(email);
        }
    }
}, 5 * 60 * 1000);

/**
 * POST /api/v1/auth/register-start
 * Step 1: Validate full user details, terms acceptance, issue a 6-digit email OTP,
 * and dispatch it via ServerSMTP / TurboSMTP API v2.
 */
router.post('/register-start', async (req, res, next) => {
    try {
        const {
            firstName,
            surname,
            dob,
            residentialAddress,
            city,
            province,
            postalCode,
            email,
            phone,
            preferredLanguage,
            persona,
            password,
            termsAccepted
        } = req.body;

        // 1. Mandatory input validations
        const cleanEmail = cleanStr(email).toLowerCase();
        const cleanFirst = cleanStr(firstName);
        const cleanSur = cleanStr(surname);
        const cleanAddr = cleanStr(residentialAddress);
        const cleanCity = cleanStr(city);
        const cleanProv = cleanStr(province);
        const cleanPostal = cleanStr(postalCode);

        if (!cleanFirst || !cleanSur) {
            return res.status(400).json({ error: { message: 'First name and surname are required.', code: 'MISSING_NAME' } });
        }
        if (!cleanAddr || !cleanCity || !cleanProv || !cleanPostal) {
            return res.status(400).json({ error: { message: 'Complete residential address, city, province, and postal code are required.', code: 'MISSING_ADDRESS' } });
        }
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return res.status(400).json({ error: { message: 'A valid email address is required.', code: 'INVALID_EMAIL' } });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ error: { message: 'Password must be at least 8 characters long.', code: 'WEAK_PASSWORD' } });
        }
        if (!termsAccepted) {
            return res.status(400).json({ error: { message: 'You must accept the LawCompass Terms and Conditions (Version 1.0 - South Africa) to register.', code: 'TERMS_NOT_ACCEPTED' } });
        }

        // Validate province is one of South Africa's 9 provinces
        const validProvinces = [
            'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
            'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
        ];
        if (!validProvinces.includes(cleanProv)) {
            return res.status(400).json({ error: { message: 'Please select a valid South African province.', code: 'INVALID_PROVINCE' } });
        }

        // 2. Generate cryptographically secure 6-digit numeric OTP (100000 - 999999)
        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const codeHash = hashOtpCode(cleanEmail, otpCode);
        const expiresAt = Date.now() + 10 * 60 * 1000;

        const payload = {
            firstName: cleanFirst,
            surname: cleanSur,
            fullName: `${cleanFirst} ${cleanSur}`,
            dob: cleanStr(dob) || null,
            residentialAddress: cleanAddr,
            city: cleanCity,
            province: cleanProv,
            postalCode: cleanPostal,
            email: cleanEmail,
            phone: cleanStr(phone) || null,
            preferredLanguage: cleanStr(preferredLanguage) || 'English',
            persona: cleanStr(persona) || 'individual',
            password: password,
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: '1.0-draft'
        };

        // 3. Dispatch real verification email using ServerSMTP / TurboSMTP API
        try {
            await emailService.sendVerificationEmail({
                to: cleanEmail,
                recipientName: cleanFirst,
                code: otpCode,
                expiresInMinutes: 10
            });
        } catch (emailErr) {
            return res.status(502).json({
                error: {
                    message: `We could not deliver the verification email to ${cleanEmail}. Please verify your email address and try again.`,
                    code: 'EMAIL_DELIVERY_FAILED'
                }
            });
        }

        // Store secure hash of OTP (plaintext code is never retained in memory or DB)
        pendingVerifications.set(cleanEmail, {
            codeHash,
            expiresAt,
            attempts: 0,
            lastSentAt: Date.now(),
            payload
        });

        // Log audit event for registration initiation (non-blocking)
        try {
            await supabaseAdmin.from('audit_events').insert({
                action: 'AUTH_REGISTER_OTP_ISSUED',
                resource_type: 'user_registration',
                resource_id: cleanEmail,
                metadata: { email: cleanEmail, ip: req.ip, user_agent: req.get('User-Agent') }
            });
        } catch (_) {}

        // Respond with security notice - ABSOLUTELY ZERO verification codes in response!
        res.status(200).json({
            status: 'pending_verification',
            message: `We have sent a verification code to your email address (${cleanEmail}). Please check your inbox and spam folder.`,
            email: cleanEmail,
            expiresInSeconds: 600
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/verify-otp
 * Step 2: Validate 6-digit OTP, finalize user creation, and issue active JWT session.
 */
router.post('/verify-otp', async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const cleanEmail = cleanStr(email).toLowerCase();
        const cleanOtp = cleanStr(otp);

        if (!cleanEmail || !cleanOtp) {
            return res.status(400).json({ error: { message: 'Email and OTP verification code are required.', code: 'MISSING_FIELDS' } });
        }

        if (!/^[0-9]{6}$/.test(cleanOtp)) {
            return res.status(400).json({ error: { message: 'Verification code must be a 6-digit number.', code: 'INVALID_OTP_FORMAT' } });
        }

        const record = pendingVerifications.get(cleanEmail);
        if (!record) {
            return res.status(400).json({ error: { message: 'No active verification found for this email, or code has expired. Please register again.', code: 'OTP_NOT_FOUND' } });
        }

        if (Date.now() > record.expiresAt) {
            pendingVerifications.delete(cleanEmail);
            return res.status(400).json({ error: { message: 'Verification code has expired. Please request a new code.', code: 'OTP_EXPIRED' } });
        }

        record.attempts += 1;
        if (record.attempts > 5) {
            pendingVerifications.delete(cleanEmail);
            return res.status(429).json({ error: { message: 'Too many incorrect attempts. For your security, this code has been invalidated. Please start registration again.', code: 'TOO_MANY_ATTEMPTS' } });
        }

        // Timing-safe cryptographic comparison using SHA-256 hash of provided code
        const inputHash = hashOtpCode(cleanEmail, cleanOtp);
        const isMatch = crypto.timingSafeEqual(Buffer.from(record.codeHash, 'hex'), Buffer.from(inputHash, 'hex'));

        if (!isMatch) {
            const remaining = Math.max(0, 5 - record.attempts);
            return res.status(400).json({
                error: {
                    message: `Invalid verification code. Please check your inbox and try again. (${remaining} attempts remaining)`,
                    code: 'INVALID_OTP'
                }
            });
        }

        const payload = record.payload;

        // 3. Create confirmed user account in Supabase Auth
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: payload.email,
            password: payload.password,
            email_confirm: true,
            user_metadata: {
                full_name: payload.fullName,
                first_name: payload.firstName,
                surname: payload.surname,
                date_of_birth: payload.dob,
                residential_address: payload.residentialAddress,
                city: payload.city,
                province: payload.province,
                postal_code: payload.postalCode,
                phone: payload.phone,
                preferred_language: payload.preferredLanguage,
                persona: payload.persona,
                terms_accepted: true,
                terms_accepted_at: payload.termsAcceptedAt,
                terms_version: payload.termsVersion,
                email_verified: true
            }
        });

        if (createError && !createError.message.includes('already registered')) {
            return res.status(400).json({ error: { message: createError.message, code: 'REGISTRATION_FAILED' } });
        }

        const userId = createData?.user?.id;

        // 4. Upsert detailed profile record in database
        if (userId) {
            // First attempt with full statutory columns
            const fullProfile = {
                id: userId,
                first_name: payload.firstName,
                surname: payload.surname,
                full_name: payload.fullName,
                date_of_birth: payload.dob,
                residential_address: payload.residentialAddress,
                city: payload.city,
                province: payload.province,
                postal_code: payload.postalCode,
                email: payload.email,
                phone: payload.phone,
                preferred_language: payload.preferredLanguage,
                persona: payload.persona,
                tier: 'free',
                terms_accepted: true,
                terms_accepted_at: payload.termsAcceptedAt,
                terms_version: payload.termsVersion,
                email_verified: true,
                updated_at: new Date().toISOString()
            };

            const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(fullProfile);

            // Graceful fallback to core columns if database migration hasn't been applied yet
            if (profileErr) {
                try {
                    await supabaseAdmin.from('profiles').upsert({
                        id: userId,
                        full_name: payload.fullName,
                        email: payload.email,
                        phone: payload.phone,
                        tier: 'free',
                        updated_at: new Date().toISOString()
                    });
                } catch (_) {}
            }
        }

        // 5. Sign in to generate active session
        const { data: loginData, error: loginError } = await supabasePublic.auth.signInWithPassword({
            email: payload.email,
            password: payload.password
        });

        if (loginError) {
            return res.status(500).json({ error: { message: 'Account verified, but automated sign-in failed. Please sign in with your credentials.', code: 'SIGNIN_FAILED' } });
        }

        // Clean up pending verification record atomically
        pendingVerifications.delete(cleanEmail);

        // Audit log
        try {
            await supabaseAdmin.from('audit_events').insert({
                user_id: loginData.user.id,
                action: 'AUTH_REGISTER_CONFIRMED',
                resource_type: 'user',
                resource_id: loginData.user.id,
                metadata: {
                    email: payload.email,
                    province: payload.province,
                    persona: payload.persona,
                    terms_version: payload.termsVersion,
                    ip: req.ip
                }
            });
        } catch (_) {}

        res.status(201).json({
            message: 'Email successfully verified! Welcome to LawCompass.',
            session: {
                accessToken: loginData.session.access_token,
                refreshToken: loginData.session.refresh_token,
                expiresAt: loginData.session.expires_at
            },
            user: {
                id: loginData.user.id,
                email: loginData.user.email,
                fullName: payload.fullName,
                firstName: payload.firstName,
                surname: payload.surname,
                province: payload.province,
                persona: payload.persona,
                tier: 'free'
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/resend-otp
 * Resend a fresh 6-digit verification code with 60-second cooldown and email dispatch.
 */
router.post('/resend-otp', async (req, res, next) => {
    try {
        const { email } = req.body;
        const cleanEmail = cleanStr(email).toLowerCase();

        const record = pendingVerifications.get(cleanEmail);
        if (!record) {
            return res.status(400).json({ error: { message: 'No registration pending for this email address. Please register first.', code: 'NO_PENDING_REGISTRATION' } });
        }

        // Enforce 60-second cooldown between resend requests
        const now = Date.now();
        if (record.lastSentAt && (now - record.lastSentAt) < 60 * 1000) {
            const waitSec = Math.ceil((60 * 1000 - (now - record.lastSentAt)) / 1000);
            return res.status(429).json({
                error: {
                    message: `Please wait ${waitSec} seconds before requesting a fresh verification code.`,
                    code: 'RESEND_COOLDOWN'
                }
            });
        }

        // Generate fresh 6-digit numeric OTP and hash it
        const newOtp = crypto.randomInt(100000, 1000000).toString();
        const newHash = hashOtpCode(cleanEmail, newOtp);

        // Dispatch email via ServerSMTP / TurboSMTP
        try {
            await emailService.sendVerificationEmail({
                to: cleanEmail,
                recipientName: record.payload?.firstName || '',
                code: newOtp,
                expiresInMinutes: 10
            });
        } catch (emailErr) {
            return res.status(502).json({
                error: {
                    message: 'We could not dispatch a fresh verification code at this time. Please try again.',
                    code: 'EMAIL_DELIVERY_FAILED'
                }
            });
        }

        // Supersede and invalidate previous code
        record.codeHash = newHash;
        record.expiresAt = Date.now() + 10 * 60 * 1000;
        record.attempts = 0;
        record.lastSentAt = Date.now();

        res.status(200).json({
            status: 'otp_resent',
            message: `A fresh verification code has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`,
            email: cleanEmail,
            expiresInSeconds: 600
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Legacy / Direct Register fallback (POST /api/v1/auth/register)
 */
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, fullName, firstName, surname, phone, residentialAddress, city, province, postalCode, persona } = req.body;
        const resolvedName = fullName || (firstName ? `${firstName} ${surname || ''}`.trim() : 'LawCompass User');
        if (!email || !password) {
            return res.status(400).json({
                error: { message: 'Email and password are required.', code: 'MISSING_FIELDS' }
            });
        }

        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: resolvedName,
                first_name: firstName || resolvedName.split(' ')[0],
                surname: surname || resolvedName.split(' ').slice(1).join(' '),
                phone: phone || null,
                residential_address: residentialAddress || null,
                city: city || null,
                province: province || null,
                postal_code: postalCode || null,
                persona: persona || 'individual',
                terms_accepted: true,
                terms_accepted_at: new Date().toISOString(),
                terms_version: '1.0-draft',
                email_verified: true
            }
        });

        if (createError) {
            return res.status(400).json({
                error: { message: createError.message, code: 'REGISTRATION_FAILED' }
            });
        }

        const { data: loginData } = await supabasePublic.auth.signInWithPassword({
            email,
            password
        });

        res.status(201).json({
            message: 'Account created successfully.',
            session: loginData?.session ? {
                accessToken: loginData.session.access_token,
                refreshToken: loginData.session.refresh_token,
                expiresAt: loginData.session.expires_at
            } : null,
            user: {
                id: createData.user.id,
                email: createData.user.email,
                fullName: resolvedName
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and issue JWT token
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: { message: 'Email and password are required.', code: 'MISSING_FIELDS' }
            });
        }

        const { data, error } = await supabasePublic.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({
                error: { message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' }
            });
        }

        // Log audit event for login (non-critical)
        try {
            await supabaseAdmin.from('audit_events').insert({
                user_id: data.user.id,
                action: 'AUTH_LOGIN',
                resource_type: 'user',
                resource_id: data.user.id,
                metadata: { ip: req.ip, user_agent: req.get('User-Agent') }
            });
        } catch (_) {}

        res.json({
            message: 'Login successful.',
            session: {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresAt: data.session.expires_at
            },
            user: {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name || 'LawCompass User'
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', requireAuth, async (req, res, next) => {
    try {
        await req.supabase.auth.signOut();
        res.json({ message: 'Signed out successfully.' });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const { data: profile } = await req.supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        const meta = req.user.user_metadata || {};
        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                fullName: profile?.full_name || meta.full_name || 'LawCompass User',
                firstName: profile?.first_name || meta.first_name || '',
                surname: profile?.surname || meta.surname || '',
                dateOfBirth: profile?.date_of_birth || meta.date_of_birth || null,
                residentialAddress: profile?.residential_address || meta.residential_address || '',
                city: profile?.city || meta.city || '',
                province: profile?.province || meta.province || '',
                postalCode: profile?.postal_code || meta.postal_code || '',
                phone: profile?.phone || meta.phone || '',
                preferredLanguage: profile?.preferred_language || meta.preferred_language || 'English',
                persona: profile?.persona || meta.persona || 'individual',
                tier: profile?.tier || 'free',
                termsAccepted: profile?.terms_accepted ?? meta.terms_accepted ?? true,
                termsVersion: profile?.terms_version || meta.terms_version || '1.0-draft',
                emailVerified: profile?.email_verified ?? meta.email_verified ?? true
            }
        });
    } catch (err) {
        next(err);
    }
});

/** Update editable fields on the signed-in user's own profile. */
router.patch('/me', requireAuth, async (req, res, next) => {
    try {
        const allowed = ['first_name', 'surname', 'full_name', 'date_of_birth', 'residential_address', 'city', 'province', 'postal_code', 'phone', 'preferred_language', 'persona'];
        const input = req.body || {};
        const updates = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                if (typeof input[key] !== 'string' || input[key].length > (key === 'residential_address' ? 500 : 160)) {
                    return res.status(400).json({ error: { message: `Invalid ${key.replaceAll('_', ' ')}.`, code: 'INVALID_PROFILE_FIELD' } });
                }
                updates[key] = input[key].trim() || null;
            }
        }
        if (!Object.keys(updates).length) return res.status(400).json({ error: { message: 'No editable profile fields were provided.', code: 'EMPTY_PROFILE_UPDATE' } });
        if (updates.full_name === null || (updates.first_name === null && input.first_name !== undefined) || (updates.surname === null && input.surname !== undefined)) {
            return res.status(400).json({ error: { message: 'Name fields cannot be empty.', code: 'INVALID_PROFILE_FIELD' } });
        }
        for (const key of ['residential_address', 'city', 'province', 'postal_code']) {
            if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] === null) {
                return res.status(400).json({ error: { message: `${key.replaceAll('_', ' ')} cannot be empty.`, code: 'INVALID_PROFILE_FIELD' } });
            }
        }
        if (updates.province && !['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'].includes(updates.province)) {
            return res.status(400).json({ error: { message: 'Select a valid South African province.', code: 'INVALID_PROFILE_FIELD' } });
        }
        if (updates.preferred_language && !['English', 'isiZulu', 'isiXhosa', 'Afrikaans', 'Sesotho', 'Setswana', 'Sepedi', 'siSwati', 'Tshivenda', 'isiNdebele', 'Xitsonga'].includes(updates.preferred_language)) {
            return res.status(400).json({ error: { message: 'Select a supported language.', code: 'INVALID_PROFILE_FIELD' } });
        }
        if (updates.persona && !['individual', 'student', 'business_owner'].includes(updates.persona)) {
            return res.status(400).json({ error: { message: 'Select a valid account type.', code: 'INVALID_PROFILE_FIELD' } });
        }
        updates.updated_at = new Date().toISOString();
        const { data, error } = await req.supabase.from('profiles').update(updates).eq('id', req.user.id).select('*').single();
        if (error) return next(error);
        const metaUpdates = {};
        if (updates.full_name) metaUpdates.full_name = updates.full_name;
        if (updates.first_name) metaUpdates.first_name = updates.first_name;
        if (updates.surname) metaUpdates.surname = updates.surname;
        if (Object.keys(metaUpdates).length) await req.supabase.auth.updateUser({ data: metaUpdates });
        res.json({ user: data });
    } catch (err) { next(err); }
});

/**
 * GET /api/v1/auth/terms
 * Retrieve current terms metadata and statutory framework
 */
router.get('/terms', (req, res) => {
    res.json({
        title: 'LawCompass South African Terms and Conditions',
        version: '1.0-draft',
        effectiveDate: '2026-10-24',
        jurisdiction: 'South Africa',
        statutoryFramework: [
            'Protection of Personal Information Act 4 of 2013 (POPIA)',
            'Consumer Protection Act 68 of 2008 (CPA)',
            'Electronic Communications and Transactions Act 25 of 2002 (ECTA)',
            'Cybercrimes Act 19 of 2020'
        ],
        termsUrl: '/terms.html'
    });
});

module.exports = router;
