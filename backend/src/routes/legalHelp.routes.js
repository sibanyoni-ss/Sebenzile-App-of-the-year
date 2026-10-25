const express = require('express');
const router = express.Router();
const legalHelpService = require('../services/legalHelp/legalHelpService');
const geocodingService = require('../services/legalHelp/geocodingService');
const { CITY_PRESETS } = require('../services/proximityService');

/**
 * Validates and extracts coordinates and search parameters from a request.
 * Supports both JSON body (POST) and query parameters (GET).
 */
function parseAndValidateSearchParams(params) {
    const { city, matter, locationSource, locationLabel } = params;

    const rawLat = params.lat;
    const rawLng = params.lng;
    const hasLat = rawLat !== undefined && rawLat !== null && rawLat !== '';
    const hasLng = rawLng !== undefined && rawLng !== null && rawLng !== '';

    // 1. Paired numeric coordinates validation
    if (hasLat !== hasLng) {
        const err = new Error('Coordinates must be provided as paired latitude and longitude values.');
        err.statusCode = 400;
        err.code = 'UNPAIRED_COORDINATES';
        throw err;
    }

    let lat;
    let lng;
    let resolvedSource = locationSource || 'coordinates';
    let resolvedLabel = locationLabel || '';

    if (hasLat && hasLng) {
        lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
        lng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng);

        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
            const err = new Error('Both latitude and longitude must be valid numeric values.');
            err.statusCode = 400;
            err.code = 'INVALID_COORDINATES';
            throw err;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            const err = new Error('Coordinates out of range. Latitude must be between -90 and 90, Longitude between -180 and 180.');
            err.statusCode = 400;
            err.code = 'COORDINATES_OUT_OF_RANGE';
            throw err;
        }
    } else {
        // Fall back to city preset if coordinates not explicitly provided
        const cityKey = (city || 'sandton').toLowerCase().replace(/\s+/g, '');
        const preset = CITY_PRESETS[cityKey];

        if (!preset) {
            const err = new Error(`Unknown city preset '${city}'. Valid presets: ${Object.keys(CITY_PRESETS).join(', ')}`);
            err.statusCode = 400;
            err.code = 'UNKNOWN_CITY_PRESET';
            throw err;
        }

        lat = preset.lat;
        lng = preset.lng;
        resolvedSource = 'city_preset';
        resolvedLabel = preset.name;
    }

    // Radius validation & bounding
    let radiusKm = 25;
    if (params.radiusKm !== undefined && params.radiusKm !== null && params.radiusKm !== '') {
        const parsedRadius = typeof params.radiusKm === 'number' ? params.radiusKm : parseInt(params.radiusKm, 10);
        if (isNaN(parsedRadius) || parsedRadius < 1 || parsedRadius > 150) {
            const err = new Error('Search radius must be a number between 1 and 150 kilometers.');
            err.statusCode = 400;
            err.code = 'INVALID_RADIUS';
            throw err;
        }
        radiusKm = parsedRadius;
    }

    return {
        lat,
        lng,
        city: city || null,
        matter: typeof matter === 'string' ? matter.trim() : null,
        radiusKm,
        locationSource: resolvedSource,
        locationLabel: resolvedLabel
    };
}

/**
 * POST /api/v1/legal-help/search
 * Preferred secure endpoint: transmits coordinates and parameters in JSON body
 * to prevent coordinates or query details from appearing in URL logs / browser history.
 */
router.post('/search', async (req, res, next) => {
    try {
        const validated = parseAndValidateSearchParams(req.body || {});
        const result = await legalHelpService.search(validated);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/legal-help/firms
 * Returns law firms and Legal Aid offices for a specific legal issue sorted in ascending order of proximity.
 * Maintained for backward compatibility.
 * Query params:
 *   matter: 'Civil dispute' | 'Family law' | 'Labour dispute' | 'Commercial dispute' | 'Property dispute' | 'Contract dispute'
 *   lat: number (optional)
 *   lng: number (optional)
 *   city: 'sandton' | 'capetown' | 'durban' | 'pretoria' | etc. (optional preset)
 *   radiusKm: number (optional, 1-150)
 */
router.get('/firms', async (req, res, next) => {
    try {
        const validated = parseAndValidateSearchParams(req.query || {});
        const result = await legalHelpService.search(validated);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/legal-help/locations
 * Returns available preset South African cities with approximate center coordinates.
 */
router.get('/locations', (req, res) => {
    res.json({
        locations: CITY_PRESETS,
        notice: 'City preset coordinates represent approximate municipal/CBD centers and do not pinpoint exact user locations.'
    });
});

/**
 * GET /api/v1/legal-help/geocode
 * Suburb and address lookup for South African locations.
 * Query params:
 *   q: string (suburb or town name)
 */
router.get('/geocode', async (req, res, next) => {
    try {
        const query = req.query.q || '';
        const results = await geocodingService.geocode(query, CITY_PRESETS);
        res.json({
            query,
            totalFound: results.length,
            results
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
