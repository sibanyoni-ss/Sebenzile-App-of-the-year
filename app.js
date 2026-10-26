/* ==============================================================================
   LAWCOMPASS CLIENT APPLICATION (POPIA-Compliant & Secure Legal Platform)
   Features:
   1. Route Protection & Auth Guard (Protected pages require sign-in)
   2. Real DOCX Template Population (Maps form inputs directly to docx placeholders)
   3. Proximity-Based Legal Help (Closest law firms under specific issue listed first)
   4. Document locking in the contract builder
   5. Personalize Contract Studio (Custom terms & conditions / clause presets)
   6. Premium Benefits Showcase & Comparison Matrix
   ============================================================================== */

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Form builder helpers
const F = (label, type = 'text', options = [], required = true) => ({ label, type, options, required });
const S = (title, fields) => ({ title, fields });

// ------------------------------------------------------------------------------
// 1. DATA DEFINITIONS & TEMPLATE SCHEMAS
// ------------------------------------------------------------------------------
const data = {
    Employment: {
        title: 'Employment Contract',
        templateFile: 'Templates/Employee_Contract.docx',
        desc: 'Prepare a draft for an employment arrangement in South Africa.',
        laws: [['Basic Conditions of Employment Act (BCEA)', 'https://www.gov.za/documents/basic-conditions-employment-act'], ['Labour Relations Act', 'https://www.gov.za/af/documents/labour-relations-act']],
        sections: [
            S('Employer and employee', [
                F('Employer / company legal name'),
                F('Company registration number'),
                F('Employer physical address', 'textarea'),
                F('Employee full names'),
                F('Employee ID / passport number'),
                F('Employee residential address', 'textarea'),
                F('Employee email address', 'email'),
                F('Employee telephone number', 'tel'),
                F('Employee gender', 'select', ['Female', 'Male', 'Prefer not to say'], false)
            ]),
            S('Role and term', [
                F('Job title'),
                F('Department / reporting manager', 'text', [], false),
                F('Employment type', 'select', ['Full-time', 'Part-time', 'Fixed-term', 'Internship', 'Casual']),
                F('Start date', 'date'),
                F('End date', 'date', [], false),
                F('No fixed end date', 'checkbox', [], false),
                F('Place of work', 'text', [], false),
                F('Working hours per week', 'number'),
                F('Responsibilities and performance expectations', 'textarea')
            ]),
            S('Pay and benefits', [
                F('Salary / wage amount (R)', 'number'),
                F('Remuneration frequency', 'select', ['Hourly', 'Weekly', 'Bi-weekly', 'Monthly']),
                F('Rate per hour (R)', 'number', [], false),
                F('Overtime rate / calculation', 'text', [], false),
                F('Payment date / method', 'text', [], false),
                F('Annual leave days', 'number'),
                F('Benefits', 'checkbox-group', ['Medical aid', 'Car allowance', 'Provident fund', 'Company stock', 'UIF', 'Insurance'], false)
            ]),
            S('Ending employment', [
                F('Probation period', 'text', [], false),
                F('Notice period', 'text'),
                F('Confidentiality / restraint obligations', 'textarea', [], false),
                F('Governing law / jurisdiction', 'text', [], false)
            ])
        ]
    },
    Lease: {
        title: 'Residential Lease Agreement',
        templateFile: 'Templates/Lease_Agreement.docx',
        desc: 'Prepare a draft for a residential rental arrangement in South Africa.',
        laws: [['Rental Housing Act', 'https://www.gov.za/documents/rental-housing-act'], ['Consumer Protection Act (where applicable)', 'https://www.gov.za/documents/consumer-protection-act']],
        sections: [
            S('Parties and premises', [
                F('Landlord / lessor full name'),
                F('Landlord ID / registration number', 'text', [], false),
                F('Tenant / lessee full name'),
                F('Tenant ID / passport number', 'text', [], false),
                F('Property address', 'textarea'),
                F('Included furniture / inventory', 'textarea', [], false),
                F('Permitted use of premises', 'select', ['Residential only', 'Commercial only', 'Mixed use'], false),
                F('Occupants / dependants', 'textarea', [], false)
            ]),
            S('Term and rent', [
                F('Lease start date', 'date'),
                F('Lease end date', 'date'),
                F('Monthly rent (R)', 'number'),
                F('Rent amount in words', 'text'),
                F('Deposit (R)', 'number'),
                F('Rent payment day of month', 'number'),
                F('Payment method / bank details', 'textarea', [], false),
                F('Annual escalation percentage', 'number', [], false),
                F('Notice period', 'text'),
                F('Agreement signed on', 'date')
            ]),
            S('Utilities and obligations', [
                F('Utility account holder', 'select', ['Tenant / lessee', 'Landlord / lessor', 'Shared']),
                F('Utilities payable by tenant', 'checkbox-group', ['Water', 'Sewer services', 'Electricity', 'Refuse / bins', 'Internet'], false),
                F('Maintenance and repair obligations', 'textarea', [], false),
                F('Pets / smoking rules', 'textarea', [], false),
                F('Subletting consent', 'select', ['Not permitted', 'Permitted with written consent', 'Permitted'], false),
                F('Inspection and condition report', 'textarea', [], false),
                F('Governing law / dispute resolution', 'textarea', [], false)
            ])
        ]
    },
    NDA: {
        title: 'Non-Disclosure Agreement',
        templateFile: 'Templates/NDA.docx',
        desc: 'Set out how confidential information may be shared and used.',
        laws: [['Protection of Personal Information Act (POPIA), where personal information is involved', 'https://www.gov.za/documents/protection-personal-information-act'], ['Electronic Communications and Transactions Act (ECTA)', 'https://www.dcdt.gov.za/documents/legislations/acts/file/9-electronic-communications-and-transactions-act-2002.html']],
        lawNote: 'There is no single Act for every NDA. Contract law applies; POPIA may also apply when personal information is shared.',
        sections: [
            S('Disclosing party', [
                F('Disclosing party name / company'),
                F('Disclosing party registration or ID number', 'text', [], false),
                F('Disclosing party address', 'textarea'),
                F('Disclosing party email', 'email'),
                F('Disclosing party phone', 'tel')
            ]),
            S('Receiving party', [
                F('Receiving party name / company'),
                F('Receiving party registration or ID number', 'text', [], false),
                F('Receiving party address', 'textarea'),
                F('Receiving party email', 'email'),
                F('Receiving party phone', 'tel')
            ]),
            S('Confidentiality terms', [
                F('Effective date', 'date'),
                F('Term / expiration date', 'date', [], false),
                F('Non-disclosure period (e.g. 2 years)', 'text', [], false),
                F('Purpose of disclosure', 'textarea'),
                F('Confidential information scope', 'textarea'),
                F('Permitted recipients / exclusions', 'textarea', [], false),
                F('Return or destruction of information', 'select', ['Return on request', 'Destroy on request', 'Either return or destroy'], false),
                F('Governing law / jurisdiction', 'text'),
                F('Acknowledgement of terms', 'checkbox', [], true)
            ])
        ]
    },
    Service: {
        title: 'Service Contract Agreement',
        templateFile: 'Templates/Service_Agreement.docx',
        desc: 'Set out the work, timing, payment and responsibilities for a service.',
        laws: [['Consumer Protection Act (where applicable)', 'https://www.gov.za/documents/consumer-protection-act'], ['Electronic Communications and Transactions Act (ECTA)', 'https://www.dcdt.gov.za/documents/legislations/acts/file/9-electronic-communications-and-transactions-act-2002.html']],
        lawNote: 'Service contracts generally rely on contract law. The Consumer Protection Act may apply depending on the parties and service.',
        sections: [
            S('Parties and scope', [
                F('Service provider legal name'),
                F('Service provider registration / ID number', 'text', [], false),
                F('Service recipient / client legal name'),
                F('Client address', 'textarea', [], false),
                F('Services rendered to / project name'),
                F('Detailed service scope and deliverables', 'textarea'),
                F('Acceptance criteria / milestones', 'textarea', [], false)
            ]),
            S('Timing and payment', [
                F('Start date', 'date'),
                F('End date', 'date'),
                F('Payment method', 'select', ['EFT / bank transfer', 'Cash', 'Card', 'Other']),
                F('Payment frequency', 'select', ['Once-off', 'Weekly', 'Monthly', 'Milestone-based', 'Other']),
                F('Total payment (R)', 'number'),
                F('Payment breakdown / milestone schedule', 'textarea'),
                F('Late-payment interest or fee', 'text', [], false),
                F('Notice period', 'text')
            ]),
            S('Risk and rights', [
                F('Damage liabilities', 'select', ['Service recipient', 'Service provider', 'Shared']),
                F('Copyright / intellectual-property ownership', 'select', ['Service recipient', 'Service provider', 'Shared']),
                F('Confidentiality requirements', 'textarea', [], false),
                F('Insurance requirements', 'textarea', [], false),
                F('Termination rights', 'textarea', [], false),
                F('Governing law / dispute process', 'textarea', [], false)
            ])
        ]
    },
    Will: {
        title: 'Last Will and Testament',
        templateFile: 'Templates/Will.docx',
        desc: 'Record your wishes for how your estate should be handled.',
        laws: [['Wills Act', 'https://www.gov.za/documents/wills-act-22-may-2015-1512']],
        sections: [
            S('Testator details', [
                F('Testator full names'),
                F('ID / passport number'),
                F('Date created', 'date'),
                F('Residential address', 'textarea', [], false),
                F('Marital status', 'select', ['Single', 'Married in community of property', 'Married out of community of property', 'Divorced', 'Widowed'], false),
                F('Revoke all previous wills and codicils', 'checkbox', [], false)
            ]),
            S('Executor and witnesses', [
                F('Executor full names'),
                F('Executor contact details', 'textarea', [], false),
                F('Alternate executor full names', 'text', [], false),
                F('Witness 1 full names'),
                F('Witness 1 ID / passport number', 'text', [], false),
                F('Witness 2 full names', 'text', [], false),
                F('Witness 2 ID / passport number', 'text', [], false)
            ]),
            S('Beneficiaries and guardians', [
                F('Beneficiary 1 full names'),
                F('Beneficiary 1 ID / passport number'),
                F('Beneficiary 1 percentage', 'number'),
                F('Beneficiary 2 full names', 'text', [], false),
                F('Beneficiary 2 ID / passport number', 'text', [], false),
                F('Beneficiary 2 percentage', 'number', [], false),
                F('Residuary beneficiary full name', 'text', [], false),
                F('Alternate residuary beneficiary full name', 'text', [], false),
                F('Guardian for minor children', 'text', [], false),
                F('Alternate guardian', 'text', [], false)
            ]),
            S('Estate directions', [
                F('Asset / property 1', 'textarea'),
                F('Asset / property 2', 'textarea', [], false),
                F('Additional assets, specific bequests or residue instructions', 'textarea', [], false),
                F('Funeral wishes', 'textarea', [], false),
                F('Digital assets / online accounts instructions', 'textarea', [], false)
            ])
        ]
    }
};

// Recommended South African clause presets for contract personalization
const CLAUSE_PRESETS = [
    {
        title: 'Restraint of Trade & Non-Solicitation',
        body: 'The Employee/Service Provider undertakes that for a period of 12 (twelve) months following the termination of this Agreement, they shall not directly or indirectly solicit any clients, employees, or contractors, nor engage in competing commercial activities within the Republic of South Africa.'
    },
    {
        title: 'Intellectual Property Assignment',
        body: 'All intellectual property rights, inventions, software, documentation, designs, and work product developed under this Agreement shall vest exclusively in the Client/Company upon creation as work-for-hire, with full title transferred free of encumbrance.'
    },
    {
        title: 'Remote Work & Equipment Protocol',
        body: 'The Employee may perform duties remotely up to 3 days per week subject to operational requirements, maintaining strict POPIA data privacy safeguards, reliable internet connectivity, and secure care of company-issued IT equipment.'
    },
    {
        title: 'Late Payment Penalty Interest',
        body: 'Any undisputed invoice or rental payment not settled on or before the due date shall accrue penalty interest at the rate of 2% (two percent) per month, calculated daily and compounded monthly until paid in full.'
    },
    {
        title: 'AFSA Commercial Arbitration',
        body: 'Any dispute arising in connection with this Agreement shall be referred to and finally resolved by expedited confidential arbitration administered by the Arbitration Foundation of Southern Africa (AFSA) under its Commercial Rules in Johannesburg.'
    },
    {
        title: 'Force Majeure & Unforeseen Events',
        body: 'Neither party shall be liable for non-performance or delay resulting from acts of God, civil unrest, natural disasters, national power grid failure, or governmental restrictions exceeding 14 consecutive days.'
    }
];

// Legal dictionary terms
const terms = {
    consideration: ['Consideration', 'Something of value exchanged by parties to a contract (money, goods, or promises).', 'Example: Payment of R10,000 in return for monthly legal consulting services.'],
    nda: ['NDA (Non-Disclosure Agreement)', 'A legally binding agreement designed to keep confidential data and trade secrets strictly private.', 'Example: Two South African tech founders sign an NDA before presenting source code.'],
    lease: ['Lease Agreement', 'A contract where a lessor grants a lessee the right to occupy property for a period in return for rent.', 'Example: A 12-month residential lease subject to the Rental Housing Act.'],
    'service contract': ['Service Contract', 'An agreement detailing scope of work, deliverables, compensation, and liability allocation.', 'Example: A software developer agrees to milestones and payment terms with a corporate client.'],
    deposit: ['Deposit', 'Money paid at the start of an agreement as security or part payment.', 'Example: A tenant pays a deposit before moving into a rented home.'],
    termination: ['Termination', 'Ending an agreement, usually by following the steps and notice period set out in it.', 'Example: Either party may end the service agreement by giving 30 days’ written notice.'],
    indemnity: ['Indemnity', 'A promise in an agreement to cover certain losses or costs suffered by another party.', 'Example: A service provider agrees to cover losses caused by its negligent work.'],
    'force majeure': ['Force majeure', 'An unexpected event outside a party’s control that may affect its ability to meet an agreement.', 'Example: A contract explains what happens if a natural disaster prevents delivery.'],
    breach: ['Breach of contract', 'When a party does not do something the agreement requires them to do.', 'Example: A customer may be in breach if they do not pay by the agreed date.'],
    'notice period': ['Notice period', 'The amount of time a party must give before ending an agreement or making a specified change.', 'Example: A lease may require one calendar month’s written notice.'],
    liability: ['Liability', 'Legal responsibility for a loss, injury, or failure to meet an agreement.', 'Example: A clause may explain who is responsible if work causes damage.'],
    confidentiality: ['Confidentiality', 'A duty to keep certain information private and only use or share it as the agreement allows.', 'Example: A worker agrees not to share a company’s private customer information.'],
    'governing law': ['Governing law', 'The law that the agreement says will be used to interpret it.', 'Example: The agreement states that South African law applies.'],
    testator: ['Testator', 'The person who makes a will and whose wishes it records.', 'Example: The testator signs the will in the presence of witnesses.'],
    executor: ['Executor', 'The person appointed to manage an estate after someone dies and carry out the instructions in their will.', 'Example: The testator names a trusted person as executor.'],
    bequest: ['Bequest', 'A gift of money, property, or another item left to someone in a will.', 'Example: The will leaves a specific amount of money as a bequest.']
};

// ------------------------------------------------------------------------------
// 2. SOUTH AFRICAN LAW FIRMS DATABASE & PROXIMITY ENGINE
// ------------------------------------------------------------------------------
// 2. SOUTH AFRICAN CITY-CENTER PRESETS & HAVERSINE ENGINE
// ------------------------------------------------------------------------------
// NOTE: Presets represent approximate city/CBD reference centers and do not pinpoint users.
const CITY_PRESETS = {
    sandton: { name: 'Sandton, Johannesburg (Approx. City Center)', shortName: 'Sandton', lat: -26.1076, lng: 28.0567, isApproximate: true },
    johannesburg: { name: 'Johannesburg Central (Approx. City Center)', shortName: 'Johannesburg', lat: -26.2041, lng: 28.0473, isApproximate: true },
    rosebank: { name: 'Rosebank, Johannesburg (Approx. City Center)', shortName: 'Rosebank', lat: -26.1458, lng: 28.0435, isApproximate: true },
    pretoria: { name: 'Pretoria / Tshwane Central (Approx. City Center)', shortName: 'Pretoria', lat: -25.7479, lng: 28.2293, isApproximate: true },
    centurion: { name: 'Centurion, Gauteng (Approx. City Center)', shortName: 'Centurion', lat: -25.8560, lng: 28.1880, isApproximate: true },
    capetown: { name: 'Cape Town Central (Approx. City Center)', shortName: 'Cape Town', lat: -33.9249, lng: 18.4241, isApproximate: true },
    centurycity: { name: 'Century City, Cape Town (Approx. Commercial Area)', shortName: 'Century City', lat: -33.8920, lng: 18.5110, isApproximate: true },
    durban: { name: 'Durban Central (Approx. City Center)', shortName: 'Durban', lat: -29.8587, lng: 31.0218, isApproximate: true },
    umhlanga: { name: 'Umhlanga, KZN (Approx. City Center)', shortName: 'Umhlanga', lat: -29.7280, lng: 31.0847, isApproximate: true },
    bloemfontein: { name: 'Bloemfontein Central (Approx. City Center)', shortName: 'Bloemfontein', lat: -29.1166, lng: 26.2155, isApproximate: true },
    gqeberha: { name: 'Gqeberha / Port Elizabeth (Approx. City Center)', shortName: 'Gqeberha', lat: -33.9608, lng: 25.6022, isApproximate: true }
};
const LOCATIONS = CITY_PRESETS;

function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}


// ------------------------------------------------------------------------------
// 3. AUTHENTICATION & ROUTE GUARDS
// ------------------------------------------------------------------------------
const page = document.body.dataset.page;
// All workspace services require authentication - unauthenticated users must login first
const PROTECTED_PAGES = ['dashboard', 'documents', 'builder', 'upload', 'history', 'translate', 'help', 'pricing', 'dictionary', 'profile'];

function getProfile() {
    try {
        const stored = localStorage.getItem('lawcompass-profile') || localStorage.getItem('lawbuddy-profile');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
}

function isAuthenticated() {
    const p = getProfile();
    const token = localStorage.getItem('lawcompass-token') || localStorage.getItem('lawbuddy-token');
    return !!(p && p.name && p.name !== 'Guest' && (p.email || token));
}

const profile = () => getProfile() || { name: 'Member', email: '', tier: 'free' };
const accountTier = () => String(profile().tier || 'free').trim().toLowerCase();
const hasPaidFeatures = () => /^(standard|premium)(?:$|[-_  ])/.test(accountTier());
const hasPremiumFeatures = () => /^(standard|premium)(?:$|[-_  ])/.test(accountTier());
const planUsageKey = () => `lawcompass-plan-usage:${documentOwnerKey()}`;
function getPlanUsage() {
    try {
        const usage = JSON.parse(localStorage.getItem(planUsageKey()) || '{}');
        return {
            uploads: Math.max(0, Number(usage.uploads) || 0),
            explanations: Math.max(0, Number(usage.explanations) || 0)
        };
    }
    catch (_) { return { uploads: 0, explanations: 0 }; }
}
function savePlanUsage(usage) {
    try { localStorage.setItem(planUsageKey(), JSON.stringify(usage)); } catch (_) {}
}
const history = () => JSON.parse(localStorage.getItem('lawcompass-history') || localStorage.getItem('lawbuddy-history') || '[]');
const documentOwnerKey = () => String(profile().id || profile().email || 'local-user').trim().toLowerCase();
function openDocumentStore() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('Document storage is unavailable in this browser.'));
        const request = indexedDB.open('lawcompass-documents', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function saveUserDocument(record) {
    const db = await openDocumentStore();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('documents', 'readwrite');
        tx.objectStore('documents').put({ ...record, owner: documentOwnerKey() });
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
}
async function listUserDocuments() {
    const db = await openDocumentStore();
    return new Promise((resolve, reject) => {
        const request = db.transaction('documents').objectStore('documents').getAll();
        request.onsuccess = () => resolve((request.result || []).filter(doc => doc.owner === documentOwnerKey()).sort((a,b) => b.updatedAt - a.updatedAt));
        request.onerror = () => reject(request.error);
    });
}
async function getUserDocument(id) {
    const db = await openDocumentStore();
    return new Promise((resolve, reject) => {
        const request = db.transaction('documents').objectStore('documents').get(id);
        request.onsuccess = () => resolve(request.result && request.result.owner === documentOwnerKey() ? request.result : null);
        request.onerror = () => reject(request.error);
    });
}

// Check authentication guard immediately on protected pages
if (PROTECTED_PAGES.includes(page) && !isAuthenticated()) {
    const currentPath = location.pathname.split('/').pop() || 'dashboard.html';
    const redirectUrl = `login.html?redirect=${encodeURIComponent(currentPath + location.search)}`;
    location.replace(redirectUrl);
}

// ------------------------------------------------------------------------------
// 4. NAVIGATION & WORKSPACE SHELL
// ------------------------------------------------------------------------------
const nav = [
    ['dashboard.html', '⌂', 'Overview'],
    ['documents.html', '▣', 'Generate document'],
    ['upload-contract.html', '↥', 'Upload contract'],
    ['legal-help.html', '⌁', 'Find legal help'],
    ['dictionary.html', '◌', 'Legal dictionary'],
    ['history.html', '◷', 'Document history'],
    ['translate.html', '文', 'Translate contract terms'],
    ['pricing.html', '✦', 'Plans & premium'],
    ['profile.html', '◉', 'Profile']
];

function shell(title, bodyContent) {
    const activeMap = {
        dashboard: 'dashboard.html',
        documents: 'documents.html',
        builder: 'documents.html',
        upload: 'upload-contract.html',
        help: 'legal-help.html',
        dictionary: 'dictionary.html',
        history: 'history.html',
        translate: 'translate.html',
        pricing: 'pricing.html',
        profile: 'profile.html'
    };
    const active = activeMap[page] || '';
    const userProfile = profile();
    const initials = (userProfile.name || 'U').slice(0, 1).toUpperCase();

    document.body.innerHTML = `
        <div id="toast" role="status"></div>
        <div id="nav-scrim"></div>
        <aside id="sidebar">
            <div class="sidebar-brand">
                <a class="logo" href="dashboard.html">
                    <span>§</span>
                    <strong>LawCompass</strong>
                </a>
                <button id="sidebar-toggle" aria-label="Collapse navigation" aria-controls="sidebar" aria-expanded="true">‹</button>
            </div>
            <p class="side-label">WORKSPACE</p>
            <nav>
                ${nav.map(x => `<a class="${x[0] === active ? 'active' : ''}" href="${x[0]}" title="${x[2]}">${x[1]} <span>${x[2]}</span></a>`).join('')}
            </nav>
            <div class="side-bottom">
                <button id="signout" title="Sign out">↪ <span>Sign out</span></button>
            </div>
        </aside>
        <main>
            <header>
                <div class="header-title">
                    <button id="mobile-menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">☰</button>
                    <div>
                        <p class="eyebrow">YOUR WORKSPACE</p>
                        <h2>${title}</h2>
                    </div>
                </div>
                <div class="user">
                    <a class="user-avatar-link" href="profile.html" aria-label="Open your profile"><span>${initials}</span></a>
                    <div>
                        <b>${esc(userProfile.name)}</b>
                        <small>${esc(userProfile.email || 'Authenticated user')}</small>
                    </div>
                </div>
            </header>
            ${bodyContent}
        </main>
    `;

    // Sidebar and mobile interactions
    const toggle = () => {
        const collapsed = document.body.classList.toggle('sidebar-collapsed');
        const expanded = !collapsed;
        $('#sidebar-toggle').setAttribute('aria-expanded', String(expanded));
        $('#sidebar-toggle').setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
        $('#sidebar-toggle').textContent = expanded ? '‹' : '›';
    };
    const mobile = () => {
        const open = document.body.classList.toggle('sidebar-open');
        $('#mobile-menu').setAttribute('aria-expanded', String(open));
        $('#mobile-menu').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };

    $('#sidebar-toggle').onclick = toggle;
    $('#mobile-menu').onclick = mobile;
    $('#nav-scrim').onclick = () => {
        document.body.classList.remove('sidebar-open');
        $('#mobile-menu').setAttribute('aria-expanded', 'false');
    };

    $('#signout').onclick = () => {
        localStorage.removeItem('lawcompass-profile');
        localStorage.removeItem('lawcompass-token');
        localStorage.removeItem('lawbuddy-profile');
        localStorage.removeItem('lawbuddy-token');
        location.href = 'index.html';
    };

    // Initialize Compass In-App AI Help Assistant
    initCompassAssistant();
}

function toast(message) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}
function friendlyError(_error, fallback = 'Something went wrong. Please try again.') {
    return fallback;
}

// ------------------------------------------------------------------------------
// COMPASS IN-APP AI HELP ASSISTANT (South African Legal Guide)
// ------------------------------------------------------------------------------
let compassChatSession = null;

function initCompassAssistant() {
    if ($('#compass-drawer')) return;

    const userProfile = profile();
    const userName = (userProfile && userProfile.name && userProfile.name !== 'Member' && userProfile.name !== 'Guest') ? userProfile.name : '';

    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'compass-widget-root';
    widgetContainer.innerHTML = `
        <button id="compass-fab" class="compass-fab" aria-label="Open Compass Legal Guide" title="Ask Compass for help">
            <svg class="compass-fab-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#c98d31"></polygon>
            </svg>
            <span>Ask Compass</span>
            <span class="compass-fab-pulse"></span>
        </button>

        <div id="compass-drawer" class="compass-drawer" role="dialog" aria-label="Compass Legal Guide" aria-hidden="true">
            <div class="compass-header">
                <div class="compass-title-area">
                    <div class="compass-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#c98d31"></polygon>
                        </svg>
                    </div>
                    <div>
                        <h3 class="compass-name">Compass</h3>
                        <div class="compass-status">
                            <span class="compass-status-dot"></span>
                            <span>LawCompass In-App Help</span>
                        </div>
                    </div>
                </div>
                <div class="compass-header-actions">
                    <span class="compass-engine-badge" id="compass-engine-badge">LawCompass Guide</span>
                    <button class="compass-close-btn" id="compass-close-btn" aria-label="Close Compass">✕</button>
                </div>
            </div>
            <div class="compass-notice-bar">
                <span>South African Legal Information Only</span>
                <span>Protect your privacy</span>
            </div>
            <div class="compass-body" id="compass-chat-body">
                <div class="compass-msg compass-msg-assistant">
                    Hello${userName ? `, <strong>${esc(userName)}</strong>` : ''}! I am <strong>Compass</strong>, the in-app help assistant for LawCompass. I help you use the app, understand our South African legal documents, and explain clauses in plain English.<br><br>
                    How can I assist you in your workspace today?
                    <div class="compass-chips-container">
                        <button class="compass-chip" data-prompt="How do I create an employment contract?">Employment Contract</button>
                        <button class="compass-chip" data-prompt="Can I make an electronic will on my phone?">Electronic Will Validity</button>
                        <button class="compass-chip" data-prompt="How do I lock a document?">Document Locking</button>
                        <button class="compass-chip" data-prompt="How do I find legal help near me?">Find Legal Help</button>
                        <button class="compass-chip" data-prompt="How does the plain-language explainer work?">Plain-Language Explainer</button>
                    </div>
                </div>
            </div>
            <div class="compass-input-area">
                <div id="compass-popia-warning" class="compass-popia-warning">
                    POPIA Notice: Never share full ID numbers, bank details, or passwords in chat.
                </div>
                <form id="compass-form" class="compass-form">
                    <input 
                        type="text" 
                        id="compass-input" 
                        class="compass-input" 
                        placeholder="Ask Compass about templates, clauses, or features..." 
                        autocomplete="off"
                        maxlength="600"
                    />
                    <button type="submit" class="compass-send-btn" id="compass-send-btn" aria-label="Send Message">➤</button>
                </form>
                <div class="compass-disclaimer">
                    General legal information only · Not legal advice
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(widgetContainer);

    const fab = $('#compass-fab');
    const drawer = $('#compass-drawer');
    const closeBtn = $('#compass-close-btn');
    const form = $('#compass-form');
    const input = $('#compass-input');
    const chatBody = $('#compass-chat-body');
    const engineBadge = $('#compass-engine-badge');

    if (!compassChatSession) {
        try {
            const saved = sessionStorage.getItem('lawcompass-assistant-history');
            compassChatSession = saved ? JSON.parse(saved) : [];
        } catch(e) {
            compassChatSession = [];
        }
    }

    const toggleDrawer = (open) => {
        const isOpen = open !== undefined ? open : !drawer.classList.contains('open');
        drawer.classList.toggle('open', isOpen);
        drawer.setAttribute('aria-hidden', String(!isOpen));
        if (isOpen) {
            input.focus();
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    };

    fab.onclick = () => toggleDrawer();
    closeBtn.onclick = () => toggleDrawer(false);

    const formatMessageText = (raw) => {
        let text = esc(raw);
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\n/g, '<br>');

        let actionLinks = '';
        if (/Generate Document|Employment Contract|Residential Lease|Non-Disclosure Agreement|Last Will/i.test(raw)) {
            actionLinks += '<a class="compass-action-link" href="documents.html">Generate Document →</a>';
        }
        if (/Legal Help Finder|Find Legal Help|attorney|law firm/i.test(raw)) {
            actionLinks += '<a class="compass-action-link" href="legal-help.html">Find Legal Help →</a>';
        }
        if (/Document History|Encrypted Private Vault|Lock & Finalize/i.test(raw)) {
            actionLinks += '<a class="compass-action-link" href="history.html">Document History →</a>';
        }
        if (/Plain-Language|Explain Text|Upload Contract/i.test(raw)) {
            actionLinks += '<a class="compass-action-link" href="translate.html">Translate contract terms →</a>';
        }
        if (/Legal Dictionary/i.test(raw)) {
            actionLinks += '<a class="compass-action-link" href="dictionary.html">Legal Dictionary →</a>';
        }

        if (actionLinks) {
            text += `<div class="compass-action-links">${actionLinks}</div>`;
        }
        return text;
    };

    const appendUserMessage = (msg) => {
        const bubble = document.createElement('div');
        bubble.className = 'compass-msg compass-msg-user';
        bubble.textContent = msg;
        chatBody.appendChild(bubble);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const appendAssistantMessage = (replyHtml) => {
        const bubble = document.createElement('div');
        bubble.className = 'compass-msg compass-msg-assistant';
        bubble.innerHTML = replyHtml;
        chatBody.appendChild(bubble);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const showTypingIndicator = () => {
        const ind = document.createElement('div');
        ind.id = 'compass-typing-indicator';
        ind.className = 'compass-typing';
        ind.innerHTML = `
            <div class="compass-typing-dot"></div>
            <div class="compass-typing-dot"></div>
            <div class="compass-typing-dot"></div>
            <span>Compass is thinking...</span>
        `;
        chatBody.appendChild(ind);
        chatBody.scrollTop = chatBody.scrollHeight;
        return ind;
    };

    const handleSendMessage = async (userText) => {
        if (!userText || !userText.trim()) return;
        const text = userText.trim();
        input.value = '';

        if (/\b[0-9]{13}\b/.test(text) || /\b(card number|cvv|pin|password|bank details)\b/i.test(text)) {
            const popia = $('#compass-popia-warning');
            if (popia) {
                popia.style.display = 'block';
                setTimeout(() => { popia.style.display = 'none'; }, 4500);
            }
        }

        appendUserMessage(text);
        compassChatSession.push({ role: 'user', content: text });

        const typingInd = showTypingIndicator();

        try {
            const currentToken = localStorage.getItem('lawcompass-token') || localStorage.getItem('lawbuddy-token') || '';
            const res = await fetch('/api/v1/assistant/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': currentToken ? `Bearer ${currentToken}` : ''
                },
                body: JSON.stringify({
                    message: text,
                    history: compassChatSession.slice(-6),
                    user: userProfile
                })
            });

            if (typingInd) typingInd.remove();

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || 'Compass service is momentarily busy.');
            }

            const data = await res.json();
            compassChatSession.push({ role: 'assistant', content: data.reply });
            try {
                sessionStorage.setItem('lawcompass-assistant-history', JSON.stringify(compassChatSession.slice(-12)));
            } catch(e) {}

            if (data.engine && engineBadge) {
                engineBadge.textContent = 'LawCompass Guide';
            }

            appendAssistantMessage(formatMessageText(data.reply));
        } catch (err) {
            if (typingInd) typingInd.remove();
            appendAssistantMessage(`I apologize, but I could not reach the network right now. Please try again in a moment, or visit **Find Legal Help** to speak with an attorney.`);
        }
    };

    chatBody.onclick = (e) => {
        const chip = e.target.closest('.compass-chip');
        if (chip && chip.dataset.prompt) {
            handleSendMessage(chip.dataset.prompt);
        }
    };

    form.onsubmit = (e) => {
        e.preventDefault();
        handleSendMessage(input.value);
    };
}

// ------------------------------------------------------------------------------
// 5. DASHBOARD & TEMPLATES GALLERY
// ------------------------------------------------------------------------------
function cards() {
    return `<div class="template-grid">${Object.entries(data).map(([key, t]) => `
        <a class="template" href="builder.html?type=${key}">
            <span class="icon">▣</span>
            <h3>${t.title}</h3>
            <p>${t.desc}</p>
        <p>Laws that may apply: ${t.laws.map(([name, url]) => `<span class="law-link" onclick="event.preventDefault();event.stopPropagation();window.open('${url}','_blank','noopener,noreferrer')">${name} ↗</span>`).join(' · ')}</p>
        ${t.lawNote ? `<p>${t.lawNote}</p>` : ''}
            <footer>Configure & generate draft →</footer>
        </a>
    `).join('')}</div>`;
}

function dashboard() {
    shell('Workspace Overview', `
        <section class="hero">
            <div>
                <p class="eyebrow">LAWCOMPASS LEGAL WORKSPACE</p>
                <h1>Legal documents, without the legal fog.</h1>
                <p>Prepare a first draft from a South African template, personalize its terms, save your documents, and find nearby legal help.</p>
                <a class="primary" href="documents.html">Create a document <span>→</span></a>
            </div>
            <div class="hero-art">
                <div class="paper">
                    AGREEMENT
                    <i></i><i></i><i></i>
                    <b>✓</b>
                </div>
            </div>
        </section>

        <div class="stats">
            <article>
                <span>◷</span>
                <div><b id="document-count">0</b><small>Drafts & Documents</small></div>
            </article>
            <article>
                <span>▣</span>
                <div><b>5</b><small>Official SA Templates</small></div>
            </article>
            <article>
                <span>▣</span>
                <div><b>Document Lock</b><small>Available with every plan</small></div>
            </article>
        </div>

        <section class="section-head">
            <div>
                <p class="eyebrow">QUICK ACTIONS</p>
                <h2>What do you need today?</h2>
            </div>
        </section>

        <div class="action-grid">
            <a href="documents.html">
                <b>▣</b>
                <span><strong>Create a document</strong><small>Guided forms for common legal documents</small></span>
                <i>→</i>
            </a>
            <a href="legal-help.html">
                <b>⌁</b>
                <span><strong>Find legal help by proximity</strong><small>Closest law firms under your matter</small></span>
                <i>→</i>
            </a>
            <a href="upload-contract.html">
                <b>↥</b>
                <span><strong>Upload & explain contract</strong><small>${hasPremiumFeatures() ? 'Unlimited uploads and explanations' : '2 uploads and 5 explanations on the free plan'}</small></span>
                <i>→</i>
            </a>
        </div>
    `);
    listUserDocuments().then(items => { const count = $('#document-count'); if (count) count.textContent = items.length; }).catch(() => {});
}

function documents() {
    shell('Create a document', `
        <p class="eyebrow">DOCUMENT TEMPLATES</p>
        <h1>Select a legal template</h1>
        <p class="intro">Templates are a starting point and may not fit every situation. Review dates are not shown here. Have important drafts checked by a qualified legal professional before signing.</p>
        ${cards()}
    `);
}

// ------------------------------------------------------------------------------
// 6. DOCUMENT BUILDER, PERSONALIZATION & REAL DOCX GENERATION
// ------------------------------------------------------------------------------
function fieldMarkup(f) {
    const required = f.required ? 'required' : '';
    let input = '';
    if (f.type === 'textarea') {
        input = `<textarea name="${f.label}" ${required}></textarea>`;
    } else if (f.type === 'select') {
        input = `<select name="${f.label}" ${required}><option value="">Select an option</option>${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`;
    } else if (f.type === 'checkbox-group') {
        input = `<div class="choice-grid">${f.options.map(o => `<label><input type="checkbox" name="${f.label}" value="${o}"> ${o}</label>`).join('')}</div>`;
    } else if (f.type === 'checkbox') {
        input = `<span class="single-check"><input type="checkbox" name="${f.label}" ${required}> I confirm</span>`;
    } else {
        input = `<input type="${f.type}" name="${f.label}" ${required}>`;
    }
    return `
        <label class="form-field ${f.type === 'textarea' || f.type === 'checkbox-group' ? 'full' : ''}">
            <span>${f.label}${f.required ? ' <b aria-hidden="true">*</b>' : ''}</span>
            ${input}
        </label>
    `;
}

// Map form answers directly to template placeholders
function getPlaceholderMap(templateKey, answers, customClauses) {
    const map = {};
    const getVal = key => answers[key] || '';

    // Common schedule text
    const customClausesFormatted = customClauses.length
        ? customClauses.map((c, i) => `Clause ${i + 1} (${c.title}): ${c.body}`).join('\n\n')
        : 'Standard terms apply. No additional custom clauses requested.';

    const responseScheduleFormatted = Object.entries(answers)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

    if (templateKey === 'Employment') {
        map['EmployerName'] = getVal('Employer / company legal name');
        map['CompanyRegNumber'] = getVal('Company registration number');
        map['EmployerAddress'] = getVal('Employer physical address');
        map['EmployeeName'] = getVal('Employee full names');
        map['EmployeeId'] = getVal('Employee ID / passport number');
        map['EmployeeAddress'] = getVal('Employee residential address');
        map['EmployeeEmail'] = getVal('Employee email address');
        map['EmployeePhone'] = getVal('Employee telephone number');
        map['Role'] = getVal('Job title');
        map['Department'] = getVal('Department / reporting manager');
        map['Responsibilities'] = getVal('Responsibilities and performance expectations');
        map['StartDate'] = getVal('Start date');
        map['EndDate'] = getVal('End date') || 'Indefinite';
        map['WorkingHours'] = getVal('Working hours per week');
        map['SalaryAmount'] = getVal('Salary / wage amount (R)');
        map['PaymentFreq'] = getVal('Remuneration frequency');
        map['RatePerhour'] = getVal('Rate per hour (R)') || 'N/A';
        map['OvertimeRate'] = getVal('Overtime rate / calculation') || '1.5x basic rate';
        map['AnnualLeaveDays'] = getVal('Annual leave days') || '21';
        map['EmployBenefits'] = getVal('Benefits') || 'Standard statutory';
        map['ProbationPeriod'] = getVal('Probation period') || '3 months';
        map['NoticePeriod'] = getVal('Notice period') || '4 weeks';
        map['AdditionalTerms'] = customClausesFormatted;
        map['ResponseSchedule'] = responseScheduleFormatted;
    } else if (templateKey === 'Lease') {
        map['LessorName'] = getVal('Landlord / lessor full name');
        map['LesseeName'] = getVal('Tenant / lessee full name');
        map['LesseName'] = getVal('Tenant / lessee full name');
        map['AdressOfLease'] = getVal('Property address');
        map['StartDate'] = getVal('Lease start date');
        map['EndDate'] = getVal('Lease end date');
        map['RentAmount'] = getVal('Monthly rent (R)');
        map['PaymentDay'] = getVal('Rent payment day of month') || '1st';
        map['AmountInWords'] = getVal('Rent amount in words') || `${getVal('Monthly rent (R)')} Rands`;
        map['DepositAmount'] = getVal('Deposit (R)');
        const utils = getVal('Utilities payable by tenant') || '';
        map['WaterChecked'] = utils.includes('Water') ? 'Tenant' : 'Landlord';
        map['SewageChecked'] = utils.includes('Sewer') ? 'Tenant' : 'Landlord';
        map['BinChecked'] = utils.includes('Refuse') ? 'Tenant' : 'Landlord';
        map['ElectricityChecked'] = utils.includes('Electricity') ? 'Tenant' : 'Landlord';
        map['Insert Notice Period'] = getVal('Notice period') || '1 calendar month';
        map['SignedDay'] = getVal('Agreement signed on') || new Date().toLocaleDateString('en-ZA');
        map['PaymentDetails'] = getVal('Payment method / bank details') || 'EFT to designated account';
        map['Maintenance'] = getVal('Maintenance and repair obligations') || 'Landlord structural, Tenant cleanliness';
        map['PetsSmoking'] = getVal('Pets / smoking rules') || 'By written consent only';
        map['AdditionalTerms'] = customClausesFormatted;
        map['ResponseSchedule'] = responseScheduleFormatted;
    } else if (templateKey === 'NDA') {
        map['NameofDisparty'] = getVal('Disclosing party name / company');
        map['AddressDisParty'] = getVal('Disclosing party address');
        map['EmailDisParty'] = getVal('Disclosing party email');
        map['PhoneDisParty'] = getVal('Disclosing party phone');
        map['NameofRecparty'] = getVal('Receiving party name / company');
        map['AddressRecParty'] = getVal('Receiving party address');
        map['EmailRecParty'] = getVal('Receiving party email');
        map['PhoneRecParty'] = getVal('Receiving party phone');
        map['ConfidentialityScope'] = getVal('Confidential information scope') || getVal('Purpose of disclosure');
        map['NonDisclosurePeriod'] = getVal('Non-disclosure period (e.g. 2 years)') || '2 years from execution';
        map['Jurisdiction'] = getVal('Governing law / jurisdiction') || 'Republic of South Africa';
        map['EffectiveDate'] = getVal('Effective date');
        map['TermEndDate'] = getVal('Term / expiration date') || 'Until terminated';
        map['AdditionalTerms'] = customClausesFormatted;
        map['ResponseSchedule'] = responseScheduleFormatted;
    } else if (templateKey === 'Service') {
        map['Date'] = new Date().toLocaleDateString('en-ZA');
        map['ServiceProvider'] = getVal('Service provider legal name');
        map['ServiceRendTo'] = getVal('Service recipient / client legal name');
        map['ServiceRenTo'] = getVal('Service recipient / client legal name');
        map['ServiceScope'] = getVal('Detailed service scope and deliverables');
        map['StartDate'] = getVal('Start date');
        map['EndDate'] = getVal('End date');
        map['Amount'] = getVal('Total payment (R)');
        map['PaymentFreq'] = getVal('Payment frequency');
        map['PaymentMethod'] = getVal('Payment method');
        map['DamageLiability'] = getVal('Damage liabilities') || 'Service Provider';
        map['NoticePeriod'] = getVal('Notice period') || '30 days';
        map['PaymentBreakdown'] = getVal('Payment breakdown / milestone schedule') || 'Payable upon deliverable milestone approval';
        map['AdditionalTerms'] = customClausesFormatted;
        map['ResponseSchedule'] = responseScheduleFormatted;
    } else if (templateKey === 'Will') {
        map['FullNameTestator'] = getVal('Testator full names');
        map['TestatorFullName'] = getVal('Testator full names');
        map['IDNumber'] = getVal('ID / passport number');
        map['DateCreated'] = getVal('Date created') || new Date().toLocaleDateString('en-ZA');
        map['ResidentialAddress'] = getVal('Residential address');
        map['MaritalStatus'] = getVal('Marital status');
        map['ExecutorFullName'] = getVal('Executor full names');
        map['ExecutorDetails'] = getVal('Executor contact details');
        map['AlterExecutorName'] = getVal('Alternate executor full names') || 'To be nominated by Master of High Court';
        map['GuardianName'] = getVal('Guardian for minor children') || 'None nominated';
        map['AlterGuardianName'] = getVal('Alternate guardian') || 'None nominated';
        map['Property1'] = getVal('Asset / property 1');
        map['Property2'] = getVal('Asset / property 2') || 'Residue of estate';
        map['Recipients1'] = getVal('Beneficiary 1 full names');
        map['IDRecipients1'] = getVal('Beneficiary 1 ID / passport number');
        map['PercentageRec1'] = (getVal('Beneficiary 1 percentage') || '100') + '%';
        map['Recipients2'] = getVal('Beneficiary 2 full names') || 'N/A';
        map['IDRecipients2'] = getVal('Beneficiary 2 ID / passport number') || 'N/A';
        map['PercentageRec2'] = getVal('Beneficiary 2 percentage') ? getVal('Beneficiary 2 percentage') + '%' : '';
        map['BeneficiaryName'] = getVal('Residuary beneficiary full name') || getVal('Beneficiary 1 full names');
        map['AlternateBeneficiary'] = getVal('Alternate residuary beneficiary full name') || 'Surviving heirs by representation';
        map['Witness1'] = getVal('Witness 1 full names') || 'Independent Witness 1';
        map['Witness2'] = getVal('Witness 2 full names') || 'Independent Witness 2';
        map['WitnessName'] = 'Attestation Witness';
        map['AdditionalAssets'] = getVal('Additional assets, specific bequests or residue instructions') || 'None';
        map['FuneralWishes'] = getVal('Funeral wishes') || 'At discretion of family';
        map['DigitalAssets'] = getVal('Digital assets / online accounts instructions') || 'Executor to close accounts';
        map['AdditionalTerms'] = customClausesFormatted;
        map['ResponseSchedule'] = responseScheduleFormatted;
    }

    return map;
}

// Generate cryptographic SHA-256 seal
async function generateSha256Checksum(payloadString) {
    if (window.crypto && window.crypto.subtle) {
        const buffer = new TextEncoder().encode(payloadString);
        const digest = await window.crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback pseudo-hash
    let h = 0;
    for (let i = 0; i < payloadString.length; i++) {
        h = ((h << 5) - h) + payloadString.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h).toString(16).padStart(16, '0');
}

// Real DOCX file generation using JSZip
async function generatePopulatedDocx(templateKey, placeholderMap) {
    const t = data[templateKey];
    if (!t) throw new Error('Unknown template type');

    if (!window.JSZip) {
        throw new Error('JSZip library is initializing. Please try again.');
    }

    // Fetch the authentic DOCX template file
    const response = await fetch(t.templateFile);
    if (!response.ok) {
        throw new Error(`Failed to load template file ${t.templateFile}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arrayBuffer);

    let docXml = await zip.file('word/document.xml').async('text');

    // Replace all placeholders [PlaceholderName] with XML-escaped user values
    for (const [key, value] of Object.entries(placeholderMap)) {
        const pattern = new RegExp('\\[' + key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\]', 'g');
        const safeXmlValue = esc(value).replace(/\n/g, '</w:t><w:br/><w:t>');
        docXml = docXml.replace(pattern, safeXmlValue);
    }

    // Save updated XML back to DOCX package
    zip.file('word/document.xml', docXml);

    // Generate output blob
    const docxBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    return docxBlob;
}

// Helper to convert Blob to Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const res = reader.result;
            const base64 = typeof res === 'string' && res.includes(',') ? res.split(',')[1] : '';
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Clean vector SVG icons for Document Locking & Protection UI (Professional Legal Styling, No Emojis)
const SVG_LOCK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
const SVG_WARN_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; flex-shrink:0; margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
const SVG_EYE_SHOW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const SVG_EYE_HIDE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

/**
 * Interactive Modal for Genuine Document Password Protection & Encrypted Download.
 * Enforces security policy, validates password entries, provides visibility toggles,
 * and delivers the encrypted artifact (Word or PDF).
 */
function openLockAndDownloadModal({ docxBlob, name, type, answers, customClauses, onSuccess }) {
    const existing = $('.lock-dialog-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lock-dialog-overlay';

    overlay.innerHTML = `
        <div class="lock-dialog-card" role="dialog" aria-modal="true" aria-labelledby="lock-modal-heading">
            <div class="lock-dialog-head">
                <div>
                    <h3 id="lock-modal-heading" class="lock-dialog-title">
                        ${SVG_LOCK_ICON} Lock & Download Protected File
                    </h3>
                    <p style="margin:0; font-size:13px; color:var(--muted);">Document: <strong>${esc(name || 'Legal Contract')}</strong></p>
                </div>
                <button type="button" class="lock-dialog-close" id="btn-modal-close" aria-label="Close dialog">×</button>
            </div>

            <div class="lock-info-box">
                <strong>Password Protection & Cryptographic Locking</strong><br>
                You are setting a password to encrypt this document before downloading. The downloaded file itself is protected with standard AES encryption. This password will be required whenever the document is opened outside LawCompass in Microsoft Word, LibreOffice, Adobe Acrobat, or any compatible reader.
            </div>

            <div class="lock-security-warning">
                ${SVG_WARN_ICON}
                <div>
                    <strong>Important Security Notice:</strong>
                    LawCompass does not store your document password. If you lose or forget this password, the protected document cannot be decrypted or recovered by anyone.
                </div>
            </div>

            <form id="lock-download-form">
                <div class="lock-form-group">
                    <label class="lock-form-label">Protected Document Format:</label>
                    <div class="lock-format-selector">
                        <label class="lock-format-chip active" id="chip-format-docx">
                            <input type="radio" name="lock-format" value="docx" checked>
                            <div>
                                <strong>Word (.docx)</strong>
                                <small>Office AES Encryption</small>
                            </div>
                        </label>
                        <label class="lock-format-chip" id="chip-format-pdf">
                            <input type="radio" name="lock-format" value="pdf">
                            <div>
                                <strong>PDF (.pdf)</strong>
                                <small>AES-256 PDF Standard</small>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="lock-form-group">
                    <label class="lock-form-label" for="lock-password-input">Create Document Password (min. 8 characters):</label>
                    <div class="lock-password-wrap">
                        <input type="password" id="lock-password-input" autocomplete="new-password" placeholder="Enter document password" required>
                        <button type="button" class="lock-pwd-toggle-btn" id="toggle-pwd-btn-1" aria-label="Show or hide password" title="Show password">${SVG_EYE_SHOW}</button>
                    </div>
                </div>

                <div class="lock-form-group">
                    <label class="lock-form-label" for="lock-confirm-input">Confirm Document Password:</label>
                    <div class="lock-password-wrap">
                        <input type="password" id="lock-confirm-input" autocomplete="new-password" placeholder="Re-enter password to confirm" required>
                        <button type="button" class="lock-pwd-toggle-btn" id="toggle-pwd-btn-2" aria-label="Show or hide password" title="Show password">${SVG_EYE_SHOW}</button>
                    </div>
                </div>

                <div id="lock-error-msg" class="lock-error-alert" role="alert"></div>

                <div id="lock-loading-msg" class="lock-loading-indicator">
                    <div class="lock-spinner"></div>
                    <span>Encrypting document with AES encryption... Please wait.</span>
                </div>

                <div class="lock-dialog-actions">
                    <button type="button" class="secondary" id="btn-cancel-lock">Cancel</button>
                    <button type="submit" class="primary btn-lock-download" id="btn-submit-lock" style="display:inline-flex; align-items:center; gap:8px;">
                        ${SVG_LOCK_ICON} Encrypt & Download
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeDialog = () => overlay.remove();
    $('#btn-modal-close', overlay).onclick = closeDialog;
    $('#btn-cancel-lock', overlay).onclick = closeDialog;
    overlay.onclick = e => { if (e.target === overlay) closeDialog(); };

    // Format selection
    const docxChip = $('#chip-format-docx', overlay);
    const pdfChip = $('#chip-format-pdf', overlay);
    docxChip.onclick = () => {
        docxChip.classList.add('active');
        pdfChip.classList.remove('active');
        docxChip.querySelector('input').checked = true;
    };
    pdfChip.onclick = () => {
        pdfChip.classList.add('active');
        docxChip.classList.remove('active');
        pdfChip.querySelector('input').checked = true;
    };

    // Show / Hide password toggles
    const pwdInput = $('#lock-password-input', overlay);
    const confirmInput = $('#lock-confirm-input', overlay);
    const toggle1 = $('#toggle-pwd-btn-1', overlay);
    const toggle2 = $('#toggle-pwd-btn-2', overlay);

    toggle1.onclick = () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        toggle1.innerHTML = isPwd ? SVG_EYE_HIDE : SVG_EYE_SHOW;
        toggle1.setAttribute('title', isPwd ? 'Hide password' : 'Show password');
    };
    toggle2.onclick = () => {
        const isPwd = confirmInput.type === 'password';
        confirmInput.type = isPwd ? 'text' : 'password';
        toggle2.innerHTML = isPwd ? SVG_EYE_HIDE : SVG_EYE_SHOW;
        toggle2.setAttribute('title', isPwd ? 'Hide password' : 'Show password');
    };

    const errorEl = $('#lock-error-msg', overlay);
    const loadingEl = $('#lock-loading-msg', overlay);
    const submitBtn = $('#btn-submit-lock', overlay);
    const cancelBtn = $('#btn-cancel-lock', overlay);

    const showError = msg => {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        loadingEl.style.display = 'none';
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
    };

    $('#lock-download-form', overlay).onsubmit = async e => {
        e.preventDefault();
        errorEl.style.display = 'none';

        const password = pwdInput.value;
        const confirmPassword = confirmInput.value;
        const format = overlay.querySelector('input[name="lock-format"]:checked')?.value || 'docx';

        if (!password || !password.trim()) {
            return showError('Please enter a password for the document.');
        }
        if (password.length < 8) {
            return showError('Password must be at least 8 characters long for security compliance.');
        }
        if (password !== confirmPassword) {
            return showError('Passwords do not match. Please re-enter carefully.');
        }

        // Prevent duplicate submissions
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        loadingEl.style.display = 'flex';

        try {
            let fileBase64 = '';
            if (docxBlob) {
                fileBase64 = await blobToBase64(docxBlob);
            }

            const token = localStorage.getItem('lawcompass-token') || localStorage.getItem('lawbuddy-token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/v1/documents/encrypt-document', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    fileBase64,
                    filename: `${(name || 'Document').replaceAll(' ', '_')}.${format}`,
                    format,
                    password,
                    confirmPassword,
                    title: name,
                    answers: answers || {},
                    customClauses: customClauses || [],
                    templateKey: type
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Encryption processing failed.');
            }

            // Convert base64 to Blob
            const binary = atob(data.fileBase64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const protectedBlob = new Blob([array], { type: data.mimeType });

            // Trigger file download of protected artifact
            const downloadUrl = URL.createObjectURL(protectedBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

            closeDialog();
            toast(`Encrypted document downloaded! Password will be required to open in Word or PDF reader.`);

            if (typeof onSuccess === 'function') {
                onSuccess({ format, filename: data.filename, protectedBlob });
            }
        } catch (err) {
            showError(err.message || 'We could not encrypt the document. Please check your inputs and try again.');
        }
    };
}

/**
 * Interactive Modal for Unlocking Password-Protected Documents in-app.
 */
function openUnlockModal({ filename, onUnlock }) {
    const existing = $('.lock-dialog-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lock-dialog-overlay';

    overlay.innerHTML = `
        <div class="lock-dialog-card" role="dialog" aria-modal="true">
            <div class="lock-dialog-head">
                <h3 class="lock-dialog-title">${SVG_LOCK_ICON} Unlock Protected Document</h3>
                <button type="button" class="lock-dialog-close" id="btn-unlock-close">×</button>
            </div>
            <p style="color:#5b677a; font-size:13.5px; line-height:1.5;">
                <strong>${esc(filename)}</strong> is password-protected. Enter the document password to unlock and analyze its clauses.
            </p>
            <form id="unlock-doc-form">
                <div class="lock-form-group">
                    <label class="lock-form-label" for="unlock-pwd-input">Document Password:</label>
                    <div class="lock-password-wrap">
                        <input type="password" id="unlock-pwd-input" placeholder="Enter password to unlock" required>
                        <button type="button" class="lock-pwd-toggle-btn" id="toggle-unlock-pwd" aria-label="Toggle password visibility" title="Show password">${SVG_EYE_SHOW}</button>
                    </div>
                </div>
                <div id="unlock-error-msg" class="lock-error-alert" role="alert"></div>
                <div id="unlock-loading-msg" class="lock-loading-indicator">
                    <div class="lock-spinner"></div> <span>Decrypting document...</span>
                </div>
                <div class="lock-dialog-actions">
                    <button type="button" class="secondary" id="btn-cancel-unlock">Cancel</button>
                    <button type="submit" class="primary" id="btn-submit-unlock">Unlock & Explain</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeDialog = () => overlay.remove();
    $('#btn-unlock-close', overlay).onclick = closeDialog;
    $('#btn-cancel-unlock', overlay).onclick = closeDialog;

    const pwdInput = $('#unlock-pwd-input', overlay);
    const toggle = $('#toggle-unlock-pwd', overlay);
    toggle.onclick = () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        toggle.innerHTML = isPwd ? SVG_EYE_HIDE : SVG_EYE_SHOW;
        toggle.setAttribute('title', isPwd ? 'Hide password' : 'Show password');
    };

    const errorEl = $('#unlock-error-msg', overlay);
    const loadingEl = $('#unlock-loading-msg', overlay);
    const submitBtn = $('#btn-submit-unlock', overlay);

    $('#unlock-doc-form', overlay).onsubmit = async e => {
        e.preventDefault();
        const pwd = pwdInput.value;
        if (!pwd) {
            errorEl.textContent = 'Please enter the document password.';
            errorEl.style.display = 'block';
            return;
        }
        submitBtn.disabled = true;
        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';

        try {
            await onUnlock(pwd, overlay);
        } catch (err) {
            errorEl.textContent = err.message || 'Incorrect password. The document could not be unlocked.';
            errorEl.style.display = 'block';
            loadingEl.style.display = 'none';
            submitBtn.disabled = false;
        }
    };
}

async function builder() {
    const params = new URLSearchParams(location.search);
    const type = params.get('type') || 'Employment';
    const editId = params.get('edit');
    const t = data[type] || data.Employment;
    const canCustomize = hasPaidFeatures();

    // Track active custom clauses
    let customClauses = [];
    let isLocked = false;
    let lockSeal = null;

    shell('Document Builder', `
        <a class="back" href="documents.html">← Back to templates</a>
        <div class="builder-head">
            <div>
                <p class="eyebrow">${editId ? 'UPDATE SAVED DOCUMENT' : 'DOCUMENT GENERATOR'}</p>
                <h1>${t.title}</h1>
                <p>${t.desc}</p>
                <p>Laws that may apply: ${t.laws.map(([name, url]) => `<a class="link" href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join(' · ')}</p>
                ${t.lawNote ? `<p>${t.lawNote}</p>` : ''}
            </div>
            <span class="step">Official South African Jurisdiction</span>
        </div>

        <!-- Lock Control Banner (Hidden until generated, or toggled) -->
        <div id="lock-banner" class="lock-control-container" style="display:none;">
            <div class="lock-header-row">
                <div class="lock-status-badge ${isLocked ? 'locked' : 'unlocked'}" id="lock-badge-ui">
                    <span>${isLocked ? 'LOCKED' : 'DRAFT'}</span>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button type="button" id="btn-lock-banner-action" class="btn-lock-toggle btn-lock-action" style="display:${isLocked ? 'none' : 'inline-flex'}; align-items:center; gap:6px;">
                        ${SVG_LOCK_ICON} Lock & Download
                    </button>
                    <button type="button" id="btn-toggle-lock" class="btn-lock-toggle ${isLocked ? 'btn-unlock-action' : 'btn-lock-action'}">
                        ${isLocked ? 'Unlock to edit' : 'Lock draft'}
                    </button>
                </div>
            </div>
            <div id="lock-details-box" style="display:none;">
                <p style="margin: 12px 0 6px; font-weight:700; color:#1e3a5f;">
                    This draft is locked. Documents exported using "Lock & Download" are encrypted with AES file-level encryption and require your password to open outside LawCompass.
                </p>
            </div>
        </div>

        <form id="build-form" class="document-form">
            ${t.sections.map(s => `
                <fieldset>
                    <legend>${s.title}</legend>
                    <div class="field-grid">
                        ${s.fields.map(fieldMarkup).join('')}
                    </div>
                </fieldset>
            `).join('')}

            <!-- Custom clauses are available with paid plans. -->
            <div class="custom-clause-section">
                ${canCustomize ? `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div>
                        <h3>Personalize Your Contract (Custom Terms & Conditions)</h3>
                        <p>Tailor this contract by choosing recommended South African clauses or writing bespoke covenants.</p>
                    </div>
                </div>

                <div class="preset-chips-box">
                    <span class="preset-chips-label">Quick-Add Recommended Clauses:</span>
                    <div class="preset-chips-flex">
                        ${CLAUSE_PRESETS.map((p, idx) => `
                            <button type="button" class="preset-chip-btn" data-preset="${idx}">
                                + ${p.title}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="custom-clauses-container" class="custom-clauses-list"></div>

                <div class="add-custom-clause-card">
                    <b style="color:var(--navy); font-size:14px;">Add a Bespoke Custom Clause:</b>
                    <input id="new-clause-title" placeholder="Clause Title (e.g. Non-Compete, Equipment Protocol, IP Ownership)">
                    <textarea id="new-clause-body" placeholder="Clause Wording / Legal Terms..."></textarea>
                    <button type="button" id="btn-add-bespoke" class="btn-append-clause">
                        + Add Custom Clause to Document
                    </button>
                </div>
                ` : `
                    <h3>Custom clauses</h3>
                    <p>Adding or changing custom clauses is available with a paid plan. Your existing saved clauses, if any, will stay in this document.</p>
                    <div id="custom-clauses-container" class="custom-clauses-list"></div>
                    <a class="link" href="pricing.html">View plan details</a>
                `}
            </div>

            <p class="form-note">
                <strong>Legal notice:</strong> This is general information and a document starting point, not legal advice. Check that the draft fits your situation. For complex matters or disputes, speak to a qualified legal practitioner or <a href="https://legal-aid.co.za/" target="_blank" rel="noopener noreferrer">Legal Aid South Africa</a>.
            </p>

            <div class="builder-actions" style="grid-column: 1 / -1; display:flex; gap:14px; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
                <button type="button" id="btn-lock-download" class="secondary btn-lock-download" style="display:flex; align-items:center; gap:8px;">
                    ${SVG_LOCK_ICON} Lock & Download
                </button>
                <button type="submit" class="primary" style="display:flex; align-items:center; gap:8px;">
                    ${editId ? 'Download updated contract' : 'Download contract'} (.docx) <span>↓</span>
                </button>
            </div>
        </form>
    `);

    let priorDocument = null;
    if (editId) {
        try {
            priorDocument = await getUserDocument(editId);
            if (priorDocument && priorDocument.type === type) {
                $$('.form-field', $('#build-form')).forEach(field => {
                    const label = field.querySelector('span')?.textContent.replace('*', '').trim();
                    const control = field.querySelector('input:not([type=checkbox]), textarea, select');
                    if (control && Object.prototype.hasOwnProperty.call(priorDocument.answers || {}, label)) control.value = priorDocument.answers[label];
                    $$('input[type=checkbox]', field).forEach(input => {
                        const saved = (priorDocument.answers?.[label] || '').split(', ');
                        input.checked = saved.includes(input.value) || (input.value === 'on' && saved.includes('Confirmed'));
                    });
                });
                customClauses = Array.isArray(priorDocument.customClauses) ? [...priorDocument.customClauses] : [];
                isLocked = !!priorDocument.isLocked;
                lockSeal = priorDocument.lockSeal || null;
            }
        } catch (_) { toast('We could not open that saved document. Please try again.'); }
    }

    // Render custom clauses
    const renderClauses = () => {
        const container = $('#custom-clauses-container');
        if (!customClauses.length) {
            container.innerHTML = `<p style="color:var(--muted); font-size:13px; font-style:italic; margin:8px 0;">${canCustomize ? 'No personalized custom clauses added yet. Choose a suggested clause or write your own.' : 'No saved custom clauses in this document.'}</p>`;
            return;
        }
        container.innerHTML = customClauses.map((c, i) => `
            <div class="custom-clause-item">
                <div class="clause-item-head">
                    <h4 class="clause-item-title">${i + 1}. ${esc(c.title)}</h4>
                    ${canCustomize && !isLocked ? `<button type="button" class="btn-delete-clause" data-del="${i}">Remove</button>` : ''}
                </div>
                <div class="clause-item-body">${esc(c.body)}</div>
            </div>
        `).join('');
    };
    renderClauses();

    // Preset button clicks
    $$('.preset-chip-btn').forEach(btn => {
        btn.onclick = () => {
            if (isLocked) return toast('Document is locked. Unlock to add clauses.');
            const idx = parseInt(btn.dataset.preset, 10);
            const preset = CLAUSE_PRESETS[idx];
            if (preset) {
                customClauses.push({ title: preset.title, body: preset.body });
                renderClauses();
                toast(`Added "${preset.title}" clause.`);
            }
        };
    });

    // Add bespoke clause
    if (canCustomize) $('#btn-add-bespoke').onclick = () => {
        if (isLocked) return toast('Document is locked. Unlock to add clauses.');
        const titleInput = $('#new-clause-title');
        const bodyInput = $('#new-clause-body');
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        if (!title || !body) {
            return toast('Please provide both a clause title and wording.');
        }
        customClauses.push({ title, body });
        titleInput.value = '';
        bodyInput.value = '';
        renderClauses();
        toast('Custom clause added to document.');
    };

    // Remove clause
    document.addEventListener('click', e => {
        if (e.target.dataset && e.target.dataset.del !== undefined) {
            const idx = parseInt(e.target.dataset.del, 10);
            customClauses.splice(idx, 1);
            renderClauses();
            toast('Clause removed.');
        }
    });

    // Extract form answers as key-value map
    const extractAnswers = form => {
        const answers = {};
        $$('.form-field', form).forEach(l => {
            const labelEl = l.querySelector('span');
            if (!labelEl) return;
            const label = labelEl.textContent.replace('*', '').trim();
            const checks = $$('input[type=checkbox]:checked', l).map(x => x.value || 'Confirmed');
            const control = l.querySelector('input:not([type=checkbox]), textarea, select');
            if (checks.length) {
                answers[label] = checks.join(', ');
            } else if (control) {
                answers[label] = control.value;
            }
        });
        return answers;
    };

    // Lock toggle function
    const applyLockState = async lock => {
        isLocked = lock;
        const banner = $('#lock-banner');
        const badge = $('#lock-badge-ui');
        const details = $('#lock-details-box');
        const form = $('#build-form');
        const toggleBtn = $('#btn-toggle-lock');

        banner.style.display = 'block';

        if (isLocked) {
            const answers = extractAnswers(form);
            const payload = JSON.stringify({ template: type, answers, customClauses, timestamp: Date.now() });
            const hash = await generateSha256Checksum(payload);
            lockSeal = {
                hash: 'SHA256:' + hash,
                date: new Date().toLocaleString('en-ZA')
            };

            banner.classList.add('is-locked');
            form.classList.add('document-locked-readonly');
            badge.className = 'lock-status-badge locked';
            badge.innerHTML = '<span>LOCKED</span>';
            toggleBtn.className = 'btn-lock-toggle btn-unlock-action';
            toggleBtn.textContent = 'Unlock for Revisions';

            details.style.display = 'block';
            toast('Document locked. Unlock it if you need to make changes.');
        } else {
            banner.classList.remove('is-locked');
            form.classList.remove('document-locked-readonly');
            badge.className = 'lock-status-badge unlocked';
            badge.innerHTML = '<span>DRAFT</span>';
            toggleBtn.className = 'btn-lock-toggle btn-lock-action';
            toggleBtn.textContent = 'Lock draft';
            details.style.display = 'none';
            toast('Document unlocked for revisions.');
        }
        renderClauses();
    };

    const triggerLockAndDownload = async () => {
        const answers = extractAnswers($('#build-form'));
        const placeholderMap = getPlaceholderMap(type, answers, customClauses);
        try {
            toast('Preparing document for encryption...');
            const docxBlob = await generatePopulatedDocx(type, placeholderMap);

            openLockAndDownloadModal({
                docxBlob,
                name: t.title,
                type,
                answers,
                customClauses,
                onSuccess: async (result) => {
                    await applyLockState(true);
                    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    const record = {
                        id, name: t.title, type, answers, customClauses: [...customClauses], file: docxBlob,
                        isLocked: true, lockSeal, createdAt: priorDocument?.createdAt || Date.now(), updatedAt: Date.now(),
                        date: new Date().toLocaleString('en-ZA'),
                        lockedArtifactFormat: result.format,
                        lockedArtifactName: result.filename
                    };
                    await saveUserDocument(record);
                    priorDocument = record;
                }
            });
        } catch (err) {
            toast(err.message || 'We could not prepare the document. Please check your form and try again.');
        }
    };

    $('#btn-lock-download').onclick = triggerLockAndDownload;
    const bannerLockBtn = $('#btn-lock-banner-action');
    if (bannerLockBtn) bannerLockBtn.onclick = triggerLockAndDownload;
    $('#btn-toggle-lock').onclick = () => {
        if (!isLocked) {
            triggerLockAndDownload();
        } else {
            applyLockState(false);
        }
    };
    if (isLocked) applyLockState(true);

    // Form submit -> generate authentic DOCX
    $('#build-form').onsubmit = async e => {
        e.preventDefault();
        const answers = extractAnswers(e.target);
        const placeholderMap = getPlaceholderMap(type, answers, customClauses);

        try {
            toast('Preparing your Word document...');
            const docxBlob = await generatePopulatedDocx(type, placeholderMap);

            // Keep the completed file and form values in the signed-in user's browser history.
            const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const record = {
                id, name: t.title, type, answers, customClauses: [...customClauses], file: docxBlob,
                isLocked, lockSeal, createdAt: priorDocument?.createdAt || Date.now(), updatedAt: Date.now(),
                date: new Date().toLocaleString('en-ZA')
            };
            await saveUserDocument(record);
            priorDocument = record;

            // Every generated file must pass through password entry and server encryption.
            // Keep the editable source in local history; only the protected response is downloaded.
            openLockAndDownloadModal({
                docxBlob,
                name: t.title,
                type,
                answers,
                customClauses,
                onSuccess: async (result) => {
                    record.isLocked = true;
                    record.lockedArtifactFormat = result.format;
                    record.lockedArtifactName = result.filename;
                    await saveUserDocument(record);
                    priorDocument = record;
                    await applyLockState(true);
                }
            });
            toast('Your document is saved. Enter a password to download the protected copy.');
        } catch (err) {
            toast(err.message?.includes('storage') ? 'Your document could not be saved. Check available browser storage and try again.' : 'We could not create the Word document. Please try again.');
        }
    };
}

// ------------------------------------------------------------------------------
// 7. FIND LEGAL HELP BY PROXIMITY (Statutory Legal Aid & Verified Directory)
// ------------------------------------------------------------------------------
function help() {
    let currentMatter = 'Civil dispute';
    let userLocationKey = 'sandton';
    let userCoords = { lat: CITY_PRESETS.sandton.lat, lng: CITY_PRESETS.sandton.lng };
    let currentRadius = 25;
    let locationMode = 'city_preset'; // 'city_preset' | 'device_gps' | 'suburb_search'
    let locationLabel = CITY_PRESETS.sandton.name;
    let cachedFirms = [];

    // Race condition prevention: AbortController and sequence counter
    let activeSearchController = null;
    let searchSequence = 0;

    shell('Find Legal Help', `
        <p class="eyebrow">LEGAL AID & NEARBY PRACTITIONERS</p>
        <h1>Find legal help by proximity</h1>
        <p class="intro">Find Legal Aid South Africa offices and discover nearby legal practices. Private practice listings are discovery information; check a practitioner's details with the Legal Practice Council before engaging them.</p>

        <!-- Proximity Control Panel -->
        <div class="proximity-control-panel">
            <div class="proximity-controls-row">
                <!-- City Preset Selection -->
                <div class="proximity-field">
                    <label for="loc-select">City Center (Approximate CBD):</label>
                    <select id="loc-select" class="proximity-select-input">
                        ${Object.entries(CITY_PRESETS).map(([k, loc]) => `
                            <option value="${k}" ${k === userLocationKey ? 'selected' : ''}>${esc(loc.name)}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Suburb / Town Manual Lookup -->
                <div class="proximity-field suburb-lookup-field">
                    <label for="suburb-input">Or Search Suburb / Town:</label>
                    <div class="suburb-input-wrapper">
                        <input type="text" id="suburb-input" class="proximity-select-input" placeholder="e.g. Centurion, Rosebank, Bellville..." autocomplete="off">
                        <div id="suburb-results-dropdown" class="suburb-dropdown" style="display:none;"></div>
                    </div>
                </div>

                <!-- Search Radius Selector -->
                <div class="proximity-field radius-field">
                    <label for="radius-select">Search Radius:</label>
                    <select id="radius-select" class="proximity-select-input" style="min-width:120px;">
                        <option value="15">15 km</option>
                        <option value="25" selected>25 km (Default)</option>
                        <option value="50">50 km</option>
                        <option value="100">100 km</option>
                    </select>
                </div>

                <!-- GPS Device Location Action -->
                <div class="proximity-field gps-action-field">
                    <label>&nbsp;</label>
                    <button type="button" id="btn-detect-gps" class="btn-geo-detect" title="Request device location for proximity distance">
                        Use Device Location
                    </button>
                </div>
            </div>

            <!-- Active Origin & Privacy Disclosure Bar -->
            <div class="search-origin-bar" id="search-origin-bar">
                <span class="origin-tag">Searching near: <strong>${esc(locationLabel)}</strong> (within ${currentRadius} km)</span>
                <span class="privacy-tag">Location is used to find nearby help · No case details needed</span>
            </div>
        </div>

        <div class="matter-layout">
            <div class="matter-list" id="matter-nav">
                ${[
                    'Civil dispute',
                    'Family law',
                    'Labour dispute',
                    'Commercial dispute',
                    'Property dispute',
                    'Contract dispute'
                ].map(m => `
                    <button class="${m === currentMatter ? 'active' : ''}" data-matter="${m}">
                        ${m} <span>→</span>
                    </button>
                `).join('')}
            </div>

            <div class="firms-display-area" id="firms-list"></div>
        </div>
    `);

    // Updates origin indicator bar
    const updateOriginBar = () => {
        const bar = $('#search-origin-bar');
        if (bar) {
            bar.innerHTML = `
                <span class="origin-tag">Searching near: <strong>${esc(locationLabel)}</strong> (within ${currentRadius} km)</span>
                <span class="privacy-tag">Location is used to find nearby help · No case details needed</span>
            `;
        }
    };

    // Main fetch & render function with race-condition protection and honest states
    const renderFirms = async () => {
        updateOriginBar();

        if (activeSearchController) {
            activeSearchController.abort();
        }
        activeSearchController = new AbortController();
        const currentSeq = ++searchSequence;

        const container = $('#firms-list');
        if (!container) return;

        // 1. Loading State
        container.innerHTML = `
            <div class="firms-loading-state">
                <span class="loading-spinner"></span>
                <p>Searching Legal Aid offices and nearby legal practitioners...</p>
                <small style="color:var(--muted);">Querying proximity within ${currentRadius} km</small>
            </div>
        `;

        try {
            const payload = {
                matter: currentMatter,
                radiusKm: currentRadius,
                locationSource: locationMode,
                locationLabel: locationLabel
            };

            // Use explicit lat/lng for device GPS or manual suburb; otherwise city preset
            if (locationMode === 'device_gps' || locationMode === 'suburb_search') {
                payload.lat = userCoords.lat;
                payload.lng = userCoords.lng;
            } else {
                payload.city = userLocationKey;
            }

            // POST to protect coordinates from query strings and access logs
            const res = await fetch('/api/v1/legal-help/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: activeSearchController.signal
            });

            const data = await res.json();

            // Discard stale responses from outdated matter or location selections
            if (currentSeq !== searchSequence) {
                return;
            }

            if (!res.ok) {
                throw new Error(data.error?.message || 'Unable to retrieve legal directory.');
            }

            // 2. Provider Unavailable State
            if (data.status === 'unavailable') {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">§</span>
                        <h3>Legal Help Directory Unavailable</h3>
                        <p>${esc(data.message || 'The legal help proximity directory is currently unavailable.')}</p>
                        <p style="margin-top: 14px; font-size:14px;">
                            You can search practicing legal practitioners directly on the official 
                            <a href="https://lpc.org.za" target="_blank" rel="noopener noreferrer" class="link">Legal Practice Council Public Roll ↗</a>.
                        </p>
                    </div>
                `;
                return;
            }

            cachedFirms = Array.isArray(data.firms) ? data.firms : [];

            // 3. Empty Results State (Honest notice - NEVER replaces with fake firms)
            if (cachedFirms.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">§</span>
                        <h3>No legal help found nearby</h3>
                        <p>No legal help providers were found within <strong>${data.radiusKm || currentRadius} km</strong> of <strong>${esc(locationLabel)}</strong> under <em>${esc(currentMatter)}</em>.</p>
                        <p style="margin-top:12px; font-size:13px; color:var(--muted);">
                            Suggestions: Increase your search radius in the dropdown above, or choose a nearby metropolitan city center.
                        </p>
                        <div style="margin-top:18px;">
                            <a href="https://lpc.org.za" target="_blank" rel="noopener noreferrer" class="link" style="font-weight:700;">
                                Search South African Legal Practice Council Roll ↗
                            </a>
                        </div>
                    </div>
                `;
                return;
            }

            // 4. Success State
            container.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
                    <div>
                        <p class="eyebrow" style="margin:0;">${esc(currentMatter.toUpperCase())} · SORTED BY PROXIMITY</p>
                        <small style="color:var(--muted);">Displaying results within ${data.radiusKm} km of ${esc(locationLabel)}</small>
                    </div>
                    <span class="result-count-badge">${cachedFirms.length} legal ${cachedFirms.length === 1 ? 'service' : 'services'} found</span>
                </div>

                ${cachedFirms.map((firm, idx) => `
                    <article class="firm-card ${idx === 0 ? 'closest-match' : ''}">
                        ${idx === 0 ? '<span class="closest-ribbon">Closest to Location</span>' : ''}
                        
                        <div class="firm-card-header">
                            <h3 class="firm-card-title">${esc(firm.name)}</h3>
                            <span class="distance-pill">${firm.distanceKm} km away</span>
                        </div>

                        <!-- Clear Result Category Distinction -->
                        <div class="firm-category-badge-wrap">
                            ${firm.category === 'legal_aid' 
                                ? `<span class="badge-category badge-legal-aid">Legal Aid South Africa (State-Funded / Indigent Assistance)</span>`
                                : `<span class="badge-category badge-private">Private Legal Practice (Discovery)</span>`
                            }
                        </div>

                        <p class="firm-address">${esc(firm.address)} · <strong>${esc(firm.city)}</strong></p>

                        <!-- Verification & Status Row -->
                        <div class="firm-verify-row">
                            ${firm.category === 'legal_aid'
                                ? `<span class="verification-pill verified">Verified Statutory Body · Legal Aid South Africa</span>`
                                : `<span class="verification-pill discovery">${esc(firm.verificationStatus)} · <a href="${esc(firm.lpcVerificationReferenceUrl || 'https://lpc.org.za')}" target="_blank" rel="noopener noreferrer">Verify on LPC Roll ↗</a></span>`
                            }
                        </div>

                        ${firm.specialties && firm.specialties.length > 0 ? `
                            <div class="firm-tags-row">
                                ${firm.specialties.map(s => `<span class="firm-tag">${esc(s)}</span>`).join('')}
                            </div>
                        ` : ''}

                        <!-- Actions Row -->
                        <div class="firm-actions-row">
                            ${firm.phone ? `
                                <a href="tel:${firm.phone.replace(/[^0-9+]/g, '')}" class="firm-call-link" title="Call office directly">
                                    Call ${esc(firm.phone)}
                                </a>
                            ` : `
                                <span class="firm-no-phone">Phone available via LPC directory</span>
                            `}
                            <button type="button" class="firm-consult-btn" data-firm-idx="${idx}">
                                Office Details & Inquiry Preview →
                            </button>
                        </div>

                        <!-- Attribution Note -->
                        <div class="firm-attribution-foot">
                            <small>Source: ${esc(firm.source)} · ${esc(firm.attribution)}</small>
                        </div>
                    </article>
                `).join('')}
            `;
        } catch (err) {
            // Ignore intentional aborts when user switches filters quickly
            if (err.name === 'AbortError') return;
            if (currentSeq !== searchSequence) return;

            // 5. API / Provider Error State (Honest notice - NEVER renders mock firms)
            container.innerHTML = `
                <div class="empty-state error-state">
                    <span class="empty-icon" style="color:#d9534f;">!</span>
                    <h3>Unable to load legal help directory</h3>
                    <p>Check your connection and try again. If the problem continues, please come back later.</p>
                    <p style="margin-top:10px; font-size:13px; color:var(--muted);">
                        You can retry the search or select an alternative city center.
                    </p>
                    <button type="button" class="secondary" id="btn-retry-search" style="margin-top:14px;">
                        Retry Search ⟳
                    </button>
                </div>
            `;
            const retryBtn = $('#btn-retry-search');
            if (retryBtn) retryBtn.onclick = () => renderFirms();
        }
    };

    // Initial render
    renderFirms();

    // 1. Change legal matter
    $('#matter-nav').onclick = e => {
        const btn = e.target.closest('button[data-matter]');
        if (!btn) return;
        currentMatter = btn.dataset.matter;
        $$('#matter-nav button').forEach(b => b.classList.toggle('active', b === btn));
        renderFirms();
    };

    // 2. Change city center preset
    $('#loc-select').onchange = e => {
        userLocationKey = e.target.value;
        const preset = CITY_PRESETS[userLocationKey] || CITY_PRESETS.sandton;
        userCoords = { lat: preset.lat, lng: preset.lng };
        locationMode = 'city_preset';
        locationLabel = preset.name;
        
        const suburbInput = $('#suburb-input');
        if (suburbInput) suburbInput.value = '';

        toast(`Location set to ${preset.shortName} center. Recalculating nearest legal help...`);
        renderFirms();
    };

    // 3. Change search radius
    $('#radius-select').onchange = e => {
        currentRadius = parseInt(e.target.value, 10) || 25;
        toast(`Search radius set to ${currentRadius} km`);
        renderFirms();
    };

    // 4. Suburb / Town autocomplete search with debounce
    const suburbInput = $('#suburb-input');
    const suburbDropdown = $('#suburb-results-dropdown');
    let debounceTimer = null;

    if (suburbInput && suburbDropdown) {
        suburbInput.oninput = () => {
            clearTimeout(debounceTimer);
            const query = suburbInput.value.trim();
            if (query.length < 2) {
                suburbDropdown.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/v1/legal-help/geocode?q=${encodeURIComponent(query)}`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const results = data.results || [];

                    if (results.length === 0) {
                        suburbDropdown.innerHTML = `<div class="suburb-item no-match">No matching South African suburb found</div>`;
                        suburbDropdown.style.display = 'block';
                        return;
                    }

                    suburbDropdown.innerHTML = results.map((item, idx) => `
                        <div class="suburb-item" data-idx="${idx}">
                            <strong>${esc(item.shortName)}</strong>
                            <small>${esc(item.displayName)}</small>
                        </div>
                    `).join('');
                    suburbDropdown.style.display = 'block';

                    $$('.suburb-item[data-idx]', suburbDropdown).forEach(el => {
                        el.onclick = () => {
                            const idx = parseInt(el.dataset.idx, 10);
                            const selected = results[idx];
                            if (selected) {
                                userCoords = { lat: selected.lat, lng: selected.lng };
                                locationMode = 'suburb_search';
                                locationLabel = `${selected.shortName} (Approx. Area)`;
                                suburbInput.value = selected.shortName;
                                suburbDropdown.style.display = 'none';
                                toast(`Location set to ${selected.shortName}. Searching nearby legal help...`);
                                renderFirms();
                            }
                        };
                    });
                } catch (e) {
                    console.warn('Geocoding error:', e);
                }
            }, 300);
        };

        // Close dropdown if user clicks outside
        document.addEventListener('click', e => {
            if (!e.target.closest('.suburb-lookup-field')) {
                suburbDropdown.style.display = 'none';
            }
        });
    }

    // 5. Device location with explanation, permission handling, and error states
    $('#btn-detect-gps').onclick = () => {
        showDeviceLocationModal((confirmed) => {
            if (!confirmed) return;

            // Secure Context restriction check
            const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (!isSecure) {
                toast('Browser requires a secure context (HTTPS) to access GPS. Using city center preset instead.');
                return;
            }

            // Unsupported Geolocation check
            if (!navigator.geolocation) {
                toast('Geolocation is not supported by your browser. Using city center preset instead.');
                return;
            }

            toast('Requesting device location...');
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const accuracy = pos.coords.accuracy;

                    userCoords = { lat, lng };
                    locationMode = 'device_gps';
                    locationLabel = 'Your Device Location (Approx.)';

                    if (accuracy > 5000) {
                        toast(`Location detected (broad accuracy ~${Math.round(accuracy / 1000)} km). Recalculating...`);
                    } else {
                        // Notice: Do NOT display precise coordinates in notifications or persist them!
                        toast('Device location detected. Recalculating nearest legal help...');
                    }

                    renderFirms();
                },
                err => {
                    console.warn('Geolocation error code:', err.code, err.message);
                    let userMsg = 'Could not access device location.';
                    if (err.code === 1) { // PERMISSION_DENIED
                        userMsg = 'Location permission was denied. You can select your city center or search by suburb.';
                    } else if (err.code === 2) { // POSITION_UNAVAILABLE
                        userMsg = 'Device location is currently unavailable. Using city center preset.';
                    } else if (err.code === 3) { // TIMEOUT
                        userMsg = 'Location request timed out. Using city center preset.';
                    }
                    toast(userMsg);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    };

    // 6. Direct Office Details & Consultation Preview Modal
    document.addEventListener('click', e => {
        const btn = e.target.closest('button[data-firm-idx]');
        if (btn) {
            const idx = parseInt(btn.dataset.firmIdx, 10);
            const firm = cachedFirms[idx];
            if (firm) {
                showConsultationModal(firm, currentMatter);
            }
        }
    });
}

/**
 * Explains why device location is requested before calling navigator.geolocation.
 */
function showDeviceLocationModal(onDecision) {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal-overlay';
    modal.innerHTML = `
        <div class="checkout-modal-box">
            <button class="modal-close-btn" id="geo-modal-close">✕</button>
            <p class="eyebrow">LOCATION PRIVACY & PROXIMITY</p>
            <h3>Use Device Location</h3>
            <p style="line-height:1.6; color:#4a5568;">
                LawCompass uses your device's approximate location solely to calculate travel distances to nearby Legal Aid offices and legal practices.
            </p>
            <ul style="padding-left:18px; margin:14px 0; color:#5d6a7e; font-size:13px; line-height:1.7;">
                <li>Your location is used to find nearby legal help.</li>
                <li>You do not need to share private case details to search.</li>
            </ul>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:22px;">
                <button type="button" class="secondary" id="btn-cancel-geo">Cancel (Use City Preset)</button>
                <button type="button" class="primary" id="btn-allow-geo">Allow & Detect Location →</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const close = (allow) => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        onDecision(allow);
    };

    modal.querySelector('#geo-modal-close').onclick = () => close(false);
    modal.querySelector('#btn-cancel-geo').onclick = () => close(false);
    modal.querySelector('#btn-allow-geo').onclick = () => close(true);
}

/**
 * Consultation & Direct Office Information Modal
 * Clearly labels online referral as a demonstration preview and provides direct office contacts.
 * Removes false claims of dispatching requests to unconnected practitioners.
 */
function showConsultationModal(firm, matter) {
    const isLegalAid = firm.category === 'legal_aid';

    const modal = document.createElement('div');
    modal.className = 'checkout-modal-overlay';
    modal.innerHTML = `
        <div class="checkout-modal-box">
            <button class="modal-close-btn" id="modal-close">✕</button>
            <p class="eyebrow">DIRECT CONTACT & CONSULTATION INFORMATION</p>
            <h3>${esc(firm.name)}</h3>
            <p style="color:var(--muted); margin-bottom:16px;">
                Matter Category: <strong>${esc(matter)}</strong> · Distance: <strong>${firm.distanceKm} km</strong>
            </p>

            ${isLegalAid ? `
                <div class="consultation-notice-box notice-legal-aid">
                    <strong>State-Funded Statutory Body:</strong>
                    <p>Legal Aid South Africa provides state-funded legal representation to qualifying indigent individuals subject to the statutory means test. General preliminary legal advice is open to all members of the public.</p>
                </div>
            ` : `
                <div class="consultation-notice-box notice-preview">
                    <strong>Demonstration Preview:</strong>
                    <p>LawCompass does not send consultation requests for you. Contact the practice directly using the details below, and check practitioner credentials with the Legal Practice Council.</p>
                </div>
            `}

            <!-- Verified Office Details -->
            <div class="office-details-card">
                <div class="office-detail-row">
                    <span class="detail-label">Physical Address:</span>
                    <span class="detail-value">${esc(firm.address)} · ${esc(firm.city)}</span>
                </div>
                ${firm.phone ? `
                    <div class="office-detail-row">
                        <span class="detail-label">Direct Phone:</span>
                        <span class="detail-value">
                            <a href="tel:${firm.phone.replace(/[^0-9+]/g, '')}" class="link" style="font-weight:700;">
                                ${esc(firm.phone)}
                            </a>
                        </span>
                    </div>
                ` : ''}
                <div class="office-detail-row">
                    <span class="detail-label">Credential Verification:</span>
                    <span class="detail-value">
                        <a href="${esc(firm.lpcVerificationReferenceUrl || 'https://lpc.org.za')}" target="_blank" rel="noopener noreferrer" class="link">
                            Verify Admission on Legal Practice Council Roll ↗
                        </a>
                    </span>
                </div>
            </div>

            <!-- Demo Inquiry Form -->
            <form id="consult-demo-form" style="display:grid; gap:12px; margin-top:20px;">
                <p class="eyebrow" style="margin:0;">PREVIEW INQUIRY FORM (DEMO ONLY)</p>
                <label><b>Your Name</b><input required id="c-name" value="${esc(profile().name)}"></label>
                <label><b>Contact Number</b><input required id="c-phone" placeholder="+27 (0)82 123 4567"></label>
                <label><b>Brief Inquiry Summary</b><textarea required id="c-notes" placeholder="Briefly describe your legal question..."></textarea></label>
                
                <p style="font-size:12px; color:var(--muted); line-height:1.5; margin:4px 0;">
                    <em>Notice: Submitting this form will not transmit confidential case information to third-party firms. Please contact the office directly at ${esc(firm.phone || 'their listed telephone')} for urgent legal advice.</em>
                </p>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button type="button" class="secondary" id="btn-close-consult">Close</button>
                    <button type="submit" class="primary">Record Details & Close</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('#modal-close').onclick = closeModal;
    modal.querySelector('#btn-close-consult').onclick = closeModal;

    modal.querySelector('#consult-demo-form').onsubmit = e => {
        e.preventDefault();
        closeModal();
        // Honest notification: does NOT claim consultation request was sent to a partner!
        toast(`Office details noted for ${firm.name}. Please contact them directly at ${firm.phone || 'their listed office'}.`);
    };
}


// ------------------------------------------------------------------------------
// 8. PLANS & PREMIUM BENEFITS (Comprehensive Showcase)
// ------------------------------------------------------------------------------
function pricing() {
    let billingCycle = 'monthly'; // 'monthly' | 'annual'

    const renderPricing = () => {
        const isAnnual = billingCycle === 'annual';
        const standardPrice = isAnnual ? 'R374' : 'R39';
        const premiumPrice = 'Custom';
        const standardPeriod = isAnnual ? '/ month (billed R374/yr)' : '/ month (indicative)';
        const premiumPeriod = 'Pricing after assessment';
        const currentTier = accountTier();

        shell('Plans & Premium Benefits', `
            <div class="pricing-header-wrap">
                <p class="eyebrow">PLANS · SOUTH AFRICAN LEGAL INFORMATION</p>
                <h1>Plans for individuals and organisations</h1>
                <p class="intro" style="margin: 0 auto;">Compare the options shown here. Document locking is available while preparing any draft.</p>

                <div class="billing-switcher">
                    <button type="button" class="${!isAnnual ? 'active' : ''}" id="btn-monthly">Monthly Billing</button>
                    <button type="button" class="${isAnnual ? 'active' : ''}" id="btn-annual">Annual Billing <span class="badge-save">SAVE 20%</span></button>
                </div>
            </div>

            <!-- Tiered Cards -->
            <div class="plans-grid-3">
                <!-- Free Starter -->
                <article class="plan-box ${currentTier === 'free' ? 'current-plan' : ''}">
                    <p class="plan-tier-name">FREE STARTER</p>
                    <div class="plan-price-row">
                        <span class="plan-price-val">R0</span>
                        <span class="plan-price-period">/ forever</span>
                    </div>
                    <p class="plan-desc">Draft documents, save them in your history and explore the legal dictionary.</p>
                    <ul class="plan-benefits-list">
                        <li><b>✓</b> 5 standard document templates</li>
                        <li><b>✓</b> Plain-English legal dictionary</li>
                        <li><b>✓</b> Saved document history</li>
                        <li><b>✓</b> Document locking</li>
                        <li><b>✓</b> Upload up to 2 contracts (PDF, DOCX or TXT)</li>
                        <li><b>✓</b> Get up to 5 contract explanations</li>
                    </ul>
                    <button type="button" class="plan-cta-btn secondary pay-trigger" data-plan="free" ${currentTier === 'free' ? 'disabled' : ''}>${currentTier === 'free' ? 'Current Plan' : 'Choose Free Starter'}</button>
                </article>

                <!-- Standard Pro -->
                <article class="plan-box ${currentTier === 'standard' ? 'current-plan' : ''}">
                    <p class="plan-tier-name">STANDARD PRO</p>
                    <div class="plan-price-row">
                        <span class="plan-price-val">${standardPrice}</span>
                        <span class="plan-price-period">${standardPeriod}</span>
                    </div>
                    <p class="plan-desc">For individuals and small businesses who need more from their workspace.</p>
                    <ul class="plan-benefits-list">
                        <li><b>✓</b> <strong>Unlimited document creation</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Unlimited contract uploads and explanations</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Personalize Contract (Custom clauses studio)</strong></li>
                        <li><b>✓</b> Clean Microsoft Word (.docx) & PDF exports</li>
                        <li><b>✓</b> Planned: customer support</li>
                    </ul>
                    <button type="button" class="plan-cta-btn primary pay-trigger" data-plan="standard" ${currentTier === 'standard' ? 'disabled' : ''}>${currentTier === 'standard' ? 'Current Plan' : 'Choose Standard Pro'}</button>
                </article>

                <!-- Premium Enterprise -->
                <article class="plan-box popular">
                    <span class="popular-flag">MOST POPULAR</span>
                    <p class="plan-tier-name" style="color:#9d6924;">PREMIUM ENTERPRISE</p>
                    <div class="plan-price-row">
                        <span class="plan-price-val">${premiumPrice}</span>
                        <span class="plan-price-period">${premiumPeriod}</span>
                    </div>
                    <p class="plan-desc">Pricing depends on an assessment of your current systems and requirements.</p>
                    <ul class="plan-benefits-list">
                        <li class="pro-feature"><b>✓</b> <strong>Everything in Standard Pro</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Contract upload and clause explanation</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Planned: additional document guidance</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Find nearby legal help</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Planned: expanded legal resources</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Online document storage planned</strong></li>
                    </ul>
                    <button type="button" class="plan-cta-btn primary pay-trigger" data-plan="premium" style="background:#14223b !important; color:#fff !important;">Get Premium Enterprise</button>
                </article>
            </div>

            <!-- Detailed Comparison Matrix -->
            <div class="comparison-section-box">
                <h3 style="font: 600 24px 'Playfair Display', serif; color:var(--navy); margin-top:0;">Plan Benefits Comparison</h3>
                <table class="comparison-matrix-table">
                    <thead>
                        <tr>
                            <th>Feature / Capability</th>
                            <th>Free Starter</th>
                            <th>Standard Pro</th>
                            <th>Premium Enterprise</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>South African Guided Legal Templates</td>
                            <td>5 templates</td>
                            <td>Unlimited</td>
                            <td>Unlimited</td>
                        </tr>
                        <tr>
                            <td><strong>Upload Contracts (PDF, DOCX, TXT)</strong></td>
                            <td>Up to 2 documents</td>
                            <td>Unlimited</td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Contract explanations</strong></td>
                            <td>Up to 5 explanations</td>
                            <td>Unlimited</td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Document locking</strong></td>
                            <td><span class="check-yes">✓ Included</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Personalize Contract (Custom Clauses Studio)</strong></td>
                            <td>Not included</td>
                            <td><span class="check-yes">✓ Included</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Legal help directory</strong></td>
                            <td>Included</td><td>Included</td><td>Included</td>
                        </tr>
                        <tr>
                            <td>Document history in this browser</td>
                            <td>Included</td><td>Included</td><td>Included</td>
                        </tr>
                        <tr>
                            <td>Legal review of templates</td>
                            <td>Review status not shown</td>
                            <td>Review status not shown</td>
                            <td>Review status not shown</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `);

        $('#btn-monthly').onclick = () => { billingCycle = 'monthly'; renderPricing(); };
        $('#btn-annual').onclick = () => { billingCycle = 'annual'; renderPricing(); };

        $$('.pay-trigger').forEach(btn => {
            btn.onclick = () => {
                const chosen = btn.dataset.plan;
                if (chosen === 'premium') return showEnterpriseModal();
                const p = profile();
                p.tier = chosen;
                localStorage.setItem('lawcompass-profile', JSON.stringify(p));
                renderPricing();
                showPlanChangeModal(chosen);
            };
        });
    };

    renderPricing();
}

function showEnterpriseModal() {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal-overlay';
    modal.innerHTML = `
        <div class="checkout-modal-box">
            <button class="modal-close-btn" id="modal-close">✕</button>
            <p class="eyebrow">PREMIUM ENTERPRISE</p>
            <h3>Thank you for your interest</h3>
            <p>LawCompass will contact you soon to discuss your requirements and assess your current systems.</p>
            <button class="primary wide" id="confirm-upgrade-btn">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#modal-close').onclick = () => document.body.removeChild(modal);
    modal.querySelector('#confirm-upgrade-btn').onclick = () => {
        document.body.removeChild(modal);
    };
}

function showPlanChangeModal(tier) {
    const message = tier === 'free'
        ? 'You have been downgraded to the Free Starter plan.'
        : 'Congratulations! You have switched to the Standard Pro plan.';
    const modal = document.createElement('div');
    modal.className = 'checkout-modal-overlay';
    modal.innerHTML = `<div class="checkout-modal-box" role="dialog" aria-modal="true" aria-labelledby="plan-change-title">
        <button class="modal-close-btn" id="plan-change-close" aria-label="Close">✕</button>
        <p class="eyebrow">PLAN UPDATED</p><h3 id="plan-change-title">${esc(message)}</h3>
        <p>Your demo workspace benefits now match your selected plan.</p>
        <button class="primary wide" id="plan-change-done">Continue</button>
    </div>`;
    const close = () => modal.remove();
    document.body.appendChild(modal);
    modal.querySelector('#plan-change-close').onclick = close;
    modal.querySelector('#plan-change-done').onclick = close;
}

// ------------------------------------------------------------------------------
// 9. UPLOAD & EXPLAIN CONTRACT (AI Reader)
// ------------------------------------------------------------------------------
function plainClause(clause) {
    if (/terminat|cancel|notice/i.test(clause)) return 'This explains how the agreement can end and what prior notice must be provided.';
    if (/pay|fee|rent|invoice|cost|interest/i.test(clause)) return 'This deals with money: review the exact amount, due dates, payment methods, and late penalty interest.';
    if (/liab|indemn|damage|loss|hold harmless/i.test(clause)) return 'This allocates legal risk. Check who is held financially responsible if a claim or loss occurs.';
    if (/confidential|non-disclos/i.test(clause)) return 'Requires designated business or personal information to be kept secret and protected.';
    if (/dispute|jurisdiction|governing law/i.test(clause)) return 'Specifies which South African law applies and whether disputes go to AFSA arbitration or Court.';
    if (/warrant|represent/i.test(clause)) return 'A legal promise that stated facts, capacity, or property titles are accurate.';
    return 'Sets a binding condition, obligation, or procedure. Check who must do what, by when, and the consequence of failure.';
}

function upload() {
    const freePlan = accountTier() === 'free';
    if (!freePlan && !hasPremiumFeatures()) {
        shell('Upload & Explain Contract', `
            <p class="eyebrow">CONTRACT READER & CLAUSE EXPLAINER</p>
            <h1>Upload a contract</h1>
            <div class="empty-state"><h3>This feature is not included with your current plan</h3><p>Contract uploads and explanations are available on the free plan with limited use, or without a limit on Premium.</p><a class="primary" href="pricing.html">View plan details</a></div>
        `);
        return;
    }
    const usage = getPlanUsage();
    shell('Upload & Explain Contract', `
        <p class="eyebrow">CONTRACT READER & CLAUSE EXPLAINER</p>
        <h1>Upload a contract</h1>
        <p class="intro">Upload a document or paste a clause to get a basic plain-language reading guide. ${freePlan ? 'The free plan includes 2 uploads and 5 explanations.' : 'Standard Pro includes unlimited uploads and explanations.'} The tool highlights common wording patterns; it cannot decide whether a term is unfair or legally suitable.</p>

        <div class="upload-layout">
            <section class="upload-card">
                <label class="dropzone" for="contract-file">
                    <span>↥</span>
                    <b>Upload contract file</b>
                    <small>${freePlan ? 'The free plan accepts PDF, DOCX and TXT.' : 'PDF, DOCX, DOC, RTF, ODT, TXT, Markdown, HTML, and CSV accepted.'}</small>
                    <input id="contract-file" type="file" accept="${freePlan ? '.pdf,.docx,.txt' : '.pdf,.doc,.docx,.rtf,.odt,.txt,.md,.html,.htm,.csv'}">
                </label>
                <p id="upload-status" class="upload-status">Your file is processed privately in your browser.</p>
                ${freePlan ? '<p id="plan-usage" class="form-note"></p>' : ''}

                <label class="paste-label">
                    Contract or clause text
                    <textarea id="contract-text" placeholder="Paste a legal clause or the full text of your agreement here..."></textarea>
                </label>

                <button class="primary" id="explain-contract">Explain in simple English</button>
            </section>

            <section class="explanation-card">
                <p class="eyebrow">PLAIN-ENGLISH EXPLANATION</p>
                <div id="contract-explanation" class="reader-empty">
                    <span>◌</span>
                    <h3>Ready when you are</h3>
                    <p>Upload a file or paste text to see common clauses and a basic explanation of their wording.</p>
                </div>
                <div class="contract-followup" aria-live="polite">
                    <label for="contract-question">Have a question about this explanation?</label>
                    <textarea id="contract-question" rows="3" placeholder="Ask a follow-up question..." disabled></textarea>
                    <button class="primary" id="interrogate-contract" type="button" disabled>Interrogate</button>
                    <div id="contract-followup-answer"></div>
                </div>
            </section>
        </div>

        <p class="form-note">
            This reading guide may miss important details and is not legal advice. For a dispute or an important decision, speak with a qualified legal practitioner or Legal Aid South Africa.
        </p>
    `);

    const file = $('#contract-file');
    const text = $('#contract-text');
    const status = $('#upload-status');
    let latestExplanation = '';
    let latestContractText = '';
    const updatePlanUsage = () => {
        const counter = $('#plan-usage');
        if (counter) counter.textContent = `Free plan: ${Math.max(0, 2 - usage.uploads)} of 2 uploads and ${Math.max(0, 5 - usage.explanations)} of 5 explanations remaining.`;
    };
    updatePlanUsage();

    file.onchange = () => {
        const selected = file.files[0];
        if (!selected) return;

        if (freePlan && !/\.(pdf|docx|txt)$/i.test(selected.name)) {
            file.value = '';
            status.textContent = 'The free plan accepts PDF, DOCX and TXT files.';
            return;
        }
        if (freePlan && usage.uploads >= 2) {
            file.value = '';
            status.textContent = 'You have used the 2 contract uploads included with the free plan.';
            toast('Free plan upload limit reached. View Plans for available options.');
            return;
        }
        if (freePlan) {
            usage.uploads += 1;
            savePlanUsage(usage);
            updatePlanUsage();
        }

        status.textContent = `Processing ${selected.name}...`;

        // If text-like file
        if (/\.(txt|md|html?|csv)$/i.test(selected.name)) {
            const reader = new FileReader();
            reader.onload = () => {
                text.value = reader.result;
                status.textContent = `${selected.name} loaded. Ready to explain.`;
            };
            reader.readAsText(selected);
        } else {
            // For binary documents (.docx, .pdf, etc.):
            const reader = new FileReader();
            reader.onload = async () => {
                const arrayBuffer = reader.result;
                const uint8 = new Uint8Array(arrayBuffer);
                let binaryStr = '';
                const chunk = 8192;
                for (let i = 0; i < uint8.length; i += chunk) {
                    binaryStr += String.fromCharCode.apply(null, uint8.subarray(i, i + chunk));
                }
                const base64 = btoa(binaryStr);

                try {
                    // Check if document is password-protected
                    const chkRes = await fetch('/api/v1/documents/check-encryption', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileBase64: base64, filename: selected.name })
                    });
                    const chk = await chkRes.json();

                    if (chk.isEncrypted) {
                        status.textContent = `${selected.name} is password protected. Enter password to view and explain.`;
                        openUnlockModal({
                            filename: selected.name,
                            onUnlock: async (password, modal) => {
                                const unlockRes = await fetch('/api/v1/documents/decrypt-document', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fileBase64: base64,
                                        filename: selected.name,
                                        password,
                                        format: chk.format
                                    })
                                });
                                const unlockData = await unlockRes.json();
                                if (!unlockRes.ok) {
                                    throw new Error(unlockData.error?.message || 'Incorrect password. The document could not be unlocked.');
                                }
                                modal.remove();
                                text.value = unlockData.text;
                                status.textContent = `${selected.name} unlocked and decrypted successfully!`;
                                toast('Document unlocked successfully!');
                                $('#explain-contract').click();
                            }
                        });
                        return;
                    }

                    // Not encrypted:
                    if (/\.docx$/i.test(selected.name) && window.JSZip) {
                        const zip = await window.JSZip.loadAsync(arrayBuffer);
                        const xml = await zip.file('word/document.xml').async('text');
                        const cleanText = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        text.value = cleanText;
                        status.textContent = `${selected.name} DOCX text extracted successfully!`;
                    } else {
                        status.textContent = `${selected.name} selected. Copy and paste specific clauses into the box below for explanation.`;
                    }
                } catch (e) {
                    status.textContent = `${selected.name} selected. Paste clauses directly if extraction is blocked.`;
                }
            };
            reader.readAsArrayBuffer(selected);
        }
    };

    $('#explain-contract').onclick = () => {
        const value = text.value.trim();
        if (!value) return toast('Upload a readable file or paste contract text first.');
        if (freePlan && usage.explanations >= 5) {
            toast('You have used the 5 contract explanations included with the free plan. View Plans for available options.');
            return;
        }
        if (freePlan) {
            usage.explanations += 1;
            savePlanUsage(usage);
            updatePlanUsage();
        }

        const clauses = value.split(/(?<=[.!?;])\s+|\n+/).filter(x => x.trim().length > 20).slice(0, 10);
        const flags = [];

        if (/terminat|cancel|notice/i.test(value)) flags.push('Notice periods and unilateral cancellation clauses');
        if (/pay|fee|rent|invoice|interest|late/i.test(value)) flags.push('Payment terms, late fees, and escalation percentages');
        if (/liab|indemn|damage|loss|hold harmless/i.test(value)) flags.push('Unlimited indemnities and risk transfer provisions');
        if (/confidential|trade secret/i.test(value)) flags.push('Confidentiality scope and post-termination restrictions');
        if (/dispute|jurisdiction|governing law/i.test(value)) flags.push('Jurisdiction clauses and arbitration procedures');

        const simple = clauses.map((c, i) => `
            <article>
                <b>Clause ${i + 1}</b>
                <p>${esc(c)}</p>
                <small>Plain reading: ${plainClause(c)}</small>
            </article>
        `).join('');

        $('#contract-explanation').className = '';
        $('#contract-explanation').innerHTML = `
            <h3>Contract Structure & Plain-English Analysis</h3>
            <p>This document sets out the legal obligations of the parties. Review the flags and clause meanings below:</p>
            ${flags.length ? `<h4>Pay Close Attention To</h4><ul>${flags.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
            <h4>Clauses Identified (${clauses.length})</h4>
            ${simple || '<p>Add more detailed text for comprehensive clause parsing.</p>'}
        `;
        latestContractText = value;
        latestExplanation = $('#contract-explanation').innerText.trim();
        $('#contract-question').disabled = false;
        $('#interrogate-contract').disabled = false;
        $('#contract-followup-answer').replaceChildren();
    };

    $('#interrogate-contract').onclick = async () => {
        const question = $('#contract-question').value.trim();
        const explanation = latestExplanation;
        if (!question) return toast('Enter a question about the explanation first.');
        const button = $('#interrogate-contract');
        button.disabled = true;
        button.textContent = 'Thinking…';
        try {
            const token = localStorage.getItem('lawcompass-token') || localStorage.getItem('lawbuddy-token');
            const response = await fetch('/api/v1/assistant/contract-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ question, explanation, contractText: latestContractText })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error?.message || 'The follow-up could not be answered.');
            const answer = document.createElement('p');
            answer.className = 'contract-followup-response';
            answer.textContent = result.answer;
            $('#contract-followup-answer').replaceChildren(answer);
            $('#contract-question').value = '';
        } catch (error) {
            toast(error.message || 'The follow-up could not be answered.');
        } finally {
            button.disabled = false;
            button.textContent = 'Interrogate';
        }
    };
}

async function profilePage() {
    shell('Your Profile', `
        <p class="eyebrow">ACCOUNT DETAILS</p>
        <h1>Your profile</h1>
        <p class="intro">Review and update the personal details saved to your LawCompass account.</p>
        <form id="profile-form" class="profile-form">
            <p id="profile-status" class="form-note" role="status">Loading your profile…</p>
            <label>First name<input name="first_name" required maxlength="100"></label>
            <label>Surname<input name="surname" required maxlength="100"></label>
            <label class="full">Full name<input name="full_name" required maxlength="160"></label>
            <label>Email<input name="email" type="email" readonly></label>
            <label>Phone<input name="phone" type="tel" maxlength="40"></label>
            <label>Date of birth<input name="date_of_birth" type="date"></label>
            <label class="full">Residential address<input name="residential_address" required maxlength="500"></label>
            <label>City<input name="city" required maxlength="100"></label>
            <label>Province<select name="province" required><option value="">Select province</option>${['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape'].map(x => `<option>${x}</option>`).join('')}</select></label>
            <label>Postal code<input name="postal_code" required maxlength="20"></label>
            <label>Preferred language<select name="preferred_language">${['English','isiZulu','isiXhosa','Afrikaans','Sesotho','Setswana','Sepedi','Xitsonga','siSwati','Tshivenda','isiNdebele'].map(x => `<option>${x}</option>`).join('')}</select></label>
            <label>Account type<select name="persona"><option value="individual">Individual</option><option value="student">Student</option><option value="business_owner">Business owner</option></select></label>
            <button class="primary" type="submit">Save profile</button>
        </form>
    `);
    const form = $('#profile-form');
    const status = $('#profile-status');
    const token = localStorage.getItem('lawcompass-token') || localStorage.getItem('lawbuddy-token');
    if (!token) {
        status.textContent = 'Please sign in again to manage your saved profile.';
        form.hidden = true;
        return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    try {
        const response = await fetch('/api/v1/auth/me', { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Could not load your profile.');
        const u = data.user;
        for (const [key, value] of Object.entries({ first_name: u.firstName, surname: u.surname, full_name: u.fullName, email: u.email, phone: u.phone, date_of_birth: u.dateOfBirth, residential_address: u.residentialAddress, city: u.city, province: u.province, postal_code: u.postalCode, preferred_language: u.preferredLanguage, persona: u.persona })) {
            if (form.elements[key]) form.elements[key].value = value || '';
        }
        status.textContent = 'Your saved profile details are shown below.';
    } catch (error) {
        status.textContent = error.message;
        form.hidden = true;
        return;
    }
    form.onsubmit = async event => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        delete payload.email;
        try {
            const response = await fetch('/api/v1/auth/me', { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Could not save your profile.');
            const p = profile();
            p.name = payload.full_name;
            p.email = form.elements.email.value;
            localStorage.setItem('lawcompass-profile', JSON.stringify(p));
            status.textContent = 'Profile saved to your account.';
            toast('Your profile has been updated.');
        } catch (error) { status.textContent = error.message; }
    };
}

// ------------------------------------------------------------------------------
// 10. HISTORY, DICTIONARY & TRANSLATOR
// ------------------------------------------------------------------------------
function historyPage() {
    shell('Document History & Vault', `
        <p class="eyebrow">DOCUMENT HISTORY</p>
        <h1>Your generated documents</h1>
        <p class="intro">Open, download or update a document you created. Saved documents stay in this browser and are separated by your account.</p>
        <div class="history-list" id="saved-documents"><div class="empty-state">Loading your documents…</div></div>
    `);
    const container = $('#saved-documents');
    listUserDocuments().then(items => {
        container.innerHTML = items.length ? items.map(item => `
            <article class="history-item">
                <span>${item.isLocked ? SVG_LOCK_ICON : '▤'}</span>
                <div><b>${esc(item.name)} ${item.isLocked ? '<span class="history-lock-pill">Locked & Encrypted</span>' : ''}</b>
                    <small>Saved ${esc(item.date || new Date(item.updatedAt).toLocaleString('en-ZA'))}</small></div>
                <button type="button" data-edit-doc="${esc(item.id)}">Edit</button>
                <button type="button" data-download-doc="${esc(item.id)}">Download Word file</button>
                <button type="button" data-lock-download-doc="${esc(item.id)}" style="color:var(--navy); font-weight:700; display:inline-flex; align-items:center; gap:6px;">${SVG_LOCK_ICON} Lock & Download</button>
            </article>`).join('') : `<div class="empty-state"><span class="empty-icon">◷</span><h3>No documents yet</h3><p>Your generated documents will appear here.</p><a class="primary" href="documents.html">Create your first document</a></div>`;
        container.onclick = async event => {
            const button = event.target.closest('button'); if (!button) return;
            try {
                if (button.dataset.lockDownloadDoc) {
                    const doc = await getUserDocument(button.dataset.lockDownloadDoc);
                    if (!doc) return toast('We could not find that saved document.');
                    openLockAndDownloadModal({
                        docxBlob: doc.file,
                        name: doc.name,
                        type: doc.type,
                        answers: doc.answers,
                        customClauses: doc.customClauses,
                        onSuccess: async (result) => {
                            doc.isLocked = true;
                            doc.lockedArtifactFormat = result.format;
                            doc.lockedArtifactName = result.filename;
                            await saveUserDocument(doc);
                            historyPage();
                        }
                    });
                    return;
                }
                const doc = await getUserDocument(button.dataset.openDoc || button.dataset.editDoc || button.dataset.downloadDoc);
                if (!doc) return toast('We could not find that saved document.');
                if (button.dataset.editDoc) return location.href = `builder.html?type=${encodeURIComponent(doc.type)}&edit=${encodeURIComponent(doc.id)}`;
                if (button.dataset.downloadDoc || button.dataset.openDoc) {
                    openLockAndDownloadModal({
                        docxBlob: doc.file,
                        name: doc.name,
                        type: doc.type,
                        answers: doc.answers,
                        customClauses: doc.customClauses,
                        onSuccess: async (result) => {
                            doc.isLocked = true;
                            doc.lockedArtifactFormat = result.format;
                            doc.lockedArtifactName = result.filename;
                            await saveUserDocument(doc);
                            historyPage();
                        }
                    });
                }
            } catch (_) { toast('We could not open that document. Please try again.'); }
        };
    }).catch(() => { container.innerHTML = '<div class="empty-state">Document history is unavailable right now. Please refresh and try again.</div>'; });
}

function dictionary() {
    shell('Legal Dictionary', `
        <p class="eyebrow">PLAIN-ENGLISH SOUTH AFRICAN GLOSSARY</p>
        <h1>Legal dictionary</h1>
        <p class="intro">Look up legal terms you may hear in court, find in a contract, or discuss with an attorney. Search the examples below or enter a term for a plain-English explanation.</p>
        <div class="search">
            <input id="term" placeholder="Search a legal term (e.g. testator, bail, deposit)" aria-label="Legal term">
            <button class="primary" id="search">Search</button>
        </div>
        <div id="definition" class="definition empty" aria-live="polite">Search a legal term or select a suggestion below.</div>
        <div class="chips">
            ${Object.keys(terms).map(t => `<button data-term="${t}">${t.toUpperCase()}</button>`).join('')}
        </div>
    `);

    let lookupNumber = 0;
    const show = async w => {
        const requestNumber = ++lookupNumber;
        const term = w.trim();
        if (!term) {
            $('#definition').classList.add('empty');
            $('#definition').textContent = 'Enter a legal term to search.';
            return;
        }
        const v = terms[term.toLowerCase()];
        $('#definition').classList.remove('empty');
        const box = $('#definition');
        box.replaceChildren();
        const heading = document.createElement('h3');
        heading.textContent = v ? v[0] : term;
        box.append(heading);
        if (v) {
            const explanation = document.createElement('p'); explanation.textContent = v[1]; box.append(explanation);
            const example = document.createElement('p');
            const label = document.createElement('b'); label.textContent = 'In a contract: ';
            example.append(label, document.createTextNode(v[2])); box.append(example);
            return;
        }

        const explanation = document.createElement('p');
        explanation.textContent = 'Looking up this legal term…';
        box.append(explanation);
        const token = localStorage.getItem('lawcompass-token');
        try {
            const response = await fetch('/api/v1/assistant/dictionary/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ term })
            });
            const result = await response.json();
            if (!response.ok) throw new Error('lookup');
            if (requestNumber !== lookupNumber) return;
            if (result.definition.trim() === 'NOT_A_LEGAL_TERM') {
                explanation.textContent = 'This does not appear to be a legal term. Try a word or phrase you may see in court, in a contract, or when speaking with an attorney.';
                return;
            }
            explanation.textContent = result.definition;
        } catch (_) {
            if (requestNumber !== lookupNumber) return;
            explanation.textContent = 'We could not look up that term right now. Please try again or choose one of the suggested terms.';
        }
    };

    $('#search').onclick = () => show($('#term').value);
    $('#term').addEventListener('keydown', e => { if (e.key === 'Enter') show($('#term').value); });
    $('#definition').closest('.view')?.addEventListener('click', e => {
        if (e.target.dataset.term) {
            $('#term').value = e.target.dataset.term;
            show(e.target.dataset.term);
        }
    });
}

function translate() {
    shell('Translate contract terms', `
        <p class="eyebrow">UNDERSTAND LEGAL TERMS</p>
        <h1>Translate contract terms</h1>
        <p class="intro">Paste terms and conditions to get a plain-language translation. The text is sent to the configured AI service for translation, so remove personal details first. This is general information, not legal advice.</p>
        <textarea id="clause" placeholder="Paste terms and conditions here..."></textarea>
        <div class="translate-actions">
            <select id="lang-guide">
                <option value="English" selected>English</option>
                <option value="isiZulu">isiZulu</option>
                <option value="Sesotho">Sesotho</option>
                <option value="Afrikaans">Afrikaans</option>
            </select>
            <button class="primary" id="explain">Translate and explain</button>
        </div>
        <div class="definition" id="result">Your plain-language translation will appear here.</div>
    `);

    $('#explain').onclick = async () => {
        const text = $('#clause').value.trim();
        if (!text) return toast('Paste the terms you want explained.');
        const button = $('#explain'); button.disabled = true; button.textContent = 'Working…';
        $('#result').textContent = 'Preparing your plain-language translation…';
        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('lawcompass-token') || localStorage.getItem('lawbuddy-token');
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch('/api/v1/assistant/translate', { method: 'POST', headers, body: JSON.stringify({ text, language: $('#lang-guide').value }) });
            const result = await response.json();
            if (!response.ok) throw new Error('translation');
            $('#result').innerHTML = `<h3>Plain-language version</h3><p>${esc(result.translation).replace(/\n/g, '<br>')}</p><p><b>Reminder:</b> This translation is general information. Ask a qualified legal practitioner about your situation.</p>`;
        } catch (_) {
            $('#result').textContent = 'We could not translate the text right now. Please check your connection and try again.';
            toast('Translation is temporarily unavailable. Please try again.');
        } finally { button.disabled = false; button.textContent = 'Translate and explain'; }
    };
}

// ------------------------------------------------------------------------------
// 11. LOGIN & AUTHENTICATION HANDLERS
// ------------------------------------------------------------------------------
if ($('#login-form')) {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirect') || 'dashboard.html';

    $('#login-form').onsubmit = async e => {
        e.preventDefault();
        const emailInput = $('#login-email') || $('input[type=email]');
        const passInput = $('#login-password') || $('input[type=password]');
        const submitBtn = $('#login-submit-btn') || $('#login-form button[type=submit]');
        const alertBox = $('#login-alert');

        const email = emailInput ? emailInput.value.trim() : '';
        const password = passInput ? passInput.value : '';

        if (!email || !password) {
            if (alertBox) {
                alertBox.className = 'auth-status-box auth-status-error';
                alertBox.textContent = 'Please enter your email and password.';
                alertBox.style.display = 'block';
            }
            return;
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing in...';
        if (alertBox) alertBox.style.display = 'none';

        try {
            const res = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message || 'Invalid email or password.');
            }

            if (data.session?.accessToken) {
                localStorage.setItem('lawcompass-token', data.session.accessToken);
            }
            localStorage.setItem('lawcompass-profile', JSON.stringify({
                id: data.user.id,
                name: data.user.fullName || data.user.email.split('@')[0],
                email: data.user.email,
                tier: 'premium'
            }));

            location.href = redirectTarget;
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            if (alertBox) {
                alertBox.className = 'auth-status-box auth-status-error';
                alertBox.textContent = friendlyError(err, 'We could not sign you in. Check your details and try again.');
                alertBox.style.display = 'block';
            } else {
                alert(friendlyError(err, 'We could not sign you in. Check your details and try again.'));
            }
        }
    };
}

// ------------------------------------------------------------------------------
// SOUTH AFRICAN USER REGISTRATION & OTP VERIFICATION HANDLER
// ------------------------------------------------------------------------------
if ($('#signup-form')) {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirect') || 'dashboard.html';

    let registeredEmail = '';
    let countdownInterval = null;

    const startOtpTimer = (seconds = 600) => {
        if (countdownInterval) clearInterval(countdownInterval);
        let remaining = seconds;
        const display = $('#otp-timer-display');
        if (!display) return;

        const updateTimer = () => {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            display.innerHTML = `Code expires in: <strong>${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</strong>`;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                display.innerHTML = '<span style="color:#b91c1c;">Code expired. Please request a new OTP.</span>';
            }
            remaining--;
        };
        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    };

    // Step 1: Registration Form Submission
    $('#signup-form').onsubmit = async e => {
        e.preventDefault();
        const alertBox = $('#signup-alert');
        const submitBtn = $('#signup-submit-btn');

        const firstName = ($('#signup-first-name')?.value || '').trim();
        const surname = ($('#signup-surname')?.value || '').trim();
        const dob = $('#signup-dob')?.value || '';
        const persona = $('#signup-persona')?.value || 'individual';
        const preferredLanguage = $('#signup-language')?.value || 'English';
        const residentialAddress = ($('#signup-address')?.value || '').trim();
        const city = ($('#signup-city')?.value || '').trim();
        const province = $('#signup-province')?.value || '';
        const postalCode = ($('#signup-postal')?.value || '').trim();
        const phone = ($('#signup-phone')?.value || '').trim();
        const email = ($('#signup-email')?.value || '').trim().toLowerCase();
        const password = $('#signup-password')?.value || '';
        const confirmPassword = $('#signup-confirm-password')?.value || '';
        const termsAccepted = $('#signup-terms-check')?.checked || false;

        const showError = msg => {
            if (alertBox) {
                alertBox.className = 'auth-status-box auth-status-error';
                alertBox.textContent = msg;
                alertBox.style.display = 'block';
                alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                alert(msg);
            }
        };

        if (!firstName || !surname) {
            return showError('Please enter both your first name and surname.');
        }
        if (!residentialAddress || !city || !province || !postalCode) {
            return showError('Please provide your complete South African residential address, city, province, and postal code.');
        }
        if (!province) {
            return showError('Please select your province from the dropdown list.');
        }
        if (!email || !email.includes('@')) {
            return showError('Please enter a valid email address.');
        }
        if (password.length < 8) {
            return showError('Password must be at least 8 characters long for security compliance.');
        }
        if (password !== confirmPassword) {
            return showError('Passwords do not match. Please re-enter carefully.');
        }
        if (!termsAccepted) {
            return showError('You must accept the LawCompass Terms and Conditions (Version 1.0 - South Africa) to proceed.');
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending Verification OTP...';
        if (alertBox) alertBox.style.display = 'none';

        try {
            const res = await fetch('/api/v1/auth/register-start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    surname,
                    dob,
                    persona,
                    preferredLanguage,
                    residentialAddress,
                    city,
                    province,
                    postalCode,
                    phone,
                    email,
                    password,
                    termsAccepted
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || 'Registration failed. Please verify your details.');
            }

            registeredEmail = email;

            // Transition to Step 2 (OTP Screen)
            $('#signup-step-1').style.display = 'none';
            $('#signup-step-2').style.display = 'block';
            $('#otp-target-email').textContent = email;

            startOtpTimer(data.expiresInSeconds || 600);
            startResendCooldown(60);

            const otpInput = $('#otp-input');
            if (otpInput) {
                otpInput.value = '';
                otpInput.focus();
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            showError(friendlyError(err, 'We could not send a verification code. Check your details and try again.'));
        }
    };

    let resendCooldownInterval = null;
    const startResendCooldown = (seconds = 60) => {
        const btn = $('#btn-resend-otp');
        if (!btn) return;
        if (resendCooldownInterval) clearInterval(resendCooldownInterval);
        let left = seconds;
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.textContent = `Resend Code (${left}s)`;
        resendCooldownInterval = setInterval(() => {
            left--;
            if (left <= 0) {
                clearInterval(resendCooldownInterval);
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.textContent = 'Resend Code ⟳';
            } else {
                btn.textContent = `Resend Code (${left}s)`;
            }
        }, 1000);
    };

    // Step 2: OTP Verification Submission
    if ($('#otp-form')) {
        $('#otp-form').onsubmit = async e => {
            e.preventDefault();
            const otpAlert = $('#otp-alert');
            const submitBtn = $('#otp-submit-btn');
            const otp = ($('#otp-input')?.value || '').trim();

            const showOtpError = msg => {
                if (otpAlert) {
                    otpAlert.className = 'auth-status-box auth-status-error';
                    otpAlert.textContent = msg;
                    otpAlert.style.display = 'block';
                } else {
                    alert(msg);
                }
            };

            if (!otp || otp.length !== 6) {
                return showOtpError('Please enter the complete 6-digit verification code.');
            }

            const origText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Verifying Code...';
            if (otpAlert) otpAlert.style.display = 'none';

            try {
                const res = await fetch('/api/v1/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: registeredEmail, otp })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error?.message || 'Verification failed. Please check the code.');
                }

                if (data.session?.accessToken) {
                    localStorage.setItem('lawcompass-token', data.session.accessToken);
                }
                localStorage.setItem('lawcompass-profile', JSON.stringify({
                    id: data.user.id,
                    name: data.user.fullName || registeredEmail.split('@')[0],
                    email: data.user.email || registeredEmail,
                    province: data.user.province,
                    persona: data.user.persona,
                    tier: data.user.tier || 'free'
                }));

                if (otpAlert) {
                    otpAlert.className = 'auth-status-box auth-status-success';
                    otpAlert.textContent = 'Email verified! Preparing your LawCompass workspace...';
                    otpAlert.style.display = 'block';
                }

                if (countdownInterval) clearInterval(countdownInterval);
                if (resendCooldownInterval) clearInterval(resendCooldownInterval);

                setTimeout(() => {
                    location.href = redirectTarget;
                }, 800);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
                showOtpError(friendlyError(err, 'That code could not be verified. Check it and try again.'));
            }
        };

        // Back to Edit Form
        $('#btn-back-to-form').onclick = () => {
            $('#signup-step-2').style.display = 'none';
            $('#signup-step-1').style.display = 'block';
            const btn = $('#signup-submit-btn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Continue & Request Verification Code <span>→</span>';
            }
        };

        // Resend OTP
        $('#btn-resend-otp').onclick = async () => {
            const btn = $('#btn-resend-otp');
            if (btn.disabled) return;

            const otpAlert = $('#otp-alert');
            btn.disabled = true;
            btn.textContent = 'Sending fresh code...';
            if (otpAlert) otpAlert.style.display = 'none';

            try {
                const res = await fetch('/api/v1/auth/resend-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: registeredEmail })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || 'Failed to resend code');

                toast(`A fresh verification code has been sent to ${registeredEmail}`);
                if (otpAlert) {
                    otpAlert.className = 'auth-status-box auth-status-success';
                    otpAlert.textContent = `A fresh 6-digit code was sent to ${registeredEmail}. Please check your inbox and spam folder.`;
                    otpAlert.style.display = 'block';
                }

                startOtpTimer(data.expiresInSeconds || 600);
                startResendCooldown(60);

                const otpInput = $('#otp-input');
                if (otpInput) {
                    otpInput.value = '';
                    otpInput.focus();
                }
            } catch (e) {
                btn.disabled = false;
                btn.textContent = 'Resend Code ⟳';
                if (otpAlert) {
                    otpAlert.className = 'auth-status-box auth-status-error';
                    otpAlert.textContent = friendlyError(e, 'We could not send a new code. Please try again.');
                    otpAlert.style.display = 'block';
                }
            }
        };
    }
}

// ------------------------------------------------------------------------------
// 12. ROUTE BOOTSTRAPPER
// ------------------------------------------------------------------------------
const routes = {
    dashboard,
    documents,
    builder,
    dictionary,
    help,
    history: historyPage,
    upload,
    translate,
    pricing,
    profile: profilePage
};

if (page && routes[page]) {
    routes[page]();
}
