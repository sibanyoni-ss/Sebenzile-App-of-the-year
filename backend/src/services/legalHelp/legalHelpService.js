const config = require('../../config/env');
const legalAidSaProvider = require('./legalAidSaProvider');
const overpassProvider = require('./overpassProvider');
const { calculateHaversineDistance, CITY_PRESETS } = require('../proximityService');

const VALID_MATTERS = [
    'Civil dispute',
    'Family law',
    'Labour dispute',
    'Commercial dispute',
    'Property dispute',
    'Contract dispute'
];

/**
 * Legal Help Proximity Search Service
 * Aggregates verified Legal Aid South Africa local offices with live OpenStreetMap
 * discovery data. Sorts strictly by ascending proximity (nearest first).
 */
class LegalHelpService {
    constructor() {
        this.validMatters = VALID_MATTERS;
    }

    /**
     * Searches legal help near coordinates within a given radius.
     * @param {Object} options
     * @param {number} options.lat - Latitude (-90 to 90)
     * @param {number} options.lng - Longitude (-180 to 180)
     * @param {string} [options.matter] - Legal matter category
     * @param {number} [options.radiusKm=25] - Search radius in km (1 - 150)
     * @param {string} [options.locationSource='coordinates'] - 'device_gps' | 'city_preset' | 'suburb_search' | 'coordinates'
     * @param {string} [options.locationLabel] - Human-readable label of the location
     * @returns {Promise<Object>} Search results with metadata
     */
    async search({ lat, lng, matter, radiusKm, locationSource = 'coordinates', locationLabel = '' }) {
        // Validate coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
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

        // Validate matter if provided
        let normalizedMatter = null;
        if (matter && typeof matter === 'string' && matter.trim().length > 0) {
            const trimmed = matter.trim();
            const matched = this.validMatters.find(m => m.toLowerCase() === trimmed.toLowerCase());
            if (!matched && trimmed.toLowerCase() !== 'all' && trimmed.toLowerCase() !== 'all matters') {
                const err = new Error(`Invalid legal matter '${trimmed}'. Allowed values: ${this.validMatters.join(', ')}`);
                err.statusCode = 400;
                err.code = 'INVALID_MATTER';
                throw err;
            }
            normalizedMatter = matched || null;
        }

        // Validate and bound radius
        let boundedRadius = parseInt(radiusKm, 10);
        if (isNaN(boundedRadius) || boundedRadius < 1) {
            boundedRadius = config.legalHelp.defaultRadiusKm || 25;
        } else if (boundedRadius > (config.legalHelp.maxRadiusKm || 150)) {
            boundedRadius = config.legalHelp.maxRadiusKm || 150;
        }

        // Determine configured provider
        const providerMode = (config.legalHelp.provider || 'all').toLowerCase();
        if (providerMode === 'none' || providerMode === 'disabled') {
            return {
                status: 'unavailable',
                message: 'Legal directory proximity service is currently disabled or unconfigured.',
                totalFound: 0,
                firms: [],
                query: {
                    matter: normalizedMatter || 'All matters',
                    radiusKm: boundedRadius,
                    locationSource
                },
                lpcVerificationReferenceUrl: config.legalHelp.lpcVerificationUrl || 'https://lpc.org.za'
            };
        }

        const providersUsed = [];
        let allResults = [];

        // 1. Legal Aid SA Offices (Statutory layer)
        if (providerMode === 'all' || providerMode === 'legal_aid_sa') {
            try {
                const lasaResults = await legalAidSaProvider.search({
                    lat,
                    lng,
                    radiusKm: boundedRadius,
                    matter: normalizedMatter
                });
                providersUsed.push('legal_aid_sa');
                allResults.push(...lasaResults);
            } catch (err) {
                console.error('[LegalHelpService] Legal Aid SA provider error:', err.message);
            }
        }

        // 2. OpenStreetMap Overpass (Discovery layer)
        if (providerMode === 'all' || providerMode === 'overpass') {
            try {
                const osmResults = await overpassProvider.search({
                    lat,
                    lng,
                    radiusKm: boundedRadius,
                    matter: normalizedMatter
                });
                providersUsed.push('overpass');
                allResults.push(...osmResults);
            } catch (err) {
                console.error('[LegalHelpService] Overpass provider error:', err.message);
            }
        }

        // Re-filter strictly by bounded radius and recompute distanceKm
        const filtered = allResults.map(item => {
            const distanceKm = calculateHaversineDistance(lat, lng, item.lat, item.lng);
            return {
                ...item,
                distanceKm
            };
        }).filter(item => item.distanceKm <= boundedRadius);

        // Sort strictly by ascending distance (closest first!)
        filtered.sort((a, b) => {
            if (a.distanceKm !== b.distanceKm) {
                return a.distanceKm - b.distanceKm;
            }
            // If identical distance, prioritize statutory Legal Aid offices
            if (a.category === 'legal_aid' && b.category !== 'legal_aid') return -1;
            if (b.category === 'legal_aid' && a.category !== 'legal_aid') return 1;
            return a.name.localeCompare(b.name);
        });

        return {
            status: 'success',
            matter: normalizedMatter || 'All matters',
            radiusKm: boundedRadius,
            locationSource,
            locationLabel: locationLabel || (locationSource === 'device_gps' ? 'Your Device Location' : 'Selected Location'),
            totalFound: filtered.length,
            firms: filtered,
            providersUsed,
            lpcVerificationReferenceUrl: config.legalHelp.lpcVerificationUrl || 'https://lpc.org.za',
            legalNotice: 'Legal Aid South Africa offices are public statutory bodies. Private practices are community discovery records and must be independently verified against the Legal Practice Council roll at https://lpc.org.za. LawCompass does not endorse, credential, or warrant private legal practices.'
        };
    }
}

module.exports = new LegalHelpService();
