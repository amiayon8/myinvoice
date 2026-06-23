require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase Client dynamically to prevent crash if env variables are not set yet
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully.");
} else {
    console.warn("WARNING: SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Supabase operations will be bypassed.");
}

// ----------------------------------------------------
// CORS MIDDLEWARE SETUP WITH CREDENTIALS SUPPORT
// ----------------------------------------------------
app.use(cors({
    origin: function (origin, callback) {
        // Echo back the requesting origin to support credentials: true
        // This resolves CORS warnings when testing localhost or subdomains
        callback(null, true);
    },
    credentials: true
}));

// Serve static dashboard files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
async function requireAuth(req, res, next) {
    if (!supabase) {
        return res.status(500).json({ error: "Server Configuration Error: Supabase client is not initialized." });
    }

    try {
        let token = null;

        // 1. Extract from Authorization Header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // 2. Extract from Cookies (wildcard subdomains cookies fallback)
        if (!token && req.headers.cookie) {
            const cookies = {};
            req.headers.cookie.split(';').forEach(c => {
                const parts = c.trim().split('=');
                if (parts.length === 2) {
                    cookies[parts[0]] = parts[1];
                }
            });

            // Look for any standard Supabase token keys
            const tokenCookieKey = Object.keys(cookies).find(k => k.includes('auth-token') || k === 'sb-access-token');
            if (tokenCookieKey) {
                const cookieVal = decodeURIComponent(cookies[tokenCookieKey]);
                try {
                    const parsed = JSON.parse(cookieVal);
                    token = parsed.access_token || parsed[0] || cookieVal;
                } catch {
                    token = cookieVal;
                }
            }
        }

        if (!token) {
            return res.status(401).json({ error: "Unauthorized: Missing authentication token." });
        }

        // 3. Retrieve user from Supabase verification endpoint
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
        }

        // 4. Attach user context to request
        req.user = user;
        next();

    } catch (err) {
        console.error("Auth Middleware Error: ", err);
        return res.status(401).json({ error: "Unauthorized: Authentication check failed." });
    }
}

// ----------------------------------------------------
// DATABASE GENERATION LOGGING HELPER
// ----------------------------------------------------
async function logGeneration(userId, userEmail, documentType, reqBody, reqIp) {
    if (!supabase) return;

    try {
        const clientName = reqBody.client?.name || reqBody.disclosingParty?.name || 'Unknown Client';
        const projectName = reqBody.project?.name || 'Unknown Project';

        const { error } = await supabase
            .from('document_generations')
            .insert([
                {
                    user_id: userId,
                    user_email: userEmail,
                    document_type: documentType,
                    client_name: clientName,
                    project_name: projectName,
                    request_ip: reqIp,
                    payload: reqBody
                }
            ]);

        if (error) {
            console.error("Failed to log generation in Supabase:", error);
        } else {
            console.log(`Successfully logged ${documentType} generation in database for ${userEmail}`);
        }
    } catch (err) {
        console.error("logGeneration helper crash:", err);
    }
}

// Deep merge helper to allow customization while falling back to logical default legal clauses
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

// ----------------------------------------------------
// DEFAULT LOGICAL & LEGAL CLAUSE TEMPLATES
// ----------------------------------------------------

const defaultDeveloper = {
    name: "Acme Web Solutions",
    representative: "Sarker Ayon",
    email: "john@acmeweb.com",
    address: "123 Tech Hub Suite A, San Francisco, CA 94107",
    website: "https://acmeweb.com"
};

const defaultClient = {
    name: "Stellar Startups Inc.",
    company: "Stellar Startups Inc.",
    representative: "Jane Smith",
    email: "jane@stellar.io",
    address: "456 Launchpad Way, Austin, TX 78701"
};

const defaultProject = {
    name: "Enterprise Dashboard Portal",
    summary: "A secure web portal for managing enterprise resource planning and reporting data."
};

// Generic PDF Response engine
async function generatePDFResponse(res, templateName, data, fileName) {
    try {
        const templatePath = path.join(__dirname, 'templates', `${templateName}.ejs`);

        // 1. Render EJS template with parsed/merged data
        const html = await ejs.renderFile(templatePath, data);

        // 2. Launch Puppeteer to render HTML to A4 PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }, // Controlled via CSS in templates
            printBackground: true
        });

        await browser.close();

        // 3. Send PDF back as attachment stream
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
        return res.send(pdfBuffer);

    } catch (error) {
        console.error(`PDF Generation Error for ${templateName}: `, error);
        return res.status(500).json({ error: `Failed to generate ${templateName} document.` });
    }
}

// Public config route to share Supabase client settings safely with frontend
app.get('/api/supabase-config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    });
});

// ----------------------------------------------------
// SECURED API ROUTES
// ----------------------------------------------------

/**
 * Endpoint 1: Service Agreement / Development Contract
 */
app.post('/api/documents/contract', requireAuth, async (req, res) => {
    const defaultData = {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        currency: "৳ ",
        developer: defaultDeveloper,
        client: defaultClient,
        project: defaultProject,
        pricing: {
            total: "15,000",
            advance: "5,000",
            hourlyRate: "150",
            paymentTermsDays: 15
        },
        milestones: [
            { name: "Phase 1: Architecture & UI Designs", dueDate: "July 15, 2026", paymentAmount: "5,000" },
            { name: "Phase 2: Core Development & APIs", dueDate: "August 30, 2026", paymentAmount: "5,000" }
        ],
        revisions: {
            limit: 3
        },
        termination: {
            noticeDays: 14
        },
        legal: {
            governingLaw: "the State of California",
            jurisdiction: "San Francisco County, California"
        }
    };

    const merged = deepMerge(defaultData, req.body);
    const clientName = merged.client.name.replace(/\s+/g, '_');

    // Log the generation asynchronously
    logGeneration(req.user.id, req.user.email, 'contract', merged, req.ip);

    await generatePDFResponse(res, 'contract', merged, `Contract_${clientName}`);
});

/**
 * Endpoint 2: Scope of Work (SOW)
 */
app.post('/api/documents/sow', requireAuth, async (req, res) => {
    const defaultData = {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        developer: defaultDeveloper,
        client: defaultClient,
        project: defaultProject,
        features: [
            { title: "User Authentication & Roles", description: "Secure signup, signin, and password resets using JWT tokens. Role-based access control for Admins, Managers, and general Staff." },
            { title: "Reporting Dashboard & Analytics", description: "Visual data widgets displaying financial metrics and operations logs, including custom charts generated via Chart.js." },
            { title: "Stripe Payment Gateway", description: "Secure credit card checkouts, automated invoices, and transaction state synchronization using webhooks." }
        ],
        pages: [
            { name: "Landing Dashboard", description: "Operational overview displaying aggregate stats and recent client logs." },
            { name: "Payments / Invoicing Page", description: "Lists all recent billing statements with download capabilities and checkout links." },
            { name: "Settings Management Panel", description: "Enables users to customize profile information, set alert preferences, and toggle security." }
        ],
        techStack: {
            frontend: "React.js with Next.js Framework & Tailwind CSS",
            backend: "Node.js with Express API & Prisma ORM Engine",
            database: "PostgreSQL Database Engine hosted on Supabase",
            other: "GitHub Actions CI/CD pipeline, Vercel Application hosting",
            thirdPartyApis: "Stripe API for Checkouts, SendGrid for transactional notifications"
        },
        exclusions: [
            "Native Mobile Apps creation (iOS and Android client stores)",
            "Legacy data cleanup or data parsing from existing spreadsheets",
            "SEO copy campaign creation and marketing execution"
        ],
        clientDependencies: [
            "Provisioning of Stripe Sandbox credentials and dashboard access keys",
            "Provisioning of domain registers, SSL redirects, and DNS registers",
            "Branding materials: vector logos, specific font licenses, and color styling assets"
        ]
    };

    const merged = deepMerge(defaultData, req.body);
    const clientName = merged.client.name.replace(/\s+/g, '_');

    // Log the generation asynchronously
    logGeneration(req.user.id, req.user.email, 'sow', merged, req.ip);

    await generatePDFResponse(res, 'sow', merged, `SOW_${clientName}`);
});

/**
 * Endpoint 3: Proposal Document
 */
app.post('/api/documents/proposal', requireAuth, async (req, res) => {
    const defaultData = {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        developer: defaultDeveloper,
        client: defaultClient,
        project: defaultProject,
        problem: "The Client currently manages operational data and reports using fragmented spreadsheets and manual input. This setup creates administrative backlogs, increases reporting inaccuracies, and slows down executive decisions.",
        solution: "We propose developing a unified, web-based Enterprise Dashboard Portal. This application will automate database reports, secure client authorization, and integrate payment collections, reducing admin efforts by up to 40%.",
        currency: "৳ ",
        pricing: {
            total: "15,000",
            advance: "5,000"
        },
        phases: [
            { name: "Phase 1: Discovery & Interface Prototypes", duration: "1-2 Weeks", description: "Interactive wireframes design, database architecture mapping, and API routing designs." },
            { name: "Phase 2: Core Engineering Sprints", duration: "4-6 Weeks", description: "Database integrations, API endpoints implementation, UI components creation, and security checks." },
            { name: "Phase 3: QA, Tuning & Launch Support", duration: "1-2 Weeks", description: "Cross-device browser verification, server configuration, domain mapping, and staff onboarding." }
        ],
        pricingOptions: [
            { name: "MVP Core Package", description: "Includes core dashboard components, standard database, 30 days post-launch support, and hosting config.", amount: "10,000" },
            { name: "Standard Complete Package", description: "Includes SOW specs, full Stripe payment suite, custom notifications, and 90 days support.", amount: "15,000" },
            { name: "Enterprise Premium Package", description: "Includes complete dashboard, multi-tenant databases, SMS alerts, and 6 months dedicated maintenance support.", amount: "22,000" }
        ],
        whyUs: [
            "Over 8 years of specialized experience engineering secure, scale-ready SaaS platforms.",
            "High availability communication: Direct Discord access, daily Git commit logs, and weekly demo deployments.",
            "Strong security defaults: Encrypted environment configs, safe authentication, and automated backup strategies."
        ]
    };

    const merged = deepMerge(defaultData, req.body);
    const clientName = merged.client.name.replace(/\s+/g, '_');

    // Log the generation asynchronously
    logGeneration(req.user.id, req.user.email, 'proposal', merged, req.ip);

    await generatePDFResponse(res, 'proposal', merged, `Proposal_${clientName}`);
});

/**
 * Endpoint 4: Maintenance / Support Agreement
 */
app.post('/api/documents/maintenance', requireAuth, async (req, res) => {
    const defaultData = {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        termMonths: "6",
        monthlyFee: "1,200",
        currency: "৳ ",
        developer: defaultDeveloper,
        client: defaultClient,
        project: defaultProject,
        supportHoursAllowance: "5",
        maintenanceScope: [
            "Ongoing package dependencies auditing and version security patch updates.",
            "Periodic database structure optimizations and index health reviews.",
            "Continuous application uptime monitoring with email alerts.",
            "Up to 5 hours/month of minor styling adjustments, text modifications, or layout fixes.",
            "Weekly automated backup verifications and off-site archives."
        ],
        responseTimeSLA: {
            critical: "4",
            normal: "24"
        },
        extraHourlyRate: "150",
        terminationNoticeDays: "30"
    };

    const merged = deepMerge(defaultData, req.body);
    const clientName = merged.client.name.replace(/\s+/g, '_');

    // Log the generation asynchronously
    logGeneration(req.user.id, req.user.email, 'maintenance', merged, req.ip);

    await generatePDFResponse(res, 'maintenance', merged, `Maintenance_${clientName}`);
});

/**
 * Endpoint 5: NDA (Non-Disclosure Agreement)
 */
app.post('/api/documents/nda', requireAuth, async (req, res) => {
    const defaultData = {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        disclosingParty: defaultClient,
        receivingParty: defaultDeveloper,
        purpose: "Evaluating, designing, building, and delivering software services and enterprise integrations for the Enterprise Dashboard Portal project.",
        activeTermYears: "2",
        survivalYears: "3",
        governingState: "the State of California",
        jurisdiction: "San Francisco County, California"
    };

    const merged = deepMerge(defaultData, req.body);
    const clientName = (merged.disclosingParty.name === defaultClient.name)
        ? merged.disclosingParty.name.replace(/\s+/g, '_')
        : merged.receivingParty.name.replace(/\s+/g, '_');

    // Log the generation asynchronously
    logGeneration(req.user.id, req.user.email, 'nda', merged, req.ip);

    await generatePDFResponse(res, 'nda', merged, `NDA_${clientName}`);
});

/**
 * Endpoint 6: Handover Document
 */
app.post('/api/documents/handover', requireAuth, async (req, res) => {
    const defaultData = {
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        developer: defaultDeveloper,
        client: defaultClient,
        project: defaultProject,
        git: {
            url: "https://github.com/stellar-startups-inc/enterprise-dashboard-portal.git",
            mainBranch: "main",
            stagingBranch: "develop"
        },
        deployment: {
            productionHost: "Vercel Enterprise & AWS RDS Database Engine",
            productionUrl: "https://dashboard.stellarstartups.io",
            stagingUrl: "https://staging-dashboard.stellarstartups.io",
            adminUrl: "https://dashboard.stellarstartups.io/admin-console"
        },
        credentials: [
            { service: "GitHub Organization", url: "https://github.com", username: "stellar-admin@stellar.io", actionRequired: "Transfer primary ownership and remove developer rights." },
            { service: "AWS Console Access", url: "https://aws.amazon.com", username: "aws-admin-dev", actionRequired: "Rotate root security keys and modify access passwords." },
            { service: "Stripe Production dashboard", url: "https://stripe.com", username: "payments-billing@stellar.io", actionRequired: "Remove Developer webhook credentials and rotate signing keys." },
            { service: "Supabase Cloud Database", url: "https://supabase.com", username: "postgres-main-admin", actionRequired: "Update PostgreSQL root db key." }
        ],
        environmentVariables: [
            { key: "DATABASE_URL", description: "Postgres connection string containing DB username, address, and security key credentials.", exampleValue: "postgresql://postgres:********@aws-rds-endpoint.com:5432/main_db" },
            { key: "NEXTAUTH_SECRET", description: "Cryptographically randomized token key used by NextAuth to sign and verify security session webhooks.", exampleValue: "71a9a8385bf7de534d0bce628...8cb1" },
            { key: "STRIPE_SECRET_KEY", description: "Stripe API private token for transactions.", exampleValue: "sk_live_51N...8u2" },
            { key: "SENDGRID_API_KEY", description: "SendGrid authentication key token for transactional emails delivery.", exampleValue: "SG.yH98s...Jk2" }
        ],
        localSetup: {
            nodeVersion: "18.16.0",
            installCommand: "npm install",
            dbCommand: "npx prisma db push",
            runCommand: "npm run dev"
        }
    };

    const merged = deepMerge(defaultData, req.body);
    const clientName = merged.client.name.replace(/\s+/g, '_');

    // Log the generation asynchronously
    logGeneration(req.user.id, req.user.email, 'handover', merged, req.ip);

    await generatePDFResponse(res, 'handover', merged, `Handover_${clientName}`);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Contract Engine running on port ${PORT}`));