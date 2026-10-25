const config = require('../../config/env');
const { calculateHaversineDistance } = require('../proximityService');

/**
 * OpenStreetMap Overpass Provider Adapter
 * Performs live geographic discovery of private law practices and attorneys in South Africa.
 *
 * Compliance & Policy Adherence:
 * 1. Complies with Overpass API Acceptable Use Policy:
 *    - Custom identifying User-Agent with contact details.
 *    - In-memory TTL caching (1 hour) to minimize load on public servers.
 *    - Timeout safeguards (8s) via AbortController.
 * 2. Mandatory Attribution: "Data © OpenStreetMap contributors, ODbL 1.0".
 * 3. Status Disclosure: Marked strictly as "Unverified Discovery Data".
 *    Directs users to verify practitioners on the Legal Practice Council roll (https://lpc.org.za).
 */

class OverpassProvider {
    constructor() {
        this.name = 'overpass';
        this.description = 'OpenStreetMap Overpass API (Discovery Only)';
        this.apiUrl = config.legalHelp.overpassUrl;
        this.cache = new Map();
        this.cacheTtlMs = config.legalHelp.cacheTtlMs || 3600000;
        this.userAgent = 'LawCompass-App/1.0 (South Africa Legal Directory Discovery; contact@lawcompass.co.za)';
    }

    /**
     * Build cache key using rounded coordinates to maximize cache hit rate.
     */
    _getCacheKey(lat, lng, radiusKm, matter) {
        // Round to 2 decimals (~1.1km grid)
        const rLat = lat.toFixed(2);
        const rLng = lng.toFixed(2);
        const rRad = Math.round(radiusKm);
        const rMat = (matter || 'all').toLowerCase().trim();
        return `${rLat}:${rLng}:${rRad}:${rMat}`;
    }

    /**
     * Search private law firms / practitioners via Overpass around coordinates.
     * @param {Object} params
     * @param {number} params.lat - Latitude
     * @param {number} params.lng - Longitude
     * @param {number} params.radiusKm - Radius in km
     * @param {string} [params.matter] - Legal matter filter
     * @returns {Promise<Array>} List of law firms with distanceKm
     */
    async search({ lat, lng, radiusKm = 25, matter }) {
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            throw new Error('Valid numeric coordinates (lat, lng) are required.');
        }

        const cacheKey = this._getCacheKey(lat, lng, radiusKm, matter);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
            return cached.data;
        }

        const radiusMeters = Math.min(Math.round(radiusKm * 1000), 100000); // capped at 100km

        // Overpass QL query: Find nodes and ways tagged office=lawyer or amenity=lawyer
        const overpassQuery = `[out:json][timeout:8];
(
  node["office"="lawyer"](around:${radiusMeters},${lat},${lng});
  node["amenity"="lawyer"](around:${radiusMeters},${lat},${lng});
  way["office"="lawyer"](around:${radiusMeters},${lat},${lng});
  way["amenity"="lawyer"](around:${radiusMeters},${lat},${lng});
);
out center tags 40;`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8500);

        let elements = [];
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                },
                body: 'data=' + encodeURIComponent(overpassQuery),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // If Overpass is rate-limited or unavailable, return empty array without crashing
                console.warn(`[OverpassProvider] HTTP ${response.status} from Overpass server. Falling back safely.`);
                return [];
            }

            const json = await response.json();
            elements = Array.isArray(json.elements) ? json.elements : [];
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                console.warn('[OverpassProvider] Query timed out after 8.5s.');
            } else {
                console.warn('[OverpassProvider] Query error:', err.message);
            }
            return [];
        }

        const results = [];
        const seenNames = new Set();

        for (const el of elements) {
            const tags = el.tags || {};
            const rawName = tags.name || tags['brand'] || tags['operator'];
            if (!rawName) continue; // Skip unnamed lawyer tags

            const normalizedName = rawName.trim();
            if (seenNames.has(normalizedName.toLowerCase())) continue;
            seenNames.add(normalizedName.toLowerCase());

            const itemLat = el.lat != null ? el.lat : (el.center ? el.center.lat : null);
            const itemLng = el.lon != null ? el.lon : (el.center ? el.center.lon : null);
            if (itemLat == null || itemLng == null) continue;

            const distanceKm = calculateHaversineDistance(lat, lng, itemLat, itemLng);
            if (distanceKm > radiusKm) continue;

            // Formulate human-readable address
            let addressParts = [];
            if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
            if (tags['addr:street']) addressParts.push(tags['addr:street']);
            if (tags['addr:suburb']) addressParts.push(tags['addr:suburb']);
            const address = addressParts.length > 0 ? addressParts.join(' ') : (tags['addr:full'] || 'Address on file with practice');
            const city = tags['addr:city'] || tags['addr:suburb'] || tags['addr:province'] || '';

            // Specialties extraction
            const rawSpecialty = tags['lawyer:specialty'] || tags['specialty'] || tags['description'];
            let specialties = [];
            if (rawSpecialty) {
                specialties = rawSpecialty.split(/[,;/]/).map(s => s.trim()).filter(Boolean);
            }
            if (specialties.length === 0) {
                specialties = ['Attorneys & Conveyancers', 'General Legal Practice', 'Litigation'];
            }

            // Contact extraction
            const phone = tags.phone || tags['contact:phone'] || '';
            const email = tags.email || tags['contact:email'] || '';
            const website = tags.website || tags['contact:website'] || '';

            results.push({
                id: `osm_${el.type}_${el.id}`,
                name: normalizedName,
                category: 'private_practice',
                categoryLabel: 'Private Legal Practice',
                city: city || 'South Africa',
                province: tags['addr:province'] || '',
                address: address,
                lat: parseFloat(itemLat.toFixed(6)),
                lng: parseFloat(itemLng.toFixed(6)),
                phone: phone,
                email: email,
                website: website,
                specialties: specialties,
                source: 'OpenStreetMap (Overpass API)',
                attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
                verificationStatus: 'Unverified Discovery Data (Verify via Legal Practice Council roll)',
                lpcVerificationReferenceUrl: config.legalHelp.lpcVerificationUrl || 'https://lpc.org.za',
                distanceKm: distanceKm,
                notes: 'Discovery record mapped via OpenStreetMap. Not an LPC endorsement. Verify practitioner admission status on the Legal Practice Council roll at lpc.org.za.'
            });
        }

        results.sort((a, b) => a.distanceKm - b.distanceKm);

        // Store in cache
        this.cache.set(cacheKey, {
            timestamp: Date.now(),
            data: results
        });

        // Prune old cache items if map grows large (> 200 items)
        if (this.cache.size > 200) {
            const now = Date.now();
            for (const [key, val] of this.cache.entries()) {
                if (now - val.timestamp > this.cacheTtlMs) {
                    this.cache.delete(key);
                }
            }
        }

        return results;
    }
}

module.exports = new OverpassProvider();
