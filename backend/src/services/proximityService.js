/**
 * ==============================================================================
 * PROXIMITY CALCULATION & LOCATION PRESETS SERVICE
 * ==============================================================================
 * Calculates accurate distances using the Haversine formula and provides
 * verified South African city-center reference coordinates.
 *
 * NOTE ON PRESET COORDINATES:
 * City presets represent approximate municipal or central business district (CBD)
 * coordinates. They are reference points for manual area selection and DO NOT
 * pinpoint exact user locations.
 * ==============================================================================
 */

// Major South African city center coordinates (explicitly labeled as approximate)
const CITY_PRESETS = {
    sandton: {
        key: 'sandton',
        name: 'Sandton, Johannesburg (Approx. City Center)',
        shortName: 'Sandton',
        province: 'Gauteng',
        lat: -26.1076,
        lng: 28.0567,
        isApproximate: true
    },
    johannesburg: {
        key: 'johannesburg',
        name: 'Johannesburg Central (Approx. City Center)',
        shortName: 'Johannesburg',
        province: 'Gauteng',
        lat: -26.2041,
        lng: 28.0473,
        isApproximate: true
    },
    rosebank: {
        key: 'rosebank',
        name: 'Rosebank, Johannesburg (Approx. City Center)',
        shortName: 'Rosebank',
        province: 'Gauteng',
        lat: -26.1458,
        lng: 28.0435,
        isApproximate: true
    },
    pretoria: {
        key: 'pretoria',
        name: 'Pretoria / Tshwane Central (Approx. City Center)',
        shortName: 'Pretoria',
        province: 'Gauteng',
        lat: -25.7479,
        lng: 28.2293,
        isApproximate: true
    },
    centurion: {
        key: 'centurion',
        name: 'Centurion, Gauteng (Approx. City Center)',
        shortName: 'Centurion',
        province: 'Gauteng',
        lat: -25.8560,
        lng: 28.1880,
        isApproximate: true
    },
    capetown: {
        key: 'capetown',
        name: 'Cape Town Central (Approx. City Center)',
        shortName: 'Cape Town',
        province: 'Western Cape',
        lat: -33.9249,
        lng: 18.4241,
        isApproximate: true
    },
    centurycity: {
        key: 'centurycity',
        name: 'Century City, Cape Town (Approx. Commercial Area)',
        shortName: 'Century City',
        province: 'Western Cape',
        lat: -33.8920,
        lng: 18.5110,
        isApproximate: true
    },
    durban: {
        key: 'durban',
        name: 'Durban Central (Approx. City Center)',
        shortName: 'Durban',
        province: 'KwaZulu-Natal',
        lat: -29.8587,
        lng: 31.0218,
        isApproximate: true
    },
    umhlanga: {
        key: 'umhlanga',
        name: 'Umhlanga, KZN (Approx. City Center)',
        shortName: 'Umhlanga',
        province: 'KwaZulu-Natal',
        lat: -29.7280,
        lng: 31.0847,
        isApproximate: true
    },
    bloemfontein: {
        key: 'bloemfontein',
        name: 'Bloemfontein Central (Approx. City Center)',
        shortName: 'Bloemfontein',
        province: 'Free State',
        lat: -29.1166,
        lng: 26.2155,
        isApproximate: true
    },
    gqeberha: {
        key: 'gqeberha',
        name: 'Gqeberha / Port Elizabeth Central (Approx. City Center)',
        shortName: 'Gqeberha',
        province: 'Eastern Cape',
        lat: -33.9608,
        lng: 25.6022,
        isApproximate: true
    }
};

// Backwards-compatibility alias
const LOCATIONS = CITY_PRESETS;

/**
 * Calculates great-circle distance in kilometers between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers rounded to 1 decimal place
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;

    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

// Deprecated empty array for mock-data elimination
const LAW_FIRMS = [];

module.exports = {
    CITY_PRESETS,
    LOCATIONS,
    LAW_FIRMS,
    calculateHaversineDistance
};
