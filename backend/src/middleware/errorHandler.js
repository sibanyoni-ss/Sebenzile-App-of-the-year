/**
 * Global Error Handler Middleware
 * Adheres strictly to LawCompass Requirements Section 6:
 * - Returns consistent JSON errors
 * - Provides a safe user-facing message and unique request identifier
 * - Never returns stack traces, SQL errors, parser errors, or implementation details to the client.
 */
function errorHandler(err, req, res, next) {
    const requestId = req.id || 'req_' + Date.now().toString(36);
    const statusCode = err.status || err.statusCode || 500;

    // Log the actual error internally with request context (for monitoring & audit)
    console.error(`[Error] [${requestId}] ${req.method} ${req.originalUrl}:`, {
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });

    const isClientError = statusCode >= 400 && statusCode < 500;
    const safeMessage = isClientError && statusCode < 500 && ['INVALID_INPUT', 'MESSAGE_TOO_LONG', 'MISSING_ID_CREDENTIALS'].includes(err.code)
        ? err.message
        : statusCode === 401 ? 'Please sign in again to continue.'
        : statusCode === 403 ? 'You do not have permission to do that.'
        : statusCode === 404 ? 'We could not find what you requested.'
        : 'Something went wrong. Please try again in a moment.';

    res.status(statusCode).json({
        error: {
            message: safeMessage,
            code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : (err.code || (statusCode === 404 ? 'NOT_FOUND' : 'REQUEST_ERROR')),
            requestId: requestId
        }
    });
}

module.exports = errorHandler;
