/**
 * ==============================================================================
 * LOWCAMPUSS / LAWCOMPASS EMAIL SERVICE (ServerSMTP / TurboSMTP API v2)
 * ==============================================================================
 * Handles secure, authentic transactional email delivery for user registration,
 * verification codes, and security notices using the TurboSMTP REST API v2.
 *
 * Endpoint: POST https://api.turbo-smtp.com/api/v2/mail/send
 * Headers: consumerKey, consumerSecret, Content-Type: application/json
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const TEST_MAILBOX_FILE = path.resolve(__dirname, '../../.test-mailbox.json');

// Helper to escape HTML characters in user-provided inputs
function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// In-memory test mailbox for automated unit and integration tests
const testMailbox = [];

function recordTestEmail(record) {
    testMailbox.push(record);
    if (process.env.NODE_ENV !== 'production') {
        try {
            let list = [];
            if (fs.existsSync(TEST_MAILBOX_FILE)) {
                list = JSON.parse(fs.readFileSync(TEST_MAILBOX_FILE, 'utf8'));
            }
            list.push(record);
            if (list.length > 50) list = list.slice(-50);
            fs.writeFileSync(TEST_MAILBOX_FILE, JSON.stringify(list, null, 2));
        } catch (_) {}
    }
}

/**
 * Returns whether TurboSMTP credentials are fully configured.
 */
function isConfigured() {
    const { consumerKey, consumerSecret } = config.turbosmtp;
    return Boolean(consumerKey && consumerSecret && consumerKey !== 'placeholder_key');
}

/**
 * Generates the clean, responsive, branded HTML email template for LowCampuss verification.
 */
function buildVerificationHtml({ firstName, code, expiresInMinutes = 10 }) {
    const safeName = escapeHtml(firstName);
    const greeting = safeName ? `Dear ${safeName},` : 'Hello,';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your LowCampuss email address</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f5f0; font-family:'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#18243b; -webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f5f0; width:100%; padding:30px 15px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border:1px solid #e5e2da; border-radius:8px; overflow:hidden; box-shadow:0 4px 14px rgba(20, 34, 59, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#14223b; padding:28px 36px; text-align:left;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td>
                                        <span style="font-family:'Playfair Display', Georgia, serif; font-size:32px; color:#f4c36f; font-weight:700; vertical-align:middle; line-height:1;">§</span>
                                        <span style="font-family:'Playfair Display', Georgia, serif; font-size:22px; color:#ffffff; font-weight:700; margin-left:8px; vertical-align:middle; letter-spacing:0.5px;">LowCampuss</span>
                                    </td>
                                    <td align="right">
                                        <span style="font-size:11px; font-weight:600; color:#c98d31; letter-spacing:1px; text-transform:uppercase;">Legal Workspace</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding:36px 36px 28px;">
                            <h1 style="margin:0 0 16px; font-family:'Playfair Display', Georgia, serif; font-size:24px; font-weight:600; color:#14223b; line-height:1.3;">
                                Verify your email address
                            </h1>
                            <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:#475569;">
                                ${greeting}
                            </p>
                            <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#475569;">
                                Thank you for registering with LowCampuss. To complete your account registration and activate your personal South African legal workspace, please enter the following single-use verification code in the application:
                            </p>

                            <!-- Verification Code Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                                <tr>
                                    <td align="center" style="background-color:#fffdfa; border:2px dashed #c98d31; border-radius:8px; padding:20px;">
                                        <div style="font-size:12px; font-weight:700; color:#a36d25; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">
                                            One-Time Verification Code
                                        </div>
                                        <div style="font-family:'DM Mono', Courier, monospace; font-size:36px; font-weight:700; color:#14223b; letter-spacing:8px; margin:4px 0;">
                                            ${code}
                                        </div>
                                        <div style="font-size:12.5px; color:#64748b; margin-top:8px;">
                                            ⏱ Valid for <strong>${expiresInMinutes} minutes</strong>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 20px; font-size:14px; line-height:1.6; color:#475569;">
                                Return to the LowCampuss registration screen and enter this 6-digit code.
                            </p>

                            <!-- Security Advisory Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px; background-color:#f8fafc; border-left:4px solid #94a3b8; border-radius:4px; padding:14px 16px;">
                                <tr>
                                    <td style="font-size:12.5px; line-height:1.5; color:#64748b;">
                                        <strong style="color:#1e293b;">Security notice:</strong> If you did not create an account with LowCampuss, please disregard this email. No workspace will be activated without this verification code. LowCampuss staff will never ask for this code.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#fafaf9; border-top:1px solid #e5e2da; padding:22px 36px; text-align:center;">
                            <p style="margin:0 0 6px; font-size:12px; color:#94a3b8;">
                                LowCampuss · South African Legal Workspace · Powered by ServerSMTP
                            </p>
                            <p style="margin:0; font-size:11px; color:#cbd5e1;">
                                This is an automated transactional security message. Please do not reply directly to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Generates the clean plain-text fallback version for LowCampuss verification.
 */
function buildVerificationText({ firstName, code, expiresInMinutes = 10 }) {
    const greeting = firstName ? `Dear ${firstName},` : 'Hello,';
    return `LowCampuss — South African Legal Workspace
Verify Your Email Address
--------------------------------------------------

${greeting}

Thank you for registering with LowCampuss.

Your 6-digit email verification code is:
>>> ${code} <<<

This code is single-use and will expire in ${expiresInMinutes} minutes.

Please return to the registration screen and enter this code to activate your account.

If you did not register for an account with LowCampuss, please ignore this email. No account will be created without this verification code.

--------------------------------------------------
LowCampuss · Republic of South Africa
This is an automated transactional message. Please do not reply directly.`;
}

/**
 * Sends a real email using TurboSMTP REST API v2.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.recipientName - Recipient full or first name
 * @param {string} params.code - 6-digit verification code
 * @param {number} [params.expiresInMinutes=10] - TTL in minutes
 * @param {boolean} [params.isTestMock=false] - If true, records to test mailbox without hitting network
 * @returns {Promise<{ success: boolean, messageId?: string, isMock?: boolean }>}
 */
async function sendVerificationEmail({ to, recipientName = '', code, expiresInMinutes = 10, isTestMock = false }) {
    if (!to || !to.includes('@')) {
        throw new Error('A valid recipient email address is required.');
    }
    if (!code || String(code).length !== 6) {
        throw new Error('A valid 6-digit verification code is required.');
    }

    const { apiUrl, consumerKey, consumerSecret, fromEmail } = config.turbosmtp;

    const subject = 'Verify your LowCampuss email address';
    const htmlContent = buildVerificationHtml({ firstName: recipientName, code, expiresInMinutes });
    const textContent = buildVerificationText({ firstName: recipientName, code, expiresInMinutes });

    // Always record sent email details in test ledger for test verification
    recordTestEmail({
        to: to.trim().toLowerCase(),
        recipientName,
        code,
        subject,
        sentAt: Date.now()
    });

    // In automated testing mode or when explicitly mocking
    if (isTestMock || (process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_SMTP_TEST)) {
        return {
            success: true,
            messageId: `mock-mid-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            isMock: true
        };
    }

    // Production / Live TurboSMTP API Execution
    if (!consumerKey || !consumerSecret) {
        throw new Error('ServerSMTP credentials (consumerKey, consumerSecret) are not configured.');
    }

    const payload = {
        from: fromEmail || 'noreply@lawcompass.co.za',
        to: to.trim().toLowerCase(),
        subject,
        content: textContent,
        html_content: htmlContent
    };

    let response;
    try {
        response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'consumerKey': consumerKey,
                'consumerSecret': consumerSecret,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (networkErr) {
        throw new Error(`Failed to connect to email provider: ${networkErr.message}`);
    }

    let responseData;
    try {
        responseData = await response.json();
    } catch (_) {
        responseData = null;
    }

    if (!response.ok) {
        const errorMsg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
        throw new Error(`Email provider rejected delivery: ${errorMsg}`);
    }

    return {
        success: true,
        messageId: responseData?.mid ? String(responseData.mid) : 'mid-ok',
        isMock: false
    };
}

/**
 * Test helper to retrieve the latest sent verification code for a recipient.
 * Used strictly in test suites to verify email contents without leaking codes in HTTP API responses.
 */
function getLastSentVerificationForTest(email) {
    const clean = (email || '').trim().toLowerCase();
    try {
        if (fs.existsSync(TEST_MAILBOX_FILE)) {
            const list = JSON.parse(fs.readFileSync(TEST_MAILBOX_FILE, 'utf8'));
            const matches = list.filter(m => m.to.toLowerCase() === clean);
            if (matches.length) return matches[matches.length - 1];
        }
    } catch (_) {}
    const matches = testMailbox.filter(m => m.to.toLowerCase() === clean);
    return matches.length ? matches[matches.length - 1] : null;
}

/**
 * Clears the in-memory and disk test mailbox.
 */
function clearTestMailbox() {
    testMailbox.length = 0;
    try {
        if (fs.existsSync(TEST_MAILBOX_FILE)) {
            fs.unlinkSync(TEST_MAILBOX_FILE);
        }
    } catch (_) {}
}

module.exports = {
    isConfigured,
    buildVerificationHtml,
    buildVerificationText,
    sendVerificationEmail,
    getLastSentVerificationForTest,
    clearTestMailbox
};
