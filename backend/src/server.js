const path = require('path');
const express = require('express');
const config = require('./config/env');
const securityMiddleware = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/documents.routes');
const legalHelpRoutes = require('./routes/legalHelp.routes');
const billingRoutes = require('./routes/billing.routes');
const uploadRoutes = require('./routes/uploads.routes');
const assistantRoutes = require('./routes/assistant.routes');

const app = express();

// Path to public frontend application (workspace root)
const frontendPath = path.resolve(__dirname, '../../');

// Apply security headers, CORS, request IDs
securityMiddleware(app);

// Webhook endpoint uses raw body parsing (configured inside billing.routes)
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Body parser for standard JSON payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security Guard: Deny static access to backend internals, .env files, and git metadata
app.use((req, res, next) => {
    const normalized = req.path.toLowerCase();
    if (normalized.startsWith('/backend') || normalized.includes('.env') || normalized.startsWith('/.git')) {
        return res.status(403).json({
            error: { message: 'Access forbidden.', code: 'FORBIDDEN', requestId: req.id }
        });
    }
    next();
});

// Health check endpoint (PDF Section 10: Monitoring & Operational requirements)
app.get('/health', (req, res) => {
    res.json({
        status: 'pass',
        service: 'lawcompass-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Mount API v1 routes (PDF Section 6: Version endpoints under /api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1', documentRoutes); // Allows /api/v1/templates
app.use('/api/v1/legal-help', legalHelpRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/assistant', assistantRoutes);

// ==============================================================================
// SERVE PUBLIC FRONTEND CLIENT (Static Assets & HTML Pages)
// When user visits http://localhost:3000, serve the LawCompass Web App
// ==============================================================================
app.use(express.static(frontendPath, {
    index: 'index.html',
    extensions: ['html', 'htm']
}));

// Root endpoint explicitly serves index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler for unmatched API endpoints or unknown files
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        const err = new Error(`Endpoint ${req.method} ${req.path} not found on LawCompass API.`);
        err.status = 404;
        err.code = 'NOT_FOUND';
        return next(err);
    }
    // For browser page requests, redirect gracefully to index.html
    res.status(404).sendFile(path.join(frontendPath, 'index.html'), err => {
        if (err) next(err);
    });
});

// Centralized error handler
app.use(errorHandler);

const seedTemplates = require('./config/seedTemplates');

// Start server if run directly
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`\n================================================================`);
        console.log(` LawCompass Full-Stack Application is LIVE!`);
        console.log(` Web App:  http://localhost:${config.port}`);
        console.log(` API Base: http://localhost:${config.port}/api/v1`);
        console.log(` Health:   http://localhost:${config.port}/health`);
        console.log(`================================================================\n`);
        seedTemplates().catch(() => {});
    });
}

module.exports = app;
