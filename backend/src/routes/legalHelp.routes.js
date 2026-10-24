const express = require('express');
const router = express.Router();
const { findLawFirmsByProximity, LOCATIONS, LAW_FIRMS } = require('../services/proximityService');

/**
 * GET /api/v1/legal-help/firms
 * Returns law firms for a specific legal issue sorted in ascending order of proximity.
 * Query params:
 *   matter: 'Civil dispute' | 'Family law' | 'Labour dispute' | 'Commercial dispute' | 'Property dispute' | 'Contract dispute'
 *   lat: number (optional)
 *   lng: number (optional)
 *   city: 'sandton' | 'capetown' | 'durban' | 'pretoria' | 'bloemfontein' (optional fallback)
 */
router.get('/firms', (req, res) => {
    const { matter, city } = req.query;
    let lat = parseFloat(req.query.lat);
    let lng = parseFloat(req.query.lng);

    // If explicit lat/lng not provided, use selected South African city coordinates (default: Sandton)
    if (isNaN(lat) || isNaN(lng)) {
        const cityKey = (city || 'sandton').toLowerCase().replace(/\s+/g, '');
        const loc = LOCATIONS[cityKey] || LOCATIONS.sandton;
        lat = loc.lat;
        lng = loc.lng;
    }

    const firms = findLawFirmsByProximity(matter, lat, lng);

    res.json({
        matter: matter || 'All matters',
        userCoordinates: { lat, lng },
        totalFound: firms.length,
        firms: firms
    });
});

/**
 * GET /api/v1/legal-help/locations
 * Returns available preset cities with coordinates
 */
router.get('/locations', (req, res) => {
    res.json({ locations: LOCATIONS });
});

module.exports = router;
