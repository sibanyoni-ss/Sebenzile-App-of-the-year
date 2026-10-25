const { LEGAL_AID_SA_OFFICES } = require('./legalAidSaData');
const { calculateHaversineDistance } = require('../proximityService');

/**
 * Legal Aid South Africa Provider Adapter
 * Queries real statutory Legal Aid SA offices across South Africa.
 */
class LegalAidSaProvider {
    constructor() {
        this.name = 'legal_aid_sa';
        this.description = 'Legal Aid South Africa Public Statutory Directory';
    }

    /**
     * Search Legal Aid SA offices near coordinates within given radius.
     * @param {Object} params
     * @param {number} params.lat - Latitude
     * @param {number} params.lng - Longitude
     * @param {number} params.radiusKm - Maximum radius in km
     * @param {string} [params.matter] - Legal matter category
     * @returns {Promise<Array>} List of offices with distanceKm
     */
    async search({ lat, lng, radiusKm = 50, matter }) {
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            throw new Error('Valid numeric coordinates (lat, lng) are required.');
        }

        const normalizedMatter = matter ? matter.trim().toLowerCase() : null;

        const results = [];
        for (const office of LEGAL_AID_SA_OFFICES) {
            // If matter specified, verify that Legal Aid handles this category
            if (normalizedMatter && normalizedMatter !== 'all' && normalizedMatter !== 'all matters') {
                const handlesMatter = office.matters.some(m => m.toLowerCase() === normalizedMatter);
                if (!handlesMatter) {
                    continue;
                }
            }

            const distanceKm = calculateHaversineDistance(lat, lng, office.lat, office.lng);
            if (distanceKm <= radiusKm) {
                results.push({
                    ...office,
                    distanceKm
                });
            }
        }

        results.sort((a, b) => a.distanceKm - b.distanceKm);
        return results;
    }
}

module.exports = new LegalAidSaProvider();
