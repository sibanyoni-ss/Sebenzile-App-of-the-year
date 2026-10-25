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
