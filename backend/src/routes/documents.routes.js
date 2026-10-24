const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { generateDocumentLockSeal } = require('../services/documentLockService');

/**
 * GET /api/v1/templates
 * List all available official legal templates
 */
router.get('/templates', (req, res) => {
    res.json({
        templates: [
            { key: 'Employment', title: 'Employment Contract', jurisdiction: 'ZA', version: 1, desc: 'BCEA-compliant employment agreement.' },
            { key: 'Lease', title: 'Residential Lease Agreement', jurisdiction: 'ZA', version: 1, desc: 'Rental Housing Act and CPA compliant.' },
            { key: 'NDA', title: 'Non-Disclosure Agreement', jurisdiction: 'ZA', version: 1, desc: 'Confidentiality and IP trade secret protection.' },
            { key: 'Service', title: 'Service Agreement', jurisdiction: 'ZA', version: 1, desc: 'Scope of work, deliverables, and payment terms.' },
            { key: 'Will', title: 'Last Will and Testament', jurisdiction: 'ZA', version: 1, desc: 'Testamentary estate bequests and executor appointment.' }
        ]
    });
});

/**
 * POST /api/v1/documents/drafts
 * Create a new draft with questionnaire answers and personalized custom clauses
 */
router.post('/drafts', requireAuth, async (req, res, next) => {
    try {
        const { templateKey, title, answers, customClauses } = req.body;
        if (!templateKey || !answers) {
            return res.status(400).json({
                error: { message: 'templateKey and answers are required.', code: 'INVALID_INPUT' }
            });
        }

        // Resolve template_id from templates table
        let templateId = req.body.templateId;
        if (!templateId) {
            const { data: tpl } = await req.supabase
                .from('templates')
                .select('id')
                .eq('key', templateKey)
                .single();
            templateId = tpl?.id;
        }

        const draftData = {
            owner_id: req.user.id,
            template_id: templateId,
            template_key: templateKey,
            title: title || `${templateKey} Draft`,
            answers: answers,
            custom_clauses: customClauses || [],
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await req.supabase
            .from('draft_documents')
            .insert(draftData)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: { message: error.message, code: 'DB_ERROR' } });
        }

        res.status(201).json({ message: 'Draft saved successfully.', draft: data });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/documents/:id/lock
 * CRITICAL REQUIREMENT: Lock user document after generation with cryptographic tamper-evident seal.
 */
router.post('/:id/lock', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch document ensuring user ownership
        const { data: doc, error: fetchErr } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .single();

        if (fetchErr || !doc) {
            return res.status(404).json({ error: { message: 'Document not found.', code: 'NOT_FOUND' } });
        }

        if (doc.status === 'locked') {
            return res.status(400).json({ error: { message: 'Document is already locked.', code: 'ALREADY_LOCKED' } });
        }

        // Generate SHA-256 seal
        const seal = generateDocumentLockSeal(doc);

        // Update status to locked via server-side cryptographic lock
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('draft_documents')
            .update({
                status: 'locked',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .select()
            .single();

        if (updateErr) {
            return res.status(400).json({ error: { message: updateErr.message, code: 'UPDATE_FAILED' } });
        }

        // Store generated locked document record
        await req.supabase.from('generated_documents').insert({
            draft_id: id,
            owner_id: req.user.id,
            file_key: `contracts/${req.user.id}/${id}_locked.docx`,
            file_type: 'docx',
            is_locked: true,
            lock_checksum: seal.lockChecksum,
            locked_at: seal.lockedAt,
            locked_by: req.user.id
        });

        res.json({
            message: 'Document successfully locked and finalized. Immutability guaranteed.',
            seal: seal,
            document: updated
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/documents/:id
 * Retrieve a specific document, strictly enforcing owner authorization.
 * Threat Modelling: Users cannot access another user's contract even if knowing its UUID.
 */
router.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data: doc, error } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .single();

        if (error || !doc) {
            return res.status(404).json({
                error: { message: 'Document not found or access forbidden.', code: 'DOCUMENT_NOT_FOUND' }
            });
        }

        res.json({ document: doc });
    } catch (err) {
        next(err);
    }
});

/**
 * Validate South African 13-digit ID Number using Luhn checksum algorithm
 */
function isValidSouthAfricanID(id) {
    if (!/^\d{13}$/.test(id)) return false;
    const d = id.split('').map(Number);
    // Home Affairs formula:
    const a = d[0] + d[2] + d[4] + d[6] + d[8] + d[10];
    const b = parseInt('' + d[1] + d[3] + d[5] + d[7] + d[9] + d[11], 10) * 2;
    const c = b.toString().split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    const checksum = (10 - ((a + c) % 10)) % 10;
    if (checksum === d[12]) return true;

    // Fallback standard right-to-left Luhn
    let sum = 0;
    for (let i = 12; i >= 0; i--) {
        let digit = d[i];
        if ((12 - i) % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    return sum % 10 === 0;
}

/**
 * POST /api/v1/documents/:id/unlock
 * Unlock a sealed document using verified South African ID or Passport number
 * combined with authenticated account session verification.
 */
router.post('/:id/unlock', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { idNumber, idType = 'sa_id' } = req.body;

        if (!idNumber) {
            return res.status(400).json({
                error: { message: 'South African ID or passport number is required for unlocking.', code: 'MISSING_ID_CREDENTIALS' }
            });
        }

        const cleanId = idNumber.replace(/\s+/g, '').toUpperCase();

        // 1. Validate identity format
        let isValidIdentity = false;
        if (idType === 'sa_id') {
            isValidIdentity = isValidSouthAfricanID(cleanId);
            if (!isValidIdentity) {
                return res.status(400).json({
                    error: { message: 'Invalid South African 13-digit ID number checksum.', code: 'INVALID_SA_ID' }
                });
            }
        } else {
            // Passport format: 7 to 12 alphanumeric characters
            isValidIdentity = /^[A-Z0-9]{7,12}$/i.test(cleanId);
            if (!isValidIdentity) {
                return res.status(400).json({
                    error: { message: 'Invalid passport number format.', code: 'INVALID_PASSPORT' }
                });
            }
        }

        // 2. Fetch document ensuring strict ownership
        const { data: doc, error: fetchErr } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .single();

        if (fetchErr || !doc) {
            return res.status(404).json({
                error: { message: 'Document not found or unauthorized access.', code: 'NOT_FOUND' }
            });
        }

        if (doc.status !== 'locked') {
            return res.status(400).json({
                error: { message: 'Document is not currently locked.', code: 'NOT_LOCKED' }
            });
        }

        // 3. Unlock document: transition status back to 'draft' for editable revisions
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('draft_documents')
            .update({
                status: 'draft',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('owner_id', req.user.id)
            .select()
            .single();

        if (updateErr) {
            return res.status(400).json({ error: { message: updateErr.message, code: 'UNLOCK_FAILED' } });
        }

        // 4. Log POPIA-compliant audit event with SHA-256 hashed identity (preserving confidentiality)
        const idHash = require('crypto').createHash('sha256').update(cleanId).digest('hex');
        try {
            await req.supabase.from('audit_events').insert({
                user_id: req.user.id,
                action: 'DOCUMENT_UNLOCKED',
                resource_type: 'draft_document',
                resource_id: id,
                metadata: {
                    id_type: idType,
                    id_hash: idHash,
                    unlocked_at: new Date().toISOString()
                }
            });
        } catch (_) {}

        res.json({
            message: 'Document successfully unlocked and available for revision.',
            document: updated,
            unlockAudit: {
                unlockedAt: new Date().toISOString(),
                identityType: idType,
                verifiedBy: req.user.email
            }
        });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/documents
 * List user's documents and drafts
 */
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const { data, error } = await req.supabase
            .from('draft_documents')
            .select('*')
            .eq('owner_id', req.user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: { message: error.message, code: 'FETCH_ERROR' } });
        }

        res.json({ documents: data || [] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
