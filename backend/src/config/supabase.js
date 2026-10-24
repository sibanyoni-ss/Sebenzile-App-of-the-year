// Provide WebSocket support for Node.js < 22 runtimes (required by Supabase RealtimeClient)
if (typeof WebSocket === 'undefined') {
    try {
        globalThis.WebSocket = require('ws');
    } catch (e) {
        console.warn('[Supabase Config] Optional ws package not loaded. Native WebSocket will be used if available.');
    }
}

const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

// Public/scoped client (for user-context requests respecting RLS)
const supabasePublic = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false }
});

// Privileged Admin client (NEVER exposed to frontend, bypasses RLS for background workers & admin tasks)
const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Creates an authenticated Supabase client for a specific user JWT
 * to enforce PostgreSQL Row Level Security (RLS) dynamically.
 */
function createUserClient(jwtToken) {
    return createClient(config.supabase.url, config.supabase.anonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${jwtToken}`
            }
        },
        auth: { persistSession: false }
    });
}

module.exports = {
    supabasePublic,
    supabaseAdmin,
    createUserClient
};
