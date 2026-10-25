const path = require('path');
const fs = require('fs');

// Attempt to load from backend/.env first, then fallback to workspace root .env
const backendEnv = path.resolve(__dirname, '../../.env');
const rootEnv = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
}
if (fs.existsSync(rootEnv)) {
    require('dotenv').config({ path: rootEnv });
}

// Helper to auto-derive project URL from Supabase JWT if user kept placeholder URL
function resolveSupabaseUrl(configuredUrl, anonKey) {
    if (configuredUrl && !configuredUrl.includes('your-project') && !configuredUrl.includes('placeholder')) {
        return configuredUrl;
    }
    // Attempt to extract project reference from JWT payload
    if (anonKey && anonKey.includes('.')) {
        try {
            const parts = anonKey.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload && payload.ref) {
                return `https://${payload.ref}.supabase.co`;
            }
        } catch (e) {}
    }
    return configuredUrl || 'https://placeholder.supabase.co';
}

const rawUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resolvedUrl = resolveSupabaseUrl(rawUrl, anonKey || serviceRoleKey);

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000').split(',').map(s => s.trim()),
    supabase: {
        url: resolvedUrl,
        anonKey: anonKey || 'placeholder_anon_key',
        serviceRoleKey: serviceRoleKey || 'placeholder_service_role_key',
        jwtSecret: process.env.SUPABASE_JWT_SECRET || 'placeholder_jwt_secret',
        bucket: process.env.SUPABASE_STORAGE_BUCKET || 'contracts',
        signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS, 10) || 900
    },
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET
    },
    ai: {
        provider: process.env.AI_PROVIDER || 'openai',
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL || 'gpt-4o-mini'
    },
    legalHelp: {
        provider: (process.env.LEGAL_HELP_PROVIDER || 'all').toLowerCase(),
        overpassUrl: process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
        nominatimUrl: process.env.NOMINATIM_API_URL || 'https://nominatim.openstreetmap.org/search',
        cacheTtlMs: parseInt(process.env.LEGAL_HELP_CACHE_TTL_MS, 10) || 3600000, // 1 hour default
        defaultRadiusKm: parseInt(process.env.LEGAL_HELP_DEFAULT_RADIUS_KM, 10) || 25,
        maxRadiusKm: parseInt(process.env.LEGAL_HELP_MAX_RADIUS_KM, 10) || 150,
        lpcVerificationUrl: process.env.LPC_VERIFICATION_URL || 'https://lpc.org.za'
    }
};

module.exports = config;
