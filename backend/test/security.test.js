/**
 * ==============================================================================
 * LAWCOMPASS AUTOMATED SECURITY & MARKET READINESS TEST SUITE
 * Verifies Requirements 1 - 5 (Risk Assessment, Threat Modelling, Secure Coding,
 * Security Testing, and Secure Integration)
 * ==============================================================================
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const emailService = require('../src/services/emailService');

async function runTests() {
    console.log('\n======================================================');
    console.log('🔒 LAWCOMPASS SECURITY ASSURANCE & PENETRATION TEST RUN');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ [FAIL] ${name}`);
            console.error(`     Reason: ${err.message}\n`);
            failed++;
        }
    }

    let userAToken = '';
    let userAId = '';
    let userBToken = '';
    let userBId = '';
    let draftId = '';

    // --------------------------------------------------------------------------
    // 1. HEALTH & BASELINE
    // --------------------------------------------------------------------------
    await test('Server health check & baseline endpoints active', async () => {
        const res = await fetch(`${BASE_URL}/health`);
        if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
        const data = await res.json();
        if (data.status !== 'pass' && data.status !== 'healthy') throw new Error(`Unexpected status: ${data.status}`);
    });

    // --------------------------------------------------------------------------
    // 2. REGISTRATION & OTP VERIFICATION TESTS
    // --------------------------------------------------------------------------
    const testEmailA = `test.user.a.${Date.now()}@lawcompass.test`;
    let issuedOtp = '';

    await test('Rejection of registration without Terms and Conditions acceptance', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/auth/register-start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Sipho',
                surname: 'Mthembu',
                residentialAddress: '12 Rosebank Rd',
                city: 'Johannesburg',
                province: 'Gauteng',
                postalCode: '2196',
                email: testEmailA,
                password: 'Password@123!',
                termsAccepted: false // Not accepted
            })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        const data = await res.json();
        if (data.error?.code !== 'TERMS_NOT_ACCEPTED') throw new Error(`Unexpected error code: ${data.error?.code}`);
    });

    await test('Rejection of weak password (< 8 characters)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/auth/register-start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Sipho',
                surname: 'Mthembu',
                residentialAddress: '12 Rosebank Rd',
                city: 'Johannesburg',
                province: 'Gauteng',
                postalCode: '2196',
                email: testEmailA,
                password: 'short',
                termsAccepted: true
            })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await test('Initiate registration and dispatch 6-digit OTP', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/auth/register-start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Sipho',
                surname: 'Mthembu',
                dob: '1992-08-14',
                persona: 'business_owner',
                preferredLanguage: 'isiZulu',
                residentialAddress: '12 Rosebank Rd',
                city: 'Johannesburg',
                province: 'Gauteng',
                postalCode: '2196',
                phone: '+27 82 555 7890',
                email: testEmailA,
                password: 'Password@123!',
                termsAccepted: true
            })
        });
        if (!res.ok) throw new Error(`Registration start failed with status ${res.status}`);
        const data = await res.json();
        if (data.devOtp) throw new Error('SECURITY VIOLATION: devOtp must not be exposed in HTTP response');
        
        const sent = emailService.getLastSentVerificationForTest(testEmailA);
        if (!sent || !sent.code || sent.code.length !== 6) throw new Error('Verification email was not dispatched via email service');
        issuedOtp = sent.code;
    });

    await test('Rejection of invalid OTP verification code', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmailA, otp: '000000' })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await test('Successful OTP verification and user session issuance', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmailA, otp: issuedOtp })
        });
        if (!res.ok) throw new Error(`OTP verification failed: ${res.status}`);
        const data = await res.json();
        if (!data.session?.accessToken) throw new Error('No access token received');
        userAToken = data.session.accessToken;
        userAId = data.user.id;
    });

    // Create User B for Cross-Tenant Isolation Testing
    const testEmailB = `test.user.b.${Date.now()}@lawcompass.test`;
    await test('Setup secondary test user (User B) for authorization isolation', async () => {
        const regRes = await fetch(`${BASE_URL}/api/v1/auth/register-start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Lerato',
                surname: 'Dlamini',
                residentialAddress: '88 Strand St',
                city: 'Cape Town',
                province: 'Western Cape',
                postalCode: '8001',
                email: testEmailB,
                password: 'Password@123!',
                termsAccepted: true
            })
        });
        const regData = await regRes.json();
        if (regData.devOtp) throw new Error('SECURITY VIOLATION: devOtp leaked for User B');
        const sentB = emailService.getLastSentVerificationForTest(testEmailB);
        if (!sentB || !sentB.code) throw new Error('Verification email for User B was not dispatched');
        
        const vRes = await fetch(`${BASE_URL}/api/v1/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmailB, otp: sentB.code })
        });
        const vData = await vRes.json();
        userBToken = vData.session.accessToken;
        userBId = vData.user.id;
    });

    // --------------------------------------------------------------------------
    // 3. THREAT MODELLING & ACCESS CONTROL TESTS
    // --------------------------------------------------------------------------
    await test('Blocking unauthorized document access without JWT token', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/documents`);
        if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    });

    await test('Create draft contract under User A', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/documents/drafts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userAToken}`
            },
            body: JSON.stringify({
                templateKey: 'Employment',
                title: 'Senior Software Engineer Agreement',
                answers: { employeeName: 'Lerato Khumalo', remuneration: 'R75,000' }
            })
        });
        if (!res.ok) throw new Error(`Failed to create draft: ${res.status}`);
        const data = await res.json();
        draftId = data.draft.id;
    });

    await test('Threat Model Check: User B CANNOT access User A document (Cross-Tenant Isolation)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/documents/${draftId}`, {
            headers: { 'Authorization': `Bearer ${userBToken}` }
        });
        if (res.status !== 404 && res.status !== 403) {
            throw new Error(`CRITICAL SECURITY FAILURE: User B accessed User A document! Status: ${res.status}`);
        }
    });

    // --------------------------------------------------------------------------
    // 4. CRYPTOGRAPHIC DOCUMENT LOCKING & UNLOCKING
    // --------------------------------------------------------------------------
    await test('Cryptographic Document Locking with SHA-256 seal', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/documents/${draftId}/lock`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userAToken}` }
        });
        if (!res.ok) throw new Error(`Failed to lock document: ${res.status}`);
        const data = await res.json();
        if (!data.seal?.lockChecksum || data.seal.lockChecksum.length !== 64) {
            throw new Error('Valid SHA-256 checksum not present in seal');
        }
    });

    await test('Rejection of document unlocking with invalid South African ID', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/documents/${draftId}/unlock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userAToken}`
            },
            body: JSON.stringify({
                idNumber: '9001010000000', // Invalid Luhn checksum
                idType: 'sa_id'
            })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        const data = await res.json();
        if (data.error?.code !== 'INVALID_SA_ID') throw new Error(`Unexpected code: ${data.error?.code}`);
    });

    await test('Successful document unlocking with valid South African ID checksum', async () => {
        // Valid Luhn 13-digit test ID: 9001015009087
        const res = await fetch(`${BASE_URL}/api/v1/documents/${draftId}/unlock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userAToken}`
            },
            body: JSON.stringify({
                idNumber: '9201015009082',
                idType: 'sa_id'
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Unlock failed (${res.status}): ${JSON.stringify(data)}`);
        if (data.document?.status !== 'draft') throw new Error('Document status was not unlocked to draft');
    });

    // --------------------------------------------------------------------------
    // 5. FILE UPLOAD SECURITY (MALWARE & SIZE PROTECTION)
    // --------------------------------------------------------------------------
    await test('Rejection of malicious executable file upload (.exe / .sh)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/uploads/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userAToken}`
            },
            body: JSON.stringify({
                filename: 'malicious_payload.exe',
                mimeType: 'application/x-msdownload',
                fileSizeBytes: 2048
            })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        const data = await res.json();
        if (data.error?.code !== 'MALICIOUS_FILE_TYPE') throw new Error(`Unexpected code: ${data.error?.code}`);
    });

    await test('Rejection of oversized file upload (> 10MB)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/uploads/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userAToken}`
            },
            body: JSON.stringify({
                filename: 'huge_contract.pdf',
                mimeType: 'application/pdf',
                fileSizeBytes: 15 * 1024 * 1024 // 15 MB
            })
        });
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        const data = await res.json();
        if (data.error?.code !== 'FILE_TOO_LARGE') throw new Error(`Unexpected code: ${data.error?.code}`);
    });

    // --------------------------------------------------------------------------
    // 6. SQL INJECTION & XSS SANITIZATION
    // --------------------------------------------------------------------------
    await test('Input Sanitization & SQL Injection Resilience on Login', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "' OR '1'='1' --",
                password: "' OR '1'='1' --"
            })
        });
        if (res.status !== 401 && res.status !== 400) {
            throw new Error(`Expected 401/400 for SQLi attempt, got ${res.status}`);
        }
    });

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
