const config = require('../../config/env');

/**
 * Geocoding Service for South African Suburbs & Addresses
 * Uses OpenStreetMap Nominatim with strict South Africa bounding (countrycodes=za)
 * and in-memory caching. Falls back cleanly to City Presets if external service is unreachable.
 */

class GeocodingService {
    constructor() {
        this.apiUrl = config.legalHelp.nominatimUrl;
        this.cache = new Map();
        this.userAgent = 'LawCompass-App/1.0 (South Africa Suburb Lookup; contact@lawcompass.co.za)';
    }

    /**
     * Geocodes a South African suburb, city, or address query.
     * @param {string} query
     * @param {Object} cityPresets - Known preset locations
     * @returns {Promise<Array>} List of matching locations
     */
    async geocode(query, cityPresets = {}) {
        if (!query || typeof query !== 'string') {
            return [];
        }

        const cleanQuery = query.trim().replace(/[^\w\s,-]/g, '').slice(0, 80);
        if (cleanQuery.length < 2) {
            return [];
        }

        const lowerQuery = cleanQuery.toLowerCase();

        // 1. Check if query matches a known city preset
        const presetMatches = [];
        for (const [key, loc] of Object.entries(cityPresets)) {
            if (key.includes(lowerQuery) || (loc.name && loc.name.toLowerCase().includes(lowerQuery))) {
                presetMatches.push({
                    id: `preset_${key}`,
                    displayName: loc.name,
                    shortName: loc.shortName || key,
                    lat: loc.lat,
                    lng: loc.lng,
                    isPreset: true,
                    isApproximate: true,
                    source: 'LawCompass South African City Center Preset'
                });
            }
        }

        // 2. Check cache
        if (this.cache.has(lowerQuery)) {
            const cached = this.cache.get(lowerQuery);
            if (Date.now() - cached.timestamp < 3600000) {
                return cached.data;
            }
        }

        // 3. Query Nominatim API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
            const url = `${this.apiUrl}?q=${encodeURIComponent(cleanQuery)}&format=json&countrycodes=za&limit=5&addressdetails=1`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return presetMatches;
            }

            const data = await response.json();
            const results = [];

            if (Array.isArray(data)) {
                for (const item of data) {
                    const lat = parseFloat(item.lat);
                    const lng = parseFloat(item.lon);
                    if (isNaN(lat) || isNaN(lng)) continue;

                    results.push({
                        id: `nom_${item.place_id}`,
                        displayName: item.display_name,
                        shortName: item.name || cleanQuery,
                        lat: parseFloat(lat.toFixed(6)),
                        lng: parseFloat(lng.toFixed(6)),
                        isPreset: false,
                        isApproximate: true,
                        source: 'OpenStreetMap Nominatim'
                    });
                }
            }

            // Merge preset matches with external results (presets first)
            const combined = [...presetMatches];
            for (const r of results) {
                if (!combined.some(c => Math.abs(c.lat - r.lat) < 0.01 && Math.abs(c.lng - r.lng) < 0.01)) {
                    combined.push(r);
                }
            }

            this.cache.set(lowerQuery, {
                timestamp: Date.now(),
                data: combined
            });

            return combined;
        } catch (err) {
            clearTimeout(timeoutId);
            return presetMatches;
        }
    }
}

module.exports = new GeocodingService();
