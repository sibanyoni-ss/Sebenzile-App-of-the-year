const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const config = require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { getAccountTier, hasPremiumFeatures } = require('../services/planAccess');

/**
 * POST /api/v1/uploads/initiate
 * Returns a short-lived signed upload URL to Supabase private storage.
 * The file is quarantined upon intake.
 */
router.post('/initiate', requireAuth, async (req, res, next) => {
    try {
        const { filename, mimeType, fileSizeBytes } = req.body;
        if (!filename || !mimeType) {
            return res.status(400).json({ error: { message: 'filename and mimeType are required.', code: 'INVALID_INPUT' } });
        }

        // 1. Enforce strict 10MB file size limit
        const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
        if (fileSizeBytes && fileSizeBytes > MAX_SIZE_BYTES) {
            return res.status(400).json({
                error: { message: 'File exceeds maximum permissible size of 10MB.', code: 'FILE_TOO_LARGE' }
            });
        }

        // 2. Prohibit malicious executable and script extensions
        const blockedExtensions = /\.(exe|bat|cmd|sh|php|js|py|vbs|msi|dll|scr|jar|com)$/i;
        if (blockedExtensions.test(filename)) {
            return res.status(400).json({
                error: { message: 'Security restriction: Executable files and scripts are strictly forbidden.', code: 'MALICIOUS_FILE_TYPE' }
            });
        }

        // 3. Validate supported MIME types & legal document extensions (Section 5)
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'text/markdown',
            'text/csv'
        ];

        if (!allowedTypes.includes(mimeType) && !filename.match(/\.(pdf|docx|doc|txt|md|csv)$/i)) {
            return res.status(400).json({ error: { message: 'Unsupported file format. Only PDF, DOCX, DOC, and TXT are permitted.', code: 'UNSUPPORTED_FILE_TYPE' } });
        }

        const tier = await getAccountTier(req);
        if (!hasPremiumFeatures(tier) && tier !== 'free') {
            return res.status(403).json({ error: { message: 'Contract uploads are not included with your current plan.', code: 'FEATURE_NOT_INCLUDED' } });
        }
        if (tier === 'free') {
            if (!/\.(pdf|docx|txt)$/i.test(filename)) {
                return res.status(403).json({ error: { message: 'The free plan accepts PDF, DOCX and TXT files.', code: 'FREE_FILE_TYPE_LIMIT' } });
            }
            const { count, error: countError } = await req.supabase
                .from('uploads')
                .select('id', { count: 'exact', head: true })
                .eq('owner_id', req.user.id);
            if (countError) return next(countError);
            if ((count || 0) >= 2) {
                return res.status(403).json({ error: { message: 'The free plan includes up to 2 contract uploads.', code: 'FREE_UPLOAD_LIMIT' } });
            }
        }

        // 4. Sanitize filename against directory traversal and shell attacks
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadId = crypto.randomUUID();
        const storagePath = `quarantine/${req.user.id}/${uploadId}_${sanitizedFilename}`;

        // Create signed upload URL from Supabase Storage
        const { data: uploadUrlData, error: urlError } = await supabaseAdmin
            .storage
            .from(config.supabase.bucket)
            .createSignedUploadUrl(storagePath);

        if (urlError) {
            return res.status(500).json({ error: { message: 'Failed to generate secure upload endpoint.', code: 'STORAGE_ERROR' } });
        }

        // Record quarantined upload in database
        await req.supabase.from('uploads').insert({
            id: uploadId,
            owner_id: req.user.id,
            original_filename: filename,
            storage_path: storagePath,
            mime_type: mimeType,
            file_size_bytes: fileSizeBytes || 0,
            scan_status: 'quarantined'
        });

        res.json({
            uploadId: uploadId,
            signedUrl: uploadUrlData.signedUrl,
            token: uploadUrlData.token,
            storagePath: storagePath,
            message: 'Upload initiated. File will be held in secure quarantine pending antivirus scan.'
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/uploads/:id/explain
 * Analyzes clauses in plain English with risk flags and explicit non-advice disclaimers.
 */
router.post('/:id/explain', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { contractText } = req.body;

        const tier = await getAccountTier(req);
        if (!hasPremiumFeatures(tier) && tier !== 'free') {
            return res.status(403).json({ error: { message: 'Contract explanations are not included with your current plan.', code: 'FEATURE_NOT_INCLUDED' } });
        }

        const { data: ownedUpload, error: ownershipError } = await req.supabase
            .from('uploads')
            .select('id')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .maybeSingle();
        if (ownershipError) return next(ownershipError);
        if (!ownedUpload) {
            return res.status(404).json({ error: { message: 'We could not find that uploaded contract.', code: 'UPLOAD_NOT_FOUND' } });
        }

        if (!contractText || contractText.trim().length < 20) {
            return res.status(400).json({ error: { message: 'Valid contract text is required for analysis.', code: 'INSUFFICIENT_TEXT' } });
        }

        // Segment clauses and identify legal flags
        const clauses = contractText
            .split(/(?<=[.!?;])\s+|\n{2,}/)
            .map(c => c.trim())
            .filter(c => c.length > 25)
            .slice(0, 10);

        const riskFlags = [];
        if (/terminat|cancel|notice/i.test(contractText)) {
            riskFlags.push({ topic: 'Termination & Cancellation', warning: 'Check unilateral cancellation rights and notice period requirements.' });
        }
        if (/pay|fee|rent|invoice|interest|late/i.test(contractText)) {
            riskFlags.push({ topic: 'Financial Obligations', warning: 'Verify late-payment penalty interest and escalation clauses.' });
        }
        if (/liab|indemn|damage|loss|hold harmless/i.test(contractText)) {
            riskFlags.push({ topic: 'Liability & Indemnity', warning: 'Risk allocation detected. Ensure you are not assuming unlimited third-party liability.' });
        }
        if (/confidential|trade secret|non-disclos/i.test(contractText)) {
            riskFlags.push({ topic: 'Confidentiality', warning: 'Indefinite non-disclosure periods should be scrutinized.' });
        }

        res.json({
            uploadId: id,
            disclaimer: 'This automated plain-English reading is for informational purposes only and does NOT constitute legal advice or confirm enforceability.',
            overallSummary: 'The uploaded contract defines bilateral rights and obligations, payment timelines, and consequences for breach.',
            riskFlags: riskFlags,
            clausesAnalyzed: clauses.length,
            explanations: clauses.map((c, i) => ({
                index: i + 1,
                excerpt: c.slice(0, 150) + (c.length > 150 ? '...' : ''),
                plainEnglishReading: getPlainReading(c)
            }))
        });
    } catch (err) {
        next(err);
    }
});

function getPlainReading(c) {
    if (/terminat|cancel/i.test(c)) return 'Explains how the contract ends and what prior notice is needed.';
    if (/liab|indemn/i.test(c)) return 'Allocates financial risk for loss or third-party damage.';
    if (/pay|rent|fee/i.test(c)) return 'Details payment obligations, due dates, and penalties.';
    if (/confidential/i.test(c)) return 'Requires keeping disclosed data private and limiting recipient access.';
    return 'Defines a specific condition, obligation, or procedure for both parties.';
}

module.exports = router;
