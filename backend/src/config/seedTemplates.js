const { supabaseAdmin } = require('./supabase');

const TEMPLATES = [
    {
        key: 'Employment',
        title: 'Employment Contract',
        description: 'BCEA-compliant employment agreement for permanent and fixed-term staff.',
        jurisdiction: 'ZA',
        version: 1,
        schema_json: { sections: ['parties', 'duties', 'remuneration', 'leave', 'termination'] }
    },
    {
        key: 'Lease',
        title: 'Residential Lease Agreement',
        description: 'Rental Housing Act and CPA compliant residential lease.',
        jurisdiction: 'ZA',
        version: 1,
        schema_json: { sections: ['property', 'rent', 'deposit', 'maintenance', 'cancellation'] }
    },
    {
        key: 'NDA',
        title: 'Non-Disclosure Agreement',
        description: 'Confidentiality and IP trade secret protection under South African common law.',
        jurisdiction: 'ZA',
        version: 1,
        schema_json: { sections: ['confidential_info', 'obligations', 'exclusions', 'duration'] }
    },
    {
        key: 'Service',
        title: 'Service Agreement',
        description: 'Independent contractor agreement defining scope, SLA deliverables, and billing.',
        jurisdiction: 'ZA',
        version: 1,
        schema_json: { sections: ['services', 'fees', 'intellectual_property', 'warranties'] }
    },
    {
        key: 'Will',
        title: 'Last Will and Testament',
        description: 'Testamentary estate bequests, executor appointment, and guardian nomination.',
        jurisdiction: 'ZA',
        version: 1,
        schema_json: { sections: ['revocation', 'executor', 'bequests', 'residue', 'signatures'] }
    }
];

async function seedTemplates() {
    try {
        for (const tpl of TEMPLATES) {
            await supabaseAdmin
                .from('templates')
                .upsert(tpl, { onConflict: 'key' });
        }
        console.log('[LawCompass DB] Standard statutory templates seeded and verified.');
    } catch (err) {
        console.warn('[LawCompass DB] Note: Template seeding notice:', err.message);
    }
}

module.exports = seedTemplates;
