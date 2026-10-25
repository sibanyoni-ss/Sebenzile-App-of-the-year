const cors = require('cors');
const crypto = require('crypto');
const config = require('../config/env');

function securityMiddleware(app) {
    // 1. Assign unique Request ID to every incoming request
    app.use((req, res, next) => {
        req.id = 'req_' + crypto.randomBytes(8).toString('hex');
        res.setHeader('X-Request-Id', req.id);
        next();
    });

    // 2. Strict CORS policy
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl) or if in whitelist
            if (!origin || config.corsOrigins.includes(origin) || config.env === 'development') {
                callback(null, true);
            } else {
                const error = new Error('Request not allowed.');
                error.status = 403;
                error.code = 'FORBIDDEN';
                callback(error);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-Id']
    };
    app.use(cors(corsOptions));

    // 3. Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        if (config.env === 'production') {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        next();
    });
}

module.exports = securityMiddleware;
