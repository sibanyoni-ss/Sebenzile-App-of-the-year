/**
 * ==============================================================================
 * FRONTEND CHECKS TEST SUITE (Static & Behavioral Analysis)
 * ==============================================================================
 * Validates:
 * 1. Mock law firms dataset is completely removed from app.js.
 * 2. API failures never render mock or fabricated results.
 * 3. Geolocation handling includes explanation dialog, secure-context check,
 *    and explicit error branches (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT).
 * 4. Precise coordinates are not leaked in notifications/toasts.
 * 5. Manual fallback paths (city presets & suburb lookup) are fully wired.
 * 6. Stale asynchronous response protection (race-condition guard) is present.
 * 7. Consultation modal contains demo notice and removes false dispatch claims.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runFrontendChecks() {
    console.log('\n======================================================');
    console.log('🖥️  LAWCOMPASS FRONTEND CODE INTEGRITY & SAFETY TESTS');
    console.log('======================================================\n');

    const appJsPath = path.resolve(__dirname, '../../app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');
    const documentsRoute = fs.readFileSync(path.resolve(__dirname, '../src/routes/documents.routes.js'), 'utf8');
    const loginHtml = fs.readFileSync(path.resolve(__dirname, '../../login.html'), 'utf8');
    const signupHtml = fs.readFileSync(path.resolve(__dirname, '../../signup.html'), 'utf8');
    const stylesCss = fs.readFileSync(path.resolve(__dirname, '../../styles.css'), 'utf8');

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ [FAIL] ${name}`);
            console.error(`     Reason: ${err.message}\n`);
            failed++;
        }
    }

    // --------------------------------------------------------------------------
    // 1. ELIMINATION OF HARDCODED / MOCK LAW FIRM DATASET
    // --------------------------------------------------------------------------
    test('Mock firms dataset (LAW_FIRMS) is completely removed from app.js', () => {
        assert.ok(!appJs.includes('const LAW_FIRMS = ['), 'app.js must not contain hardcoded LAW_FIRMS array');
        assert.ok(!appJs.includes('f_cd_1'), 'app.js must not contain mock firm IDs');
        assert.ok(!appJs.includes('Goliath & Co Attorneys'), 'app.js must not contain mock firm records');
    });

    test('API failure / empty result fallback NEVER replaces response with mock firms', () => {
        // Look at help() function in app.js
        const helpFuncMatch = appJs.match(/function help\(\) \{([\s\S]*?)\nfunction /);
        assert.ok(helpFuncMatch, 'help() function must exist in app.js');
        const helpCode = helpFuncMatch[1];

        assert.ok(!helpCode.includes('LAW_FIRMS.filter'), 'help() must never fallback to LAW_FIRMS filter');
        assert.ok(!helpCode.includes('matching.map'), 'help() must not construct mock firm distances');
    });

    // --------------------------------------------------------------------------
    // 2. GEOLOCATION SAFETY & ERROR PATHS
    // --------------------------------------------------------------------------
    test('Device GPS is requested only after an explanation modal / user confirmation', () => {
        assert.ok(appJs.includes('showDeviceLocationModal'), 'Must show explanation modal before requesting geolocation');
        assert.ok(appJs.includes('Location Privacy & Proximity') || appJs.includes('LOCATION PRIVACY'), 'Modal must explain location privacy');
    });

    test('Geolocation handles Secure Context (HTTPS) restriction', () => {
        assert.ok(appJs.includes('isSecureContext'), 'Must check window.isSecureContext for GPS restriction');
    });

    test('Geolocation handles all error codes: PERMISSION_DENIED (1), POSITION_UNAVAILABLE (2), TIMEOUT (3)', () => {
        assert.ok(appJs.includes('err.code === 1'), 'Must handle PERMISSION_DENIED (code 1)');
        assert.ok(appJs.includes('err.code === 2'), 'Must handle POSITION_UNAVAILABLE (code 2)');
        assert.ok(appJs.includes('err.code === 3'), 'Must handle TIMEOUT (code 3)');
    });

    test('Precise coordinates are NOT displayed in notifications / toasts', () => {
        assert.ok(!appJs.includes('GPS coordinates detected (${userCoords.lat'), 'Must NOT display raw coordinates in toast');
        assert.ok(!appJs.includes('GPS coordinates detected ('), 'Must NOT display raw coordinates in toast');
    });

    // --------------------------------------------------------------------------
    // 3. MANUAL FALLBACK (CITY PRESETS & SUBURB LOOKUP)
    // --------------------------------------------------------------------------
    test('City presets are explicitly labeled as approximate city centers', () => {
        assert.ok(appJs.includes('Approx. City Center') || appJs.includes('Approximate City Center'), 'City preset names must specify approximation');
        assert.ok(appJs.includes('isApproximate: true'), 'Preset objects must flag isApproximate');
    });

    test('Manual suburb lookup connects to backend geocoding endpoint', () => {
        assert.ok(appJs.includes('/api/v1/legal-help/geocode?q='), 'Must query backend geocoding endpoint for suburbs');
        assert.ok(appJs.includes('suburb-results-dropdown'), 'Must display suburb suggestions dropdown');
    });

    // --------------------------------------------------------------------------
    // 4. ASYNCHRONOUS RACE CONDITION & STALE RESPONSE PROTECTION
    // --------------------------------------------------------------------------
    test('Race condition prevention: Uses AbortController and sequence counter', () => {
        assert.ok(appJs.includes('activeSearchController'), 'Must maintain active search controller');
        assert.ok(appJs.includes('searchSequence'), 'Must maintain search sequence counter');
        assert.ok(appJs.includes('currentSeq !== searchSequence'), 'Must discard stale search responses');
    });

    // --------------------------------------------------------------------------
    // 5. PRIVACY & CONSULTATION MODAL TRUTHFULNESS
    // --------------------------------------------------------------------------
    test('Coordinates are transmitted via POST body rather than URL query string', () => {
        assert.ok(appJs.includes("fetch('/api/v1/legal-help/search'"), 'Should use POST /api/v1/legal-help/search endpoint');
        assert.ok(appJs.includes("method: 'POST'"), 'Should use POST method for proximity search');
    });

    test('Consultation modal does NOT falsely claim request was dispatched to partner', () => {
        assert.ok(!appJs.includes('Consultation request dispatched to ${firmName}. A partner will contact you shortly.'), 'Must NOT claim consultation request was dispatched');
        assert.ok(appJs.includes('PREVIEW') || appJs.includes('Demonstration Preview'), 'Must label consultation as demo preview or direct contact');
        assert.ok(appJs.includes('lpcVerificationReferenceUrl') || appJs.includes('lpc.org.za'), 'Must link to LPC roll for verification');
    });

    test('Builder and history downloads both open the password encryption flow', () => {
        const builderHandler = appJs.slice(appJs.indexOf('// Form submit -> generate authentic DOCX'), appJs.indexOf('// ------------------------------------------------------------------------------\n// 7.'));
        const historyHandler = appJs.slice(appJs.indexOf('function historyPage()'), appJs.indexOf('function dictionary()'));
        assert.ok(builderHandler.includes('openLockAndDownloadModal({'), 'Builder submit must use the password-protected download modal');
        assert.ok(historyHandler.includes('openLockAndDownloadModal({'), 'History download must use the password-protected download modal');
        assert.ok(!appJs.includes('a.download = `${t.title.replaceAll'), 'Builder must not create an original DOCX download');
        assert.ok(!appJs.includes('a.download = `${doc.name.replaceAll'), 'History must not create an original DOCX download');
    });

    test('Encryption endpoint verifies the artifact before it is returned', () => {
        assert.ok(documentsRoute.includes('encryptedBuffer = await encryptDocx(inputBuffer, password)'), 'DOCX endpoint must call verified encryption');
        assert.ok(documentsRoute.includes('encryptedBuffer = await encryptPdf(pdfBytesBuffer, password)'), 'PDF endpoint must call verified encryption');
        assert.ok(documentsRoute.includes('fileBase64: encryptedBuffer.toString(\'base64\')'), 'Endpoint response must contain only the encrypted buffer');
    });

    // --------------------------------------------------------------------------
    // 6. PASSWORD VISIBILITY & ACCESSIBILITY CONTROLS
    // --------------------------------------------------------------------------
    test('Login page contains accessible show/hide password toggle button', () => {
        assert.ok(loginHtml.includes('id="toggle-login-password"'), 'login.html must have #toggle-login-password');
        assert.ok(loginHtml.includes('type="button"'), 'Toggle control must have type="button" to prevent form submission');
        assert.ok(loginHtml.includes('aria-label="Show password"'), 'Toggle must declare initial aria-label="Show password"');
        assert.ok(loginHtml.includes('title="Show password"'), 'Toggle must declare initial title="Show password"');
        assert.ok(loginHtml.includes('aria-controls="login-password"'), 'Toggle must link to password field via aria-controls');
        assert.ok(loginHtml.includes('lock-password-wrap') || loginHtml.includes('password-input-wrap'), 'Password field must use integrated wrap styling');
    });

    test('Signup page contains accessible show/hide toggles for both password and confirm-password fields', () => {
        assert.ok(signupHtml.includes('id="toggle-signup-password"'), 'signup.html must have #toggle-signup-password');
        assert.ok(signupHtml.includes('id="toggle-signup-confirm-password"'), 'signup.html must have #toggle-signup-confirm-password');
        assert.ok(signupHtml.includes('aria-controls="signup-password"'), 'Toggle must link to signup password');
        assert.ok(signupHtml.includes('aria-controls="signup-confirm-password"'), 'Toggle must link to confirm password');
    });

    test('Shared password visibility helper in app.js supports keyboard use and dynamically updates accessible labels', () => {
        assert.ok(appJs.includes('function initPasswordToggle'), 'app.js must provide shared initPasswordToggle helper');
        assert.ok(appJs.includes('toggleBtn.type = \'button\''), 'Helper must enforce button type');
        assert.ok(appJs.includes('toggleBtn.setAttribute(\'aria-label\''), 'Helper must update aria-label');
        assert.ok(appJs.includes('toggleBtn.setAttribute(\'title\''), 'Helper must update title');
        assert.ok(appJs.includes('initPasswordToggle($(\'#toggle-login-password\')'), 'Login form must wire password toggle');
        assert.ok(appJs.includes('initPasswordToggle($(\'#toggle-signup-password\')'), 'Signup form must wire main password toggle');
        assert.ok(appJs.includes('initPasswordToggle($(\'#toggle-signup-confirm-password\')'), 'Signup form must wire confirm password toggle');
    });

    // --------------------------------------------------------------------------
    // 7. CONTRACT FOLLOW-UP & INTERROGATE RESPONSE LAYOUT
    // --------------------------------------------------------------------------
    test('Interrogate question box and button remain near the contract explanation', () => {
        assert.ok(appJs.includes('id="contract-explanation"'), 'app.js must render #contract-explanation');
        assert.ok(appJs.includes('id="contract-question"'), 'app.js must render #contract-question');
        assert.ok(appJs.includes('id="interrogate-contract"'), 'app.js must render #interrogate-contract');
        assert.ok(appJs.includes('id="contract-followup-answer"'), 'app.js must render #contract-followup-answer');
    });

    test('Interrogate response displays inside a bounded panel with accessible heading and keyboard scrollability', () => {
        assert.ok(appJs.includes('contract-followup-panel'), 'app.js must render contract-followup-panel');
        assert.ok(appJs.includes("panel.setAttribute('tabindex', '0')") || appJs.includes('tabindex="0"'), 'Panel must declare tabindex="0" for keyboard scrolling accessibility');
        assert.ok(appJs.includes("panel.setAttribute('role', 'region')") || appJs.includes('role="region"'), 'Panel must declare role="region"');
        assert.ok(appJs.includes("panel.setAttribute('aria-labelledby', 'contract-followup-heading')") || appJs.includes('aria-labelledby="contract-followup-heading"'), 'Panel must be labeled by accessible heading');
        assert.ok(appJs.includes('id="contract-followup-heading"'), 'Panel must render accessible heading element');
    });

    test('Response renderer safely parses basic markdown into semantic DOM nodes without raw HTML injection', () => {
        assert.ok(appJs.includes('function renderSafeFollowupAnswer'), 'app.js must provide safe answer renderer');
        assert.ok(appJs.includes('document.createTextNode'), 'Renderer must create text nodes safely');
        assert.ok(appJs.includes('document.createElement(\'strong\')'), 'Renderer must format bold without raw markers');
        assert.ok(appJs.includes('document.createElement(\'ul\')') || appJs.includes('document.createElement(\'ol\')'), 'Renderer must format lists cleanly');
    });

    test('Styles define compact, bounded scroll area for follow-up response', () => {
        assert.ok(stylesCss.includes('.contract-followup-panel'), 'styles.css must style .contract-followup-panel');
        assert.ok(stylesCss.includes('max-height: 280px') || stylesCss.includes('max-height:280px'), 'styles.css must constrain max-height');
        assert.ok(stylesCss.includes('overflow-y: auto') || stylesCss.includes('overflow-y:auto'), 'styles.css must enable vertical scroll');
        assert.ok(stylesCss.includes('.contract-followup-panel:focus-visible'), 'styles.css must provide visible focus indicator');
    });

    console.log('\n======================================================');
    console.log(`FRONTEND CHECKS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runFrontendChecks().catch(err => {
        console.error('Frontend checks error:', err);
        process.exit(1);
    });
}

module.exports = { runFrontendChecks };
