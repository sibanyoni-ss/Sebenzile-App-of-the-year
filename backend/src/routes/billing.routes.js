const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

const PLANS = {
    standard: {
        id: 'plan_standard_monthly',
        name: 'Standard Plan',
        amountZar: 99,
        features: ['Unlimited documents', 'Document locking (SHA-256)', 'Custom terms personalizer', 'PDF & Word export']
    },
    premium: {
        id: 'plan_premium_monthly',
        name: 'Premium Enterprise Plan',
        amountZar: 199,
        features: ['Everything in Standard', 'Contract upload & AI plain-English reader', 'Proximity legal referrals', 'Statutory compliance engine', 'Encrypted cloud vault', 'E-signatures']
    }
};

/**
 * GET /api/v1/billing/plans
 * Public plans and benefits list
 */
router.get('/plans', (req, res) => {
    res.json({ plans: PLANS });
});

/**
 * POST /api/v1/billing/checkout
 * Initializes a provider-hosted checkout session (Paystack).
 * Returns only the authorization URL or redirect token.
 */
router.post('/checkout', requireAuth, async (req, res, next) => {
    try {
        const { planKey } = req.body;
        const plan = PLANS[planKey];
        if (!plan) {
            return res.status(400).json({ error: { message: 'Invalid plan selected.', code: 'INVALID_PLAN' } });
        }

        // In production, make authenticated call to Paystack:
        // https://api.paystack.co/transaction/initialize
        // Client never declares payment status directly!
        const reference = 'LB-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');

        res.json({
            message: 'Checkout session created.',
            checkoutUrl: `https://checkout.paystack.com/${reference}`,
            reference: reference,
            plan: plan
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/billing/webhook
 * CRITICAL SECURITY REQUIREMENT:
 * Cryptographically verifies Paystack HMAC signature before processing subscription state.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-paystack-signature'];
        if (!signature || !config.paystack.webhookSecret) {
            return res.status(400).send('Signature missing or webhook secret unconfigured');
        }

        const hash = crypto
            .createHmac('sha512', config.paystack.webhookSecret)
            .update(req.body)
            .digest('hex');

        if (hash !== signature) {
            return res.status(401).send('Invalid webhook signature');
        }

        const event = JSON.parse(req.body.toString());

        // Process verified event idempotently
        if (event.event === 'charge.success') {
            const customerEmail = event.data.customer.email;
            // Update user profile tier in Supabase using privileged supabaseAdmin client
            await supabaseAdmin
                .from('profiles')
                .update({ tier: 'premium', updated_at: new Date().toISOString() })
                .eq('email', customerEmail);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Webhook processing error');
    }
});

module.exports = router;
