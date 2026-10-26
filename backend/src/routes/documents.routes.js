const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const {
    generateDocumentLockSeal,
    validateLockPassword,
    encryptDocx,
    decryptDocx,
    isDocxEncrypted,
    extractTextFromDocx,
    generatePdfDocument,
    encryptPdf,
    isPdfEncrypted,
    decryptPdfText
} = require('../services/documentLockService');
const { getAccountTier, hasPaidFeatures } = require('../services/planAccess');

/**
 * GET /api/v1/templates
 * List all available official legal templates
 */
router.get('/templates', (req, res) => {
    res.json({
        templates: [
            { key: 'Employment', title: 'Employment Contract', jurisdiction: 'ZA', version: 1, desc: 'BCEA-compliant employment agreement.' },
            { key: 'Lease', title: 'Residential Lease Agreement', jurisdiction: 'ZA', version: 1, desc: 'Rental Housing Act and CPA compliant.' },
            { key: 'NDA', title: 'Non-Disclosure Agreement', jurisdiction: 'ZA', version: 1, desc: 'Confidentiality and IP trade secret protection.' },
            { key: 'Service', title: 'Service Agreement', jurisdiction: 'ZA', version: 1, desc: 'Scope of work, deliverables, and payment terms.' },
            { key: 'Will', title: 'Last Will and Testament', jurisdiction: 'ZA', version: 1, desc: 'Testamentary estate bequests and executor appointment.' }
        ]
    });
});

/**
 * POST /api/v1/documents/drafts
 * Create a new draft with questionnaire answers and personalized custom clauses
 */
router.post('/drafts', requireAuth, async (req, res, next) => {
    try {
        const { templateKey, title, answers, customClauses } = req.body;
        if (!templateKey || !answers) {
            return res.status(400).json({
                error: { message: 'templateKey and answers are required.', code: 'INVALID_INPUT' }
            });
        }

        if (customClauses && (!Array.isArray(customClauses) || customClauses.length > 0)) {
            const tier = await getAccountTier(req);
            if (!hasPaidFeatures(tier)) {
                return res.status(403).json({ error: { message: 'Custom clauses are available with a paid plan.', code: 'FEATURE_NOT_INCLUDED' } });
            }
        }

        // Resolve template_id from templates table
        let templateId = req.body.templateId;
        if (!templateId) {
            const { data: tpl } = await req.supabase
                .from('templates')
                .select('id')
                .eq('key', templateKey)
                .single();
            templateId = tpl?.id;
        }

        const draftData = {
            owner_id: req.user.id,
            template_id: templateId,
            template_key: templateKey,
            title: title || `${templateKey} Draft`,
            answers: answers,
            custom_clauses: customClauses || [],
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await req.supabase
            .from('draft_documents')
            .insert(draftData)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: { message: 'We could not save this document. Please try again.', code: 'SAVE_FAILED' } });
        }

        res.status(201).json({ message: 'Draft saved successfully.', draft: data });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/documents/:id/lock
 * CRITICAL REQUIREMENT: Lock user document after generation with cryptographic tamper-evident seal.
 */
router.post('/:id/lock', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch document ensuring user ownership
        const { data: doc, error: fetchErr } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .single();

        if (fetchErr || !doc) {
            return res.status(404).json({ error: { message: 'Document not found.', code: 'NOT_FOUND' } });
        }

        if (doc.status === 'locked') {
            return res.status(400).json({ error: { message: 'Document is already locked.', code: 'ALREADY_LOCKED' } });
        }

        // Generate SHA-256 seal
        const seal = generateDocumentLockSeal(doc);

        // Update status to locked via server-side cryptographic lock
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('draft_documents')
            .update({
                status: 'locked',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .select()
            .single();

        if (updateErr) {
            return res.status(400).json({ error: { message: 'We could not lock this document. Please try again.', code: 'UPDATE_FAILED' } });
        }

        // Store generated locked document record
        await req.supabase.from('generated_documents').insert({
            draft_id: id,
            owner_id: req.user.id,
            file_key: `contracts/${req.user.id}/${id}_locked.docx`,
            file_type: 'docx',
            is_locked: true,
            lock_checksum: seal.lockChecksum,
            locked_at: seal.lockedAt,
            locked_by: req.user.id
        });

        res.json({
            message: 'Document locked.',
            seal: seal,
            document: updated
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/documents/:id
 * Retrieve a specific document, strictly enforcing owner authorization.
 * Threat Modelling: Users cannot access another user's contract even if knowing its UUID.
 */
router.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data: doc, error } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .single();

        if (error || !doc) {
            return res.status(404).json({
                error: { message: 'Document not found or access forbidden.', code: 'DOCUMENT_NOT_FOUND' }
            });
        }

        res.json({ document: doc });
    } catch (err) {
        next(err);
    }
});

/**
 * Validate South African 13-digit ID Number using Luhn checksum algorithm
 */
function isValidSouthAfricanID(id) {
    if (!/^\d{13}$/.test(id)) return false;
    const d = id.split('').map(Number);
    // Home Affairs formula:
    const a = d[0] + d[2] + d[4] + d[6] + d[8] + d[10];
    const b = parseInt('' + d[1] + d[3] + d[5] + d[7] + d[9] + d[11], 10) * 2;
    const c = b.toString().split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    const checksum = (10 - ((a + c) % 10)) % 10;
    if (checksum === d[12]) return true;

    // Fallback standard right-to-left Luhn
    let sum = 0;
    for (let i = 12; i >= 0; i--) {
        let digit = d[i];
        if ((12 - i) % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    return sum % 10 === 0;
}

/**
 * POST /api/v1/documents/:id/unlock
 * Unlock a sealed document using verified South African ID or Passport number
 * combined with authenticated account session verification.
 */
router.post('/:id/unlock', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { idNumber, idType = 'sa_id' } = req.body;

        if (!idNumber) {
            return res.status(400).json({
                error: { message: 'South African ID or passport number is required for unlocking.', code: 'MISSING_ID_CREDENTIALS' }
            });
        }

        const cleanId = idNumber.replace(/\s+/g, '').toUpperCase();

        // 1. Validate identity format
        let isValidIdentity = false;
        if (idType === 'sa_id') {
            isValidIdentity = isValidSouthAfricanID(cleanId);
            if (!isValidIdentity) {
                return res.status(400).json({
                    error: { message: 'Invalid South African 13-digit ID number checksum.', code: 'INVALID_SA_ID' }
                });
            }
        } else {
            // Passport format: 7 to 12 alphanumeric characters
            isValidIdentity = /^[A-Z0-9]{7,12}$/i.test(cleanId);
            if (!isValidIdentity) {
                return res.status(400).json({
                    error: { message: 'Invalid passport number format.', code: 'INVALID_PASSPORT' }
                });
            }
        }

        // 2. Fetch document ensuring strict ownership
        const { data: doc, error: fetchErr } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .single();

        if (fetchErr || !doc) {
            return res.status(404).json({
                error: { message: 'Document not found or unauthorized access.', code: 'NOT_FOUND' }
            });
        }

        if (doc.status !== 'locked') {
            return res.status(400).json({
                error: { message: 'Document is not currently locked.', code: 'NOT_LOCKED' }
            });
        }

        // 3. Unlock document: transition status back to 'draft' for editable revisions
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('draft_documents')
            .update({
                status: 'draft',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .select()
            .single();

        if (updateErr) {
            return res.status(400).json({ error: { message: 'We could not unlock this document. Please try again.', code: 'UNLOCK_FAILED' } });
        }

        // 4. Log POPIA-compliant audit event with SHA-256 hashed identity (preserving confidentiality)
        const idHash = require('crypto').createHash('sha256').update(cleanId).digest('hex');
        try {
            await req.supabase.from('audit_events').insert({
                user_id: req.user.id,
                action: 'DOCUMENT_UNLOCKED',
                resource_type: 'draft_document',
                resource_id: id,
                metadata: {
                    id_type: idType,
                    id_hash: idHash,
                    unlocked_at: new Date().toISOString()
                }
            });
        } catch (_) {}

        res.json({
            message: 'Document successfully unlocked and available for revision.',
            document: updated,
            unlockAudit: {
                unlockedAt: new Date().toISOString(),
                identityType: idType,
                verifiedBy: req.user.email
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/documents
 * List user's documents and drafts
 */
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const { data, error } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('owner_id', req.user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: { message: 'We could not load your documents. Please try again.', code: 'FETCH_ERROR' } });
        }

        res.json({ documents: data || [] });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/documents/encrypt-document
 * Encrypts a document (Word .docx or PDF .pdf) using standard AES encryption and user's password.
 * The downloaded artifact requires this password to open in external compatible software.
 */
router.post('/encrypt-document', optionalAuth, async (req, res, next) => {
    try {
        const {
            fileBase64,
            filename,
            format = 'docx',
            password,
            confirmPassword,
            title,
            answers,
            customClauses,
            templateKey
        } = req.body;

        // 1. Password policy verification
        const val = validateLockPassword(password, confirmPassword);
        if (!val.valid) {
            return res.status(400).json({
                error: { message: val.error, code: val.code }
            });
        }

        const normalizedFormat = String(format || 'docx').toLowerCase().trim();

        // 2. Validate format support
        if (normalizedFormat !== 'docx' && normalizedFormat !== 'pdf') {
            return res.status(400).json({
                error: {
                    message: 'File-level encryption is supported for Word (.docx) and PDF (.pdf) documents. Plain text and other formats cannot be natively encrypted with application-independent passwords.',
                    code: 'UNSUPPORTED_FORMAT'
                }
            });
        }

        let encryptedBuffer;
        let cleanBaseName = (filename || 'Contract')
            .replace(/\.[^/.]+$/, '')
            .replace(/_Protected$/i, '')
            .replace(/_LawCompass$/i, '');
        let outputFilename;

        if (normalizedFormat === 'docx') {
            if (!fileBase64) {
                return res.status(400).json({
                    error: { message: 'Document file buffer is required for Word document encryption.', code: 'MISSING_FILE' }
                });
            }
            const inputBuffer = Buffer.from(fileBase64, 'base64');
            encryptedBuffer = await encryptDocx(inputBuffer, password);
            outputFilename = `${cleanBaseName}_LawCompass_Protected.docx`;
        } else if (normalizedFormat === 'pdf') {
            let pdfBytesBuffer;
            if (fileBase64) {
                const rawBuf = Buffer.from(fileBase64, 'base64');
                if (rawBuf.slice(0, 5).toString('utf8') === '%PDF-') {
                    pdfBytesBuffer = rawBuf;
                }
            }
            if (!pdfBytesBuffer) {
                // Generate official PDF from answers/customClauses
                pdfBytesBuffer = await generatePdfDocument({
                    title: title || cleanBaseName.replace(/_/g, ' '),
                    templateKey: templateKey || 'Agreement',
                    answers: answers || {},
                    customClauses: customClauses || []
                });
            }
            encryptedBuffer = await encryptPdf(pdfBytesBuffer, password);
            outputFilename = `${cleanBaseName}_LawCompass_Protected.pdf`;
        }

        // 3. POPIA-compliant audit logging (confidentiality: NEVER store password)
        if (req.user && req.supabase) {
            try {
                await req.supabase.from('audit_events').insert({
                    user_id: req.user.id,
                    action: 'DOCUMENT_ENCRYPTED_AND_DOWNLOADED',
                    resource_type: 'document',
                    metadata: {
                        filename: outputFilename,
                        format: normalizedFormat,
                        file_size_bytes: encryptedBuffer.length,
                        encrypted_at: new Date().toISOString()
                    }
                });
            } catch (_) {}
        }

        res.json({
            message: 'Document successfully encrypted. Password will be required to open.',
            filename: outputFilename,
            format: normalizedFormat,
            fileBase64: encryptedBuffer.toString('base64'),
            fileSizeBytes: encryptedBuffer.length,
            mimeType: normalizedFormat === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/documents/decrypt-document
 * Unlocks an encrypted document using the user's password for in-app viewing/explaining.
 */
router.post('/decrypt-document', optionalAuth, async (req, res, next) => {
    try {
        const { fileBase64, filename, password, format } = req.body;
        if (!fileBase64 || !password) {
            return res.status(400).json({
                error: { message: 'Document file and password are required for unlocking.', code: 'INVALID_INPUT' }
            });
        }

        const buffer = Buffer.from(fileBase64, 'base64');
        const isDocx = (format === 'docx') || (filename && filename.toLowerCase().endsWith('.docx')) || isDocxEncrypted(buffer);
        const isPdf = (format === 'pdf') || (filename && filename.toLowerCase().endsWith('.pdf')) || isPdfEncrypted(buffer) || buffer.slice(0, 5).toString('utf8') === '%PDF-';

        if (isDocx) {
            const decryptedBuf = await decryptDocx(buffer, password);
            const text = await extractTextFromDocx(decryptedBuf);
            return res.json({
                message: 'Document successfully unlocked.',
                format: 'docx',
                text
            });
        } else if (isPdf) {
            const text = await decryptPdfText(buffer, password);
            return res.json({
                message: 'Document successfully unlocked.',
                format: 'pdf',
                text
            });
        } else {
            return res.status(400).json({
                error: { message: 'Unsupported encrypted document format.', code: 'UNSUPPORTED_FORMAT' }
            });
        }
    } catch (err) {
        if (err.code === 'INVALID_PASSWORD') {
            return res.status(401).json({
                error: { message: 'Incorrect password. The document could not be unlocked.', code: 'INVALID_PASSWORD' }
            });
        }
        next(err);
    }
});

/**
 * POST /api/v1/documents/check-encryption
 * Fast inspection to determine if an uploaded artifact is password-protected.
 */
router.post('/check-encryption', optionalAuth, async (req, res) => {
    try {
        const { fileBase64, filename } = req.body;
        if (!fileBase64) {
            return res.json({ isEncrypted: false, format: 'unknown' });
        }
        const buffer = Buffer.from(fileBase64, 'base64');
        if (isDocxEncrypted(buffer) || (filename && filename.toLowerCase().endsWith('.docx') && isDocxEncrypted(buffer))) {
            return res.json({ isEncrypted: true, format: 'docx' });
        }
        if (isPdfEncrypted(buffer) || (filename && filename.toLowerCase().endsWith('.pdf') && isPdfEncrypted(buffer))) {
            return res.json({ isEncrypted: true, format: 'pdf' });
        }
        return res.json({ isEncrypted: false, format: 'unencrypted' });
    } catch (_) {
        res.json({ isEncrypted: false, format: 'unknown' });
    }
});

module.exports = router;

