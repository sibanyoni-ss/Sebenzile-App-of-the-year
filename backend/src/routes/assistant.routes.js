const express = require('express');
const router = express.Router();
const { askCompass, COMPASS_SYSTEM_PROMPT, defineContractTerm } = require('../services/compassAssistant');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { translateLegalText } = require('../services/compassAssistant');

router.post('/dictionary/lookup', requireAuth, async (req, res, next) => {
    try {
        const { term } = req.body || {};
        if (typeof term !== 'string' || !term.trim() || term.trim().length > 100 || !/^[\p{L}\p{N}][\p{L}\p{N}\s'’&()/.-]*$/u.test(term.trim())) {
            return res.status(400).json({ error: { message: 'Enter one legal term (up to 100 characters).', code: 'INVALID_INPUT' } });
        }
        const definition = await defineContractTerm(term.trim());
        res.json({ definition });
    } catch (err) { next(err); }
});

router.post('/translate', requireAuth, async (req, res, next) => {
    try {
        const { text, language } = req.body || {};
        const languages = { English: 'English', isiZulu: 'isiZulu', Sesotho: 'Sesotho', Afrikaans: 'Afrikaans' };
        if (typeof text !== 'string' || !text.trim() || text.length > 12000 || !languages[language]) {
            return res.status(400).json({ error: { message: 'Enter text (up to 12,000 characters) and choose a language.', code: 'INVALID_INPUT' } });
        }
        const translation = await translateLegalText(text.trim(), languages[language]);
        res.json({ translation });
    } catch (err) { next(err); }
});

// Follow-up questions are tied to the explanation shown in the contract reader.
router.post('/contract-question', requireAuth, async (req, res, next) => {
    try {
        const { question, explanation, contractText } = req.body || {};
        if (typeof question !== 'string' || !question.trim() || question.trim().length > 1000 ||
            typeof explanation !== 'string' || !explanation.trim() || explanation.length > 12000 ||
            typeof contractText !== 'string' || !contractText.trim() || contractText.length > 20000) {
            return res.status(400).json({ error: { message: 'Provide a question and the current contract explanation.', code: 'INVALID_INPUT' } });
        }
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'sk-placeholder') return res.status(503).json({ error: { message: 'Follow-up answers are not configured yet.', code: 'AI_UNAVAILABLE' } });
        const { answerContractQuestion } = require('../services/compassAssistant');
        const answer = await answerContractQuestion(question.trim(), explanation, contractText);
        res.json({ answer });
    } catch (err) { next(err); }
});

/**
 * POST /api/v1/assistant/chat
 * Chat with Compass - the in-app help assistant for LawCompass
 * 
 * Body:
 * {
 *   "message": "How do I lock a document?",
 *   "history": [ { "role": "user"|"assistant", "content": "..." } ],
 *   "user": { "name": "...", "email": "...", "persona": "...", "province": "..." }
 * }
 */
router.post('/chat', optionalAuth, async (req, res, next) => {
    try {
        const { message, history, user: bodyUser } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                error: {
                    message: 'A message string is required.',
                    code: 'INVALID_INPUT'
                }
            });
        }

        const trimmed = message.trim();
        if (trimmed.length > 2000) {
            return res.status(400).json({
                error: {
                    message: 'Message exceeds maximum length of 2000 characters.',
                    code: 'MESSAGE_TOO_LONG'
                }
            });
        }

        // Determine user context from body or verified auth token
        let userContext = null;
        if (bodyUser && typeof bodyUser === 'object') {
            userContext = {
                name: bodyUser.name || bodyUser.fullName || null,
                email: bodyUser.email || null,
                persona: bodyUser.persona || null,
                province: bodyUser.province || null,
                tier: bodyUser.tier || 'standard'
            };
        } else if (req.user) {
            userContext = {
                name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0],
                email: req.user.email,
                persona: req.user.user_metadata?.persona,
                province: req.user.user_metadata?.province,
                tier: req.user.user_metadata?.tier || 'standard'
            };
        }

        const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
        const result = await askCompass(trimmed, safeHistory, userContext);

        res.json({
            success: true,
            reply: result.reply,
            engine: result.engine,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/assistant/prompt
 * Returns the official assistant persona & boundaries configuration
 */
router.get('/prompt', (req, res) => {
    res.json({
        name: 'Compass',
        role: 'In-app help assistant for LawCompass',
        jurisdiction: 'South Africa',
        prompt: COMPASS_SYSTEM_PROMPT
    });
});

module.exports = router;
