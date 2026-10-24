const { supabasePublic, createUserClient } = require('../config/supabase');

/**
 * Authentication middleware that verifies the Supabase JWT token.
 * Attaches the authenticated user and a user-scoped Supabase client to `req`.
 */
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    message: 'Authentication required. Missing or malformed authorization header.',
                    code: 'UNAUTHORIZED',
                    requestId: req.id
                }
            });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabasePublic.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                error: {
                    message: 'Invalid or expired session token.',
                    code: 'INVALID_TOKEN',
                    requestId: req.id
                }
            });
        }

        // Attach authenticated user and scoped client to request
        req.user = user;
        req.token = token;
        req.supabase = createUserClient(token);

        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Optional authentication middleware: if a token exists, attach the user, otherwise proceed as guest.
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabasePublic.auth.getUser(token);
            if (user) {
                req.user = user;
                req.token = token;
                req.supabase = createUserClient(token);
            }
        }
        next();
    } catch (err) {
        next();
    }
}

module.exports = {
    requireAuth,
    optionalAuth
};
