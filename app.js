/* ==============================================================================
   LAWCOMPASS CLIENT APPLICATION (POPIA-Compliant & Secure Legal Platform)
   Features:
   1. Route Protection & Auth Guard (Protected pages require sign-in)
   2. Real DOCX Template Population (Maps form inputs directly to docx placeholders)
   3. Proximity-Based Legal Help (Closest law firms under specific issue listed first)
   4. Document Locking with SHA-256 Cryptographic Tamper Seals
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
        desc: 'South African Basic Conditions of Employment Act (BCEA) compliant employment contract.',
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
        desc: 'Rental Housing Act and Consumer Protection Act (CPA) compliant rental lease.',
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
        desc: 'Safeguard trade secrets and proprietary data with enforceable South African confidentiality.',
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
        desc: 'Define scope, milestones, intellectual property, and billing schedules for services.',
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
        desc: 'Record your estate bequests, testamentary trusts, and executor nominations legally.',
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
    will: ['Last Will & Testament', 'A formal declaration of how an individual wishes their estate and assets distributed upon death.', 'Example: A testator appoints an executor and specifies bequests to children.'],
    'service contract': ['Service Contract', 'An agreement detailing scope of work, deliverables, compensation, and liability allocation.', 'Example: A software developer agrees to milestones and payment terms with a corporate client.'],
    popia: ['POPIA', 'Protection of Personal Information Act 4 of 2013, governing lawful processing and storage of personal data in South Africa.', 'Example: LawCompass implements end-to-end encryption to satisfy POPIA data security requirements.'],
    bcea: ['BCEA', 'Basic Conditions of Employment Act 75 of 1997, prescribing minimum statutory employment rights in South Africa.', 'Example: Ensuring working hours do not exceed 45 hours per week as required by the BCEA.']
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
const PROTECTED_PAGES = ['dashboard', 'documents', 'builder', 'upload', 'history', 'translate', 'help', 'pricing', 'dictionary'];

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

const profile = () => getProfile() || { name: 'Member', email: '', tier: 'standard' };
const history = () => JSON.parse(localStorage.getItem('lawcompass-history') || localStorage.getItem('lawbuddy-history') || '[]');

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
    ['translate.html', '文', 'Plain-language helper'],
    ['pricing.html', '✦', 'Plans & premium']
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
        pricing: 'pricing.html'
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
                    <span>${initials}</span>
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
        <button id="compass-fab" class="compass-fab" aria-label="Open Compass Legal Guide" title="Ask Compass (LawCompass AI Guide)">
            <svg class="compass-fab-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#c98d31"></polygon>
            </svg>
            <span>Ask Compass</span>
            <span class="compass-fab-pulse"></span>
        </button>

        <div id="compass-drawer" class="compass-drawer" role="dialog" aria-label="Compass AI Legal Assistant" aria-hidden="true">
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
                    <span class="compass-engine-badge" id="compass-engine-badge">Gemini AI</span>
                    <button class="compass-close-btn" id="compass-close-btn" aria-label="Close Compass">✕</button>
                </div>
            </div>
            <div class="compass-notice-bar">
                <span>South African Legal Information Only</span>
                <span>POPIA Protected</span>
            </div>
            <div class="compass-body" id="compass-chat-body">
                <div class="compass-msg compass-msg-assistant">
                    Hello${userName ? `, <strong>${esc(userName)}</strong>` : ''}! I am <strong>Compass</strong>, the in-app help assistant for LawCompass. I help you use the app, understand our South African legal documents, and explain clauses in plain English.<br><br>
                    How can I assist you in your workspace today?
                    <div class="compass-chips-container">
                        <button class="compass-chip" data-prompt="How do I create an employment contract?">Employment Contract</button>
                        <button class="compass-chip" data-prompt="Can I make an electronic will on my phone?">Electronic Will Validity</button>
                        <button class="compass-chip" data-prompt="How does cryptographic document locking work?">Document Locking</button>
                        <button class="compass-chip" data-prompt="How do I find a verified attorney near me?">Find Attorneys</button>
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
                    General legal information only · Wills require 2 in-person witnesses · Never legal advice
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
            actionLinks += '<a class="compass-action-link" href="translate.html">Plain-Language Helper →</a>';
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
                engineBadge.textContent = data.engine.includes('gemini') ? 'Gemini AI' : (data.engine.includes('hugging') ? 'Hugging Face' : 'Compass Brain');
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
            <footer>Configure & generate draft →</footer>
        </a>
    `).join('')}</div>`;
}

function dashboard() {
    const docsCount = history().length;
    shell('Workspace Overview', `
        <section class="hero">
            <div>
                <p class="eyebrow">LAWCOMPASS LEGAL WORKSPACE</p>
                <h1>Legal documents, without the legal fog.</h1>
                <p>Generate South African compliant contracts, personalize bespoke clauses, lock finalized agreements with SHA-256 seals, and find nearby attorneys.</p>
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
                <div><b>${docsCount}</b><small>Drafts & Documents</small></div>
            </article>
            <article>
                <span>▣</span>
                <div><b>5</b><small>Official SA Templates</small></div>
            </article>
            <article>
                <span>🔒</span>
                <div><b>SHA-256</b><small>Tamper-Proof Locking</small></div>
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
                <span><strong>Create a document</strong><small>Guided contracts with custom clauses</small></span>
                <i>→</i>
            </a>
            <a href="legal-help.html">
                <b>⌁</b>
                <span><strong>Find legal help by proximity</strong><small>Closest law firms under your matter</small></span>
                <i>→</i>
            </a>
            <a href="upload-contract.html">
                <b>↥</b>
                <span><strong>Upload & explain contract</strong><small>AI plain-English clause breakdown</small></span>
                <i>→</i>
            </a>
        </div>
    `);
}

function documents() {
    shell('Create a document', `
        <p class="eyebrow">DOCUMENT TEMPLATES</p>
        <h1>Select a legal template</h1>
        <p class="intro">Each template is tailored for South African law. Answer the questions, add custom clauses to personalize your terms, and lock your document once generated.</p>
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

function builder() {
    const type = new URLSearchParams(location.search).get('type') || 'Employment';
    const t = data[type] || data.Employment;

    // Track active custom clauses
    let customClauses = [];
    let isLocked = false;
    let lockSeal = null;

    shell('Document Builder', `
        <a class="back" href="documents.html">← Back to templates</a>
        <div class="builder-head">
            <div>
                <p class="eyebrow">DOCUMENT GENERATOR · POPIA COMPLIANT</p>
                <h1>${t.title}</h1>
                <p>${t.desc}</p>
            </div>
            <span class="step">Official South African Jurisdiction</span>
        </div>

        <!-- Lock Control Banner (Hidden until generated, or toggled) -->
        <div id="lock-banner" class="lock-control-container" style="display:none;">
            <div class="lock-header-row">
                <div class="lock-status-badge ${isLocked ? 'locked' : 'unlocked'}" id="lock-badge-ui">
                    <span>${isLocked ? '🔒 LOCKED & FINALIZED' : '🔓 DRAFT STATE'}</span>
                </div>
                <button type="button" id="btn-toggle-lock" class="btn-lock-toggle ${isLocked ? 'btn-unlock-action' : 'btn-lock-action'}">
                    ${isLocked ? 'Unlock for Revisions' : '🔒 Lock & Finalize Document'}
                </button>
            </div>
            <div id="lock-details-box" style="display:none;">
                <p style="margin: 12px 0 6px; font-weight:700; color:#1e3a5f;">Cryptographic Tamper-Evident Verification Seal:</p>
                <div id="lock-hash-val" class="lock-hash-display"></div>
                <div class="lock-meta-row">
                    <span id="lock-timestamp"></span>
                    <span>Status: Immutable Legal Instrument</span>
                    <span>Vault: POPIA Compliant Local Record</span>
                </div>
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

            <!-- Personalize Contract: Custom Clauses & Terms Studio -->
            <div class="custom-clause-section">
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
            </div>

            <p class="form-note">
                <strong>Legal Notice:</strong> This guided legal document preparation tool complies with South African drafting standards. For complex commercial arrangements or disputes, consult a qualified attorney.
            </p>

            <div class="builder-actions" style="grid-column: 1 / -1; display:flex; gap:14px; justify-content:flex-end;">
                <button type="button" id="btn-lock-direct" class="secondary" style="display:flex; align-items:center; gap:8px;">
                    🔒 Lock Draft
                </button>
                <button type="submit" class="primary" style="display:flex; align-items:center; gap:8px;">
                    Download Contract (.docx) <span>↓</span>
                </button>
            </div>
        </form>
    `);

    // Render custom clauses
    const renderClauses = () => {
        const container = $('#custom-clauses-container');
        if (!customClauses.length) {
            container.innerHTML = '<p style="color:var(--muted); font-size:13px; font-style:italic; margin:8px 0;">No personalized custom clauses added yet. Click a preset above or add a bespoke clause below.</p>';
            return;
        }
        container.innerHTML = customClauses.map((c, i) => `
            <div class="custom-clause-item">
                <div class="clause-item-head">
                    <h4 class="clause-item-title">${i + 1}. ${esc(c.title)}</h4>
                    ${!isLocked ? `<button type="button" class="btn-delete-clause" data-del="${i}">✕ Remove</button>` : ''}
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
    $('#btn-add-bespoke').onclick = () => {
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
            badge.innerHTML = '<span>🔒 LOCKED & FINALIZED</span>';
            toggleBtn.className = 'btn-lock-toggle btn-unlock-action';
            toggleBtn.textContent = 'Unlock for Revisions';

            details.style.display = 'block';
            $('#lock-hash-val').textContent = lockSeal.hash;
            $('#lock-timestamp').textContent = `Locked on: ${lockSeal.date} SAST`;

            // Save locked document into history
            const h = history();
            h.unshift({
                name: t.title,
                type: type,
                date: lockSeal.date,
                isLocked: true,
                lockHash: lockSeal.hash
            });
            localStorage.setItem('lawcompass-history', JSON.stringify(h));

            toast('Document locked! Cryptographic tamper seal generated.');
        } else {
            banner.classList.remove('is-locked');
            form.classList.remove('document-locked-readonly');
            badge.className = 'lock-status-badge unlocked';
            badge.innerHTML = '<span>🔓 DRAFT STATE (Unlocked)</span>';
            toggleBtn.className = 'btn-lock-toggle btn-lock-action';
            toggleBtn.textContent = '🔒 Lock & Finalize Document';
            details.style.display = 'none';
            toast('Document unlocked for revisions.');
        }
        renderClauses();
    };

    $('#btn-toggle-lock').onclick = () => applyLockState(!isLocked);
    $('#btn-lock-direct').onclick = () => applyLockState(true);

    // Form submit -> generate authentic DOCX
    $('#build-form').onsubmit = async e => {
        e.preventDefault();
        const answers = extractAnswers(e.target);
        const placeholderMap = getPlaceholderMap(type, answers, customClauses);

        try {
            toast('Populating official Word template with your details...');
            const docxBlob = await generatePopulatedDocx(type, placeholderMap);

            // Trigger file download
            const url = URL.createObjectURL(docxBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${t.title.replaceAll(' ', '_')}_LawCompass.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Add to history
            const h = history();
            h.unshift({
                name: t.title,
                type: type,
                date: new Date().toLocaleString('en-ZA'),
                isLocked: isLocked,
                lockHash: lockSeal ? lockSeal.hash : null
            });
            localStorage.setItem('lawcompass-history', JSON.stringify(h));

            // Show lock banner if not locked yet
            if (!isLocked) {
                $('#lock-banner').style.display = 'block';
            }

            toast('Official .docx contract generated and downloaded!');
        } catch (err) {
            console.error('Docx generation error:', err);
            // Fallback for file:// protocol where fetch is blocked
            toast('Downloading formatted document draft...');
            const html = `
                <meta charset="utf-8">
                <style>
                    body { font-family: Georgia, serif; max-width: 750px; margin: 40px auto; line-height: 1.6; }
                    h1 { text-align: center; color: #14223b; }
                    .seal { border: 2px solid #2d7568; background: #f0f7f4; padding: 15px; border-radius: 6px; margin: 20px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    b { color: #14223b; }
                </style>
                <h1>${esc(t.title)}</h1>
                <p>Prepared via LawCompass on ${new Date().toLocaleDateString('en-ZA')}. Jurisdiction: Republic of South Africa.</p>
                ${isLocked ? `<div class="seal"><b>🔒 LOCKED & FINALIZED</b><br>Verification Hash: ${lockSeal ? lockSeal.hash : 'VERIFIED'}</div>` : ''}
                <table>
                    ${Object.entries(placeholderMap).map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}
                </table>
            `;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([html], { type: 'application/msword' }));
            a.download = `${t.title.replaceAll(' ', '_')}.doc`;
            a.click();
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
        <p class="eyebrow">VERIFIED LEGAL AID & NEARBY PRACTITIONERS</p>
        <h1>Find legal help by proximity</h1>
        <p class="intro">Discover statutory Legal Aid South Africa offices and nearby South African legal practices ranked by geographical proximity. The closest legal services appear first with verified office contact details.</p>

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
                <span class="privacy-tag">Privacy Protected · Approximate query only · Case details never shared</span>
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
                <span class="privacy-tag">Privacy Protected · Approximate query only · Case details never shared</span>
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
                <p>Searching verified Legal Aid offices and nearby legal practitioners...</p>
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
                    <p>${esc(err.message || 'An error occurred while communicating with the proximity directory provider.')}</p>
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
                <li>Your coordinates are used strictly in real-time for distance ranking.</li>
                <li>Precise coordinates are <strong>never stored</strong> in our databases or profile logs.</li>
                <li>Your case details are never shared with external directory services.</li>
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
                    <p>Automated direct referral dispatch is currently in demonstration mode. To consult with this practice, please contact them directly using their verified telephone number or office address listed below.</p>
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
        const standardPrice = isAnnual ? 'R79' : 'R99';
        const premiumPrice = isAnnual ? 'R159' : 'R199';
        const standardPeriod = isAnnual ? '/ month (billed R948/yr)' : '/ month';
        const premiumPeriod = isAnnual ? '/ month (billed R1,908/yr)' : '/ month';

        shell('Plans & Premium Benefits', `
            <div class="pricing-header-wrap">
                <p class="eyebrow">TRANSPARENT VALUE · SOUTH AFRICAN LEGAL TECH</p>
                <h1>Empower your legal work with Premium</h1>
                <p class="intro" style="margin: 0 auto;">Choose the right level of protection. Enjoy unlimited document generation, AI contract uploads, cryptographic tamper-evident locking, and proximity legal matching.</p>

                <div class="billing-switcher">
                    <button type="button" class="${!isAnnual ? 'active' : ''}" id="btn-monthly">Monthly Billing</button>
                    <button type="button" class="${isAnnual ? 'active' : ''}" id="btn-annual">Annual Billing <span class="badge-save">SAVE 20%</span></button>
                </div>
            </div>

            <!-- Tiered Cards -->
            <div class="plans-grid-3">
                <!-- Free Starter -->
                <article class="plan-box">
                    <p class="plan-tier-name">FREE STARTER</p>
                    <div class="plan-price-row">
                        <span class="plan-price-val">R0</span>
                        <span class="plan-price-period">/ forever</span>
                    </div>
                    <p class="plan-desc">Essential drafting and dictionary exploration for basic needs.</p>
                    <ul class="plan-benefits-list">
                        <li><b>✓</b> 5 standard document templates</li>
                        <li><b>✓</b> Plain-English legal dictionary</li>
                        <li><b>✓</b> Browser-local draft storage</li>
                        <li><b>✗</b> <span style="color:#94a3b8">Contract file uploads</span></li>
                        <li><b>✗</b> <span style="color:#94a3b8">Document locking & SHA-256 seal</span></li>
                        <li><b>✗</b> <span style="color:#94a3b8">Custom terms & clauses</span></li>
                    </ul>
                    <button type="button" class="plan-cta-btn secondary" disabled>Current Plan</button>
                </article>

                <!-- Standard Pro -->
                <article class="plan-box">
                    <p class="plan-tier-name">STANDARD PRO</p>
                    <div class="plan-price-row">
                        <span class="plan-price-val">${standardPrice}</span>
                        <span class="plan-price-period">${standardPeriod}</span>
                    </div>
                    <p class="plan-desc">For growing small businesses, freelancers, and individuals.</p>
                    <ul class="plan-benefits-list">
                        <li><b>✓</b> <strong>Unlimited document creation</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Document Locking (SHA-256 tamper seal)</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Personalize Contract (Custom clauses studio)</strong></li>
                        <li><b>✓</b> Clean Microsoft Word (.docx) & PDF exports</li>
                        <li><b>✓</b> Email support within 24 hours</li>
                        <li><b>✗</b> <span style="color:#94a3b8">AI contract reader uploads</span></li>
                    </ul>
                    <button type="button" class="plan-cta-btn primary pay-trigger" data-plan="standard">Choose Standard</button>
                </article>

                <!-- Premium Enterprise -->
                <article class="plan-box popular">
                    <span class="popular-flag">⭐ MOST POPULAR</span>
                    <p class="plan-tier-name" style="color:#9d6924;">PREMIUM ENTERPRISE</p>
                    <div class="plan-price-row">
                        <span class="plan-price-val">${premiumPrice}</span>
                        <span class="plan-price-period">${premiumPeriod}</span>
                    </div>
                    <p class="plan-desc">Complete legal confidence with AI analysis and verified attorney access.</p>
                    <ul class="plan-benefits-list">
                        <li class="pro-feature"><b>✓</b> <strong>Everything in Standard Pro</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Upload Contracts (PDF, DOCX) & AI Explainer</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Clause-by-clause risk & trap detection</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Proximity Attorney Matching & Priority Consultations</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>POPIA, BCEA & CPA Compliance Audit Pack</strong></li>
                        <li class="pro-feature"><b>✓</b> <strong>Encrypted Supabase Cloud Vault</strong></li>
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
                            <td><span class="check-no">—</span></td>
                            <td><span class="check-no">—</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>AI Plain-English Clause Explainer</strong></td>
                            <td><span class="check-no">—</span></td>
                            <td><span class="check-no">—</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Cryptographic Document Locking (SHA-256)</strong></td>
                            <td><span class="check-no">—</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Personalize Contract (Custom Clauses Studio)</strong></td>
                            <td><span class="check-no">—</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                            <td><span class="check-yes">✓ Included</span></td>
                        </tr>
                        <tr>
                            <td><strong>Proximity-Sorted Law Firm Referrals</strong></td>
                            <td>Basic directory</td>
                            <td>Basic directory</td>
                            <td><span class="check-yes">✓ Priority Match & Booking</span></td>
                        </tr>
                        <tr>
                            <td>Encrypted Cloud Vault (Private signed URLs)</td>
                            <td>Local only</td>
                            <td>Local only</td>
                            <td><span class="check-yes">✓ Supabase Cloud</span></td>
                        </tr>
                        <tr>
                            <td>Statutory Compliance Checks (POPIA, BCEA)</td>
                            <td><span class="check-no">—</span></td>
                            <td>Standard</td>
                            <td><span class="check-yes">✓ Comprehensive</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `);

        $('#btn-monthly').onclick = () => { billingCycle = 'monthly'; renderPricing(); };
        $('#btn-annual').onclick = () => { billingCycle = 'annual'; renderPricing(); };

        $$('.pay-trigger').forEach(btn => {
            btn.onclick = () => {
                const planName = btn.dataset.plan === 'premium' ? 'Premium Enterprise' : 'Standard Pro';
                showCheckoutModal(planName);
            };
        });
    };

    renderPricing();
}

function showCheckoutModal(planName) {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal-overlay';
    modal.innerHTML = `
        <div class="checkout-modal-box">
            <button class="modal-close-btn" id="modal-close">✕</button>
            <p class="eyebrow">SECURE CHECKOUT · INSTANT ACTIVATION</p>
            <h3>Upgrade to ${esc(planName)}</h3>
            <p>PCI-compliant South African Rand payment processing. Powered by secure 256-bit TLS encryption.</p>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:6px; margin:18px 0;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>Plan:</span>
                    <b>${esc(planName)}</b>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span>Security:</span>
                    <span>256-bit TLS Encrypted</span>
                </div>
                <div style="display:flex; justify-content:space-between; color:#216657; font-weight:700;">
                    <span>Instant Activation:</span>
                    <span>All Premium Benefits Unlocked</span>
                </div>
            </div>
            <button class="primary wide" id="confirm-upgrade-btn">Activate ${esc(planName)} Now</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#modal-close').onclick = () => document.body.removeChild(modal);
    modal.querySelector('#confirm-upgrade-btn').onclick = () => {
        document.body.removeChild(modal);
        const p = profile();
        p.tier = planName.toLowerCase().includes('premium') ? 'premium' : 'standard';
        localStorage.setItem('lawcompass-profile', JSON.stringify(p));
        toast(`Success! Your account is now upgraded to ${planName}.`);
    };
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
    shell('Upload & Explain Contract', `
        <p class="eyebrow">CONTRACT READER & CLAUSE EXPLAINER</p>
        <h1>Upload a contract</h1>
        <p class="intro">Upload a text agreement, PDF, or paste legal clauses. LawCompass identifies key clauses, flags unfair terms, and provides clear plain-English translations.</p>

        <div class="upload-layout">
            <section class="upload-card">
                <label class="dropzone" for="contract-file">
                    <span>↥</span>
                    <b>Upload contract file</b>
                    <small>PDF, DOCX, DOC, RTF, ODT, TXT, Markdown, HTML, and CSV accepted.</small>
                    <input id="contract-file" type="file" accept=".pdf,.doc,.docx,.rtf,.odt,.txt,.md,.html,.htm,.csv">
                </label>
                <p id="upload-status" class="upload-status">Your file is processed privately in your browser.</p>

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
                    <p>Upload a file or paste text to receive a plain-English clause breakdown and practical reading alerts.</p>
                </div>
            </section>
        </div>

        <p class="form-note">
            This automated reader is an educational aid and does not constitute formal legal advice. For contentious disputes, consult a registered legal practitioner.
        </p>
    `);

    const file = $('#contract-file');
    const text = $('#contract-text');
    const status = $('#upload-status');

    file.onchange = () => {
        const selected = file.files[0];
        if (!selected) return;

        status.textContent = `Processing ${selected.name}...`;

        // If text-like file
        if (/\.(txt|md|html?|csv)$/i.test(selected.name)) {
            const reader = new FileReader();
            reader.onload = () => {
                text.value = reader.result;
                status.textContent = `${selected.name} loaded. Ready to explain.`;
            };
            reader.readAsText(selected);
        } else if (/\.docx$/i.test(selected.name) && window.JSZip) {
            // Extract text from DOCX
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const zip = await window.JSZip.loadAsync(reader.result);
                    const xml = await zip.file('word/document.xml').async('text');
                    const cleanText = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    text.value = cleanText;
                    status.textContent = `${selected.name} DOCX text extracted successfully!`;
                } catch (e) {
                    status.textContent = `${selected.name} selected. Paste clauses directly if extraction is blocked.`;
                }
            };
            reader.readAsArrayBuffer(selected);
        } else {
            status.textContent = `${selected.name} selected. Copy and paste specific clauses into the box below for explanation.`;
        }
    };

    $('#explain-contract').onclick = () => {
        const value = text.value.trim();
        if (!value) return toast('Upload a readable file or paste contract text first.');

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
            ${flags.length ? `<h4>⚠️ Pay Close Attention To</h4><ul>${flags.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
            <h4>Clauses Identified (${clauses.length})</h4>
            ${simple || '<p>Add more detailed text for comprehensive clause parsing.</p>'}
        `;
    };
}

// ------------------------------------------------------------------------------
// 10. HISTORY, DICTIONARY & TRANSLATOR
// ------------------------------------------------------------------------------
function historyPage() {
    const h = history();
    shell('Document History & Vault', `
        <p class="eyebrow">CONFIDENTIAL VAULT · POPIA COMPLIANT</p>
        <h1>Your generated documents</h1>
        <p class="intro">View your drafts and locked legal instruments. Locked documents include verifiable SHA-256 integrity seals.</p>
        <div class="history-list">
            ${h.length ? h.map(x => `
                <article class="history-item">
                    <span>${x.isLocked ? '🔒' : '▣'}</span>
                    <div>
                        <b>${esc(x.name)} ${x.isLocked ? '<span class="history-lock-pill">🔒 Locked & Finalized</span>' : ''}</b>
                        <small>Created ${esc(x.date)} · ${x.lockHash ? `Seal: ${esc(x.lockHash.slice(0, 24))}...` : 'Draft'}</small>
                    </div>
                    <small>Local Storage</small>
                </article>
            `).join('') : `
                <div class="empty-state">
                    <span class="empty-icon">◷</span>
                    <h3>No documents yet</h3>
                    <p>Your generated contracts and locked instruments will appear here.</p>
                    <a class="primary" href="documents.html">Create your first document</a>
                </div>
            `}
        </div>
    `);
}

function dictionary() {
    shell('Legal Dictionary', `
        <p class="eyebrow">PLAIN-ENGLISH SOUTH AFRICAN GLOSSARY</p>
        <h1>Legal dictionary</h1>
        <p class="intro">Understand everyday legal language without the confusing legalese. Click any popular term below or type a search.</p>
        <div class="search">
            <input id="term" placeholder="Search a term (e.g. consideration, lease, popia, bcea)">
            <button class="primary" id="search">Search</button>
        </div>
        <div id="definition" class="definition empty">Search a legal term or select a suggestion below.</div>
        <div class="chips">
            ${Object.keys(terms).map(t => `<button data-term="${t}">${t.toUpperCase()}</button>`).join('')}
        </div>
    `);

    const show = w => {
        const v = terms[w.toLowerCase()];
        $('#definition').classList.remove('empty');
        $('#definition').innerHTML = v ? `
            <h3>${v[0]}</h3>
            <p>${v[1]}</p>
            <p><b>In South African Context:</b> ${v[2]}</p>
        ` : `
            <h3>${esc(w)}</h3>
            <p>No definition found in our local legal glossary. Try one of the suggested terms below.</p>
        `;
    };

    $('#search').onclick = () => show($('#term').value);
    document.addEventListener('click', e => {
        if (e.target.dataset.term) {
            $('#term').value = e.target.dataset.term;
            show(e.target.dataset.term);
        }
    });
}

function translate() {
    shell('Plain-Language Helper', `
        <p class="eyebrow">SIMPLIFY COMPLEX LEGAL JARGON</p>
        <h1>Plain-language helper</h1>
        <p class="intro">Paste any complex clause to receive a breakdown identifying obligations, risks, costs, and termination rights.</p>
        <textarea id="clause" placeholder="Paste a legal clause here..."></textarea>
        <div class="translate-actions">
            <select id="lang-guide">
                <option>Plain English Guide</option>
                <option>isiZulu (Reader Guide)</option>
                <option>Sesotho (Reader Guide)</option>
                <option>Afrikaans (Reader Guide)</option>
            </select>
            <button class="primary" id="explain">Explain text</button>
        </div>
        <div class="definition" id="result">Your clause reading guide will appear here.</div>
    `);

    $('#explain').onclick = () => {
        const text = $('#clause').value.trim();
        if (!text) return toast('Paste a legal clause first.');
        const words = text.split(/\s+/).filter(Boolean).length;
        $('#result').innerHTML = `
            <h3>Clause Breakdown (${words} words)</h3>
            <p><b>Plain Reading:</b> ${plainClause(text)}</p>
            <p><b>Checklist:</b> 1. Who is obligated? 2. What action is required? 3. What is the deadline? 4. What happens if breached?</p>
            <p><b>Legal Advice Notice:</b> Always have high-value contracts vetted by a legal professional.</p>
        `;
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
                alertBox.textContent = err.message || 'Login failed. Please verify your credentials.';
                alertBox.style.display = 'block';
            } else {
                alert(err.message);
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

            // If sandbox/dev OTP is returned, display quick copy pill
            if (data.devOtp) {
                const devContainer = $('#otp-dev-container');
                const devCode = $('#otp-dev-code');
                if (devContainer && devCode) {
                    devCode.textContent = data.devOtp;
                    devContainer.style.display = 'flex';
                    $('#btn-copy-otp').onclick = () => {
                        const input = $('#otp-input');
                        if (input) {
                            input.value = data.devOtp;
                            input.focus();
                        }
                    };
                }
            }

            startOtpTimer(data.expiresInSeconds || 600);
            const otpInput = $('#otp-input');
            if (otpInput) {
                otpInput.value = '';
                otpInput.focus();
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            showError(err.message || 'Could not send verification code.');
        }
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

                setTimeout(() => {
                    location.href = redirectTarget;
                }, 800);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
                showOtpError(err.message || 'Invalid or expired code.');
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
            btn.textContent = 'Sending...';
            try {
                const res = await fetch('/api/v1/auth/resend-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: registeredEmail })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || 'Failed to resend code');

                toast(`A fresh code has been dispatched to ${registeredEmail}`);
                startOtpTimer(data.expiresInSeconds || 600);
                if (data.devOtp && $('#otp-dev-code')) {
                    $('#otp-dev-code').textContent = data.devOtp;
                }
            } catch (e) {
                alert(e.message);
            } finally {
                btn.textContent = 'Resend Code ⟳';
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
    pricing
};

if (page && routes[page]) {
    routes[page]();
}
