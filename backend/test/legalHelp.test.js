/**
 * ==============================================================================
 * LAWCOMPASS AUTOMATED LEGAL HELP & PROXIMITY TEST SUITE
 * ==============================================================================
 * Tests distance calculation, radius filtering, input validation, response ordering,
 * empty results handling, provider failure resilience, and privacy considerations.
 * ==============================================================================
 */

const assert = require('assert');
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const { calculateHaversineDistance, CITY_PRESETS } = require('../src/services/proximityService');
const legalHelpService = require('../src/services/legalHelp/legalHelpService');
const legalAidSaProvider = require('../src/services/legalHelp/legalAidSaProvider');

async function runTests() {
    console.log('\n======================================================');
    console.log('⚖️  LAWCOMPASS LEGAL HELP & PROXIMITY TEST RUN');
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

    // --------------------------------------------------------------------------
    // 1. HAVERSINE DISTANCE ACCURACY (UNIT TESTS)
    // --------------------------------------------------------------------------
    await test('Haversine formula: Zero distance between identical coordinates', () => {
        const d = calculateHaversineDistance(-26.1076, 28.0567, -26.1076, 28.0567);
        assert.strictEqual(d, 0, `Expected 0 km, got ${d}`);
    });

    await test('Haversine formula: Sandton to Pretoria CBD is ~50 - 55 km', () => {
        // Sandton (-26.1076, 28.0567) to Pretoria Central (-25.7479, 28.2293)
        const d = calculateHaversineDistance(-26.1076, 28.0567, -25.7479, 28.2293);
        assert.ok(d >= 40 && d <= 55, `Expected 40-55 km, got ${d}`);
    });

    await test('Haversine formula: Johannesburg to Cape Town is ~1260 km', () => {
        const d = calculateHaversineDistance(-26.2041, 28.0473, -33.9249, 18.4241);
        assert.ok(d >= 1250 && d <= 1280, `Expected 1250-1280 km, got ${d}`);
    });

    // --------------------------------------------------------------------------
    // 2. CITY PRESETS LABELED AS APPROXIMATE
    // --------------------------------------------------------------------------
    await test('City presets explicitly identify coordinates as approximate city centers', () => {
        assert.ok(CITY_PRESETS.sandton, 'Sandton preset should exist');
        assert.strictEqual(CITY_PRESETS.sandton.isApproximate, true, 'isApproximate flag must be true');
        assert.ok(CITY_PRESETS.sandton.name.includes('Approx.'), 'Preset name must indicate approximation');
    });

    // --------------------------------------------------------------------------
    // 3. STATUTORY LEGAL AID SA PROVIDER LAYER
    // --------------------------------------------------------------------------
    await test('Legal Aid SA Provider returns verified statutory offices sorted nearest first', async () => {
        // Query near Johannesburg (-26.2041, 28.0473) within 30km
        const results = await legalAidSaProvider.search({
            lat: -26.2041,
            lng: 28.0473,
            radiusKm: 30,
            matter: 'Civil dispute'
        });

        assert.ok(Array.isArray(results), 'Should return an array');
        assert.ok(results.length > 0, 'Should find Legal Aid offices in Greater Johannesburg');
        assert.strictEqual(results[0].category, 'legal_aid', 'Category must be legal_aid');
        assert.strictEqual(results[0].verificationStatus, 'Official Statutory Office');
        assert.ok(results[0].lpcVerificationReferenceUrl, 'Must include LPC verification reference URL');

        // Check distance sorting
        for (let i = 1; i < results.length; i++) {
            assert.ok(results[i].distanceKm >= results[i - 1].distanceKm, 'Results must be sorted nearest first');
        }
    });

    // --------------------------------------------------------------------------
    // 4. SERVER-SIDE INPUT VALIDATION TESTS (HTTP ENDPOINT)
    // --------------------------------------------------------------------------
    await test('Validation: Rejection of unpaired coordinates (lat without lng)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: -26.1076 }) // Missing lng
        });
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.error?.code, 'UNPAIRED_COORDINATES');
    });

    await test('Validation: Rejection of non-numeric coordinates', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: 'not_a_number', lng: 28.0567 })
        });
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.error?.code, 'INVALID_COORDINATES');
    });

    await test('Validation: Rejection of out-of-range latitude (> 90 degrees)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: 105.5, lng: 28.0567 })
        });
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.error?.code, 'COORDINATES_OUT_OF_RANGE');
    });

    await test('Validation: Rejection of unknown legal matter value', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: -26.1076,
                lng: 28.0567,
                matter: 'Invalid Unknown Law Matter 12345'
            })
        });
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.error?.code, 'INVALID_MATTER');
    });

    await test('Validation: Rejection of invalid search radius (> 150 km)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: -26.1076,
                lng: 28.0567,
                radiusKm: 999
            })
        });
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.error?.code, 'INVALID_RADIUS');
    });

    await test('Validation: Rejection of unknown city preset key', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: 'non_existent_city_key_xyz' })
        });
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.error?.code, 'UNKNOWN_CITY_PRESET');
    });

    // --------------------------------------------------------------------------
    // 5. RADIUS FILTERING & RESPONSE ORDERING TESTS
    // --------------------------------------------------------------------------
    await test('POST /api/v1/legal-help/search returns results strictly filtered by radiusKm', async () => {
        const radius = 15;
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: -26.1076,
                lng: 28.0567,
                matter: 'Civil dispute',
                radiusKm: radius
            })
        });
        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
        const data = await res.json();
        assert.strictEqual(data.status, 'success');
        assert.ok(Array.isArray(data.firms), 'Should return firms array');

        for (const firm of data.firms) {
            assert.ok(firm.distanceKm <= radius, `Firm ${firm.name} distance ${firm.distanceKm} exceeds radius ${radius}`);
        }
    });

    await test('POST /api/v1/legal-help/search sorts results nearest first (distance ascending)', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: -26.1076,
                lng: 28.0567,
                matter: 'Civil dispute',
                radiusKm: 50
            })
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        const firms = data.firms;

        for (let i = 1; i < firms.length; i++) {
            assert.ok(
                firms[i].distanceKm >= firms[i - 1].distanceKm,
                `Firm at index ${i} (${firms[i].distanceKm}km) is closer than firm at ${i-1} (${firms[i-1].distanceKm}km)`
            );
        }
    });

    // --------------------------------------------------------------------------
    // 6. RESULT METADATA INTEGRITY (NO FABRICATED RATINGS OR FAKE FIRMS)
    // --------------------------------------------------------------------------
    await test('Result metadata consistency & absence of fabricated ratings', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                city: 'capetown',
                matter: 'Family law',
                radiusKm: 30
            })
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.firms.length > 0, 'Should return results for Cape Town');

        for (const firm of data.firms) {
            assert.ok(firm.id, 'Record must have an id');
            assert.ok(firm.name, 'Record must have a name');
            assert.ok(firm.category, 'Record must have category (legal_aid or private_practice)');
            assert.ok(firm.source, 'Record must disclose data source');
            assert.ok(firm.attribution, 'Record must provide attribution');
            assert.ok(firm.verificationStatus, 'Record must state verification status');
            assert.strictEqual(typeof firm.distanceKm, 'number', 'distanceKm must be a number');

            // CRITICAL: Ensure NO fabricated 5-star ratings or unverified consultation fee claims
            assert.strictEqual(firm.rating, undefined, 'Must NOT contain fabricated star ratings');
            assert.strictEqual(firm.reviewsCount, undefined, 'Must NOT contain fabricated review counts');
        }
    });

    // --------------------------------------------------------------------------
    // 7. EMPTY RESULTS & PROVIDER DISABLED HANDLING (HONEST STATES, NO MOCK FALLBACK)
    // --------------------------------------------------------------------------
    await test('Empty results handling: Querying remote ocean coordinates returns honest empty array', async () => {
        // Coordinate in the ocean south of SA (-37.0, 20.0) with small radius (5km)
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: -37.0,
                lng: 20.0,
                matter: 'Civil dispute',
                radiusKm: 5
            })
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.totalFound, 0, 'Should find 0 firms in ocean');
        assert.deepStrictEqual(data.firms, [], 'Must return empty array, NOT fallback to mock firms');
    });

    await test('Provider configuration: Honest unavailable state when provider disabled', async () => {
        const config = require('../src/config/env');
        const origProvider = config.legalHelp.provider;
        config.legalHelp.provider = 'none';

        try {
            const result = await legalHelpService.search({
                lat: -26.1076,
                lng: 28.0567,
                matter: 'Civil dispute',
                radiusKm: 25
            });

            assert.strictEqual(result.status, 'unavailable', 'Should report status as unavailable');
            assert.strictEqual(result.totalFound, 0, 'Should report 0 found');
            assert.deepStrictEqual(result.firms, [], 'Should not fabricate firms');
            assert.ok(result.message.includes('disabled') || result.message.includes('unconfigured'));
            assert.ok(result.lpcVerificationReferenceUrl, 'Should still provide LPC reference link');
        } finally {
            config.legalHelp.provider = origProvider;
        }
    });

    // --------------------------------------------------------------------------
    // 8. BACKWARDS COMPATIBILITY (GET /api/v1/legal-help/firms)
    // --------------------------------------------------------------------------
    await test('GET /api/v1/legal-help/firms backwards compatibility check', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/firms?city=durban&matter=Labour%20dispute&radiusKm=35`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.firms));
        assert.ok(data.firms.length > 0, 'Should find Durban offices');
    });

    // --------------------------------------------------------------------------
    // 9. LOCATIONS & GEOCODING ENDPOINTS
    // --------------------------------------------------------------------------
    await test('GET /api/v1/legal-help/locations returns presets with disclaimer', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/locations`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.locations);
        assert.ok(data.notice.includes('approximate'));
    });

    await test('GET /api/v1/legal-help/geocode resolves South African suburbs or presets', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/geocode?q=Rosebank`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data.results));
        assert.ok(data.results.length > 0, 'Should find Rosebank');
    });

    // --------------------------------------------------------------------------
    // 10. PRIVACY CHECK: NO COORDINATES LEAKED IN VALIDATION ERRORS
    // --------------------------------------------------------------------------
    await test('Privacy: Validation error responses do not reflect sensitive payload data', async () => {
        const res = await fetch(`${BASE_URL}/api/v1/legal-help/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: 200, lng: 300 })
        });
        const data = await res.json();
        assert.ok(!JSON.stringify(data).includes('200'), 'Error message should not echo raw coordinate values');
    });

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runTests().catch(err => {
        console.error('Test suite error:', err);
        process.exit(1);
    });
}

module.exports = { runTests };
