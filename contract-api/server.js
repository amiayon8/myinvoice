require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Initialize Supabase Client dynamically to prevent crash if env variables are not set yet
let supabase = null;
let supabaseAdmin = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully.");
} else {
    console.warn("WARNING: SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Supabase operations will be bypassed.");
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (process.env.SUPABASE_URL && supabaseServiceKey) {
    supabaseAdmin = createClient(process.env.SUPABASE_URL, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
    console.log("Supabase Admin Client (Service Role) initialized successfully.");
} else {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not configured. Admin database operations will use anon client.");
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
    const client = supabaseAdmin || supabase;
    if (!client) return;

    try {
        const clientName = reqBody.client?.name || reqBody.disclosingParty?.name || 'Unknown Client';
        const projectName = reqBody.project?.name || 'Unknown Project';

        const { error } = await client
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
    name: "The Nice Developer",
    representative: "Sarker Ayon",
    email: "hello@thenicedev.xyz",
    address: "House 12, Road 5, Dhanmondi, Dhaka-1209, Bangladesh",
    website: "https://thenicedev.xyz"
};

const defaultClient = {
    name: "Event Management",
    company: "Event Management",
    representative: "Sajjadul Islam Ontor",
    email: "event@management.com",
    address: "House 45, Road 2, Gulshan-1, Dhaka-1212, Bangladesh"
};

const defaultProject = {
    name: "Event Management Portfolio Website",
    summary: "A premium portfolio website for showcasing event management projects, booking services, and client communications."
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
            total: "25,000",
            advance: "10,000",
            hourlyRate: "1,500",
            paymentTermsDays: 15
        },
        milestones: [
            { name: "Phase 1: Architecture & UI Designs", dueDate: "July 15, 2026", paymentAmount: "10,000" },
            { name: "Phase 2: Core Development & APIs", dueDate: "August 30, 2026", paymentAmount: "15,000" }
        ],
        revisions: {
            limit: 3
        },
        termination: {
            noticeDays: 14
        },
        legal: {
            governingLaw: "the laws of the People's Republic of Bangladesh",
            jurisdiction: "Dhaka, Bangladesh"
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
        problem: "The Client currently has no central web platform to showcase their event management projects, handle customer bookings, and collect initial event deposits. This leads to inefficient communication and lost booking opportunities.",
        solution: "We propose building a premium Event Management Portfolio Website. This platform will showcase past events, allow prospective clients to submit booking inquiries, and pay booking deposits online, driving engagement and streamlining reservations.",
        currency: "৳ ",
        pricing: {
            total: "25,000",
            advance: "10,000"
        },
        phases: [
            { name: "Phase 1: Discovery & Interface Prototypes", duration: "1-2 Weeks", description: "Interactive wireframes design, database architecture mapping, and API routing designs." },
            { name: "Phase 2: Core Engineering Sprints", duration: "4-6 Weeks", description: "Database integrations, API endpoints implementation, UI components creation, and security checks." },
            { name: "Phase 3: QA, Tuning & Launch Support", duration: "1-2 Weeks", description: "Cross-device browser verification, server configuration, domain mapping, and staff onboarding." }
        ],
        pricingOptions: [
            { name: "MVP Core Package", description: "Includes core portfolio components, standard booking forms, 30 days post-launch support, and hosting config.", amount: "15,000" },
            { name: "Standard Complete Package", description: "Includes SOW specs, full online deposit checkout, client inquiry system, and 90 days support.", amount: "25,000" },
            { name: "Enterprise Premium Package", description: "Includes complete website, multi-page layout, custom SMS/Email alerts, and 6 months dedicated maintenance support.", amount: "40,000" }
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
        monthlyFee: "5,000",
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
        extraHourlyRate: "1,500",
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
        purpose: "Evaluating, designing, building, and delivering software services and portfolio integrations for the Event Management Portfolio Website project.",
        activeTermYears: "2",
        survivalYears: "3",
        governingState: "the People's Republic of Bangladesh",
        jurisdiction: "Dhaka, Bangladesh"
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
            url: "https://github.com/thenicedev/event-management-portfolio.git",
            mainBranch: "main",
            stagingBranch: "develop"
        },
        deployment: {
            productionHost: "Vercel & Supabase Cloud",
            productionUrl: "https://eventmanagement.com.bd",
            stagingUrl: "https://staging.eventmanagement.com.bd",
            adminUrl: "https://eventmanagement.com.bd/admin"
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

// ----------------------------------------------------
// GEMINI AI DOCUMENT GENERATION
// ----------------------------------------------------

function getSchemaForType(documentType) {
    switch (documentType) {
        case 'contract':
            return {
                date: "Current Date (e.g. October 12, 2026)",
                currency: "৳ ",
                developer: { name: "Developer Company Name", representative: "Representative Name", email: "developer@email.com", address: "Full Address, Bangladesh", website: "https://developerwebsite.com" },
                client: { name: "Client Company Name", company: "Company Name", representative: "Representative Name", email: "client@email.com", address: "Full Address, Bangladesh" },
                project: { name: "Project Title", summary: "Brief Project Summary details" },
                pricing: { total: "Total Price (e.g. 25,000)", advance: "Advance Deposit (e.g. 10,000)", hourlyRate: "Hourly Rate (e.g. 1,500)", paymentTermsDays: 15 },
                milestones: [ { name: "Milestone name", dueDate: "DueDate", paymentAmount: "Amount" } ],
                revisions: { limit: 3 },
                termination: { noticeDays: 14 },
                legal: { governingLaw: "the laws of the People's Republic of Bangladesh", jurisdiction: "Dhaka, Bangladesh" }
            };
        case 'sow':
            return {
                date: "Current Date",
                developer: { name: "Developer Company Name", representative: "Representative Name", email: "developer@email.com", address: "Full Address, Bangladesh", website: "https://developerwebsite.com" },
                client: { name: "Client Company Name", company: "Company Name", representative: "Representative Name", email: "client@email.com", address: "Full Address, Bangladesh" },
                project: { name: "Project Title", summary: "Brief Project Summary details" },
                features: [ { title: "Feature Title", description: "Detailed Feature description" } ],
                pages: [ { name: "Page Name", description: "Detailed Page Description" } ],
                techStack: { frontend: "Frontend Stack details", backend: "Backend Stack details", database: "Database details", other: "Other setup details", thirdPartyApis: "APIs used" },
                exclusions: [ "Exclusion 1 details", "Exclusion 2 details" ],
                clientDependencies: [ "Dependency 1 details", "Dependency 2 details" ]
            };
        case 'proposal':
            return {
                date: "Current Date",
                validUntil: "Valid until Date",
                developer: { name: "Developer Company Name", representative: "Representative Name", email: "developer@email.com", address: "Full Address, Bangladesh", website: "https://developerwebsite.com" },
                client: { name: "Client Company Name", company: "Company Name", representative: "Representative Name", email: "client@email.com", address: "Full Address, Bangladesh" },
                project: { name: "Project Title", summary: "Brief Project Summary details" },
                problem: "Detailed Problem Statement",
                solution: "Proposed Solution Statement",
                currency: "৳ ",
                pricing: { total: "Total Amount", advance: "Advance Deposit" },
                phases: [ { name: "Phase Name", duration: "Duration details", description: "Phase description details" } ],
                pricingOptions: [ { name: "Package Name", description: "Package details", amount: "Amount" } ],
                whyUs: [ "Reason 1", "Reason 2" ]
            };
        case 'maintenance':
            return {
                date: "Current Date",
                termMonths: "6",
                monthlyFee: "5,000",
                currency: "৳ ",
                developer: { name: "Developer Company Name", representative: "Representative Name", email: "developer@email.com", address: "Full Address, Bangladesh", website: "https://developerwebsite.com" },
                client: { name: "Client Company Name", company: "Company Name", representative: "Representative Name", email: "client@email.com", address: "Full Address, Bangladesh" },
                project: { name: "Project Title", summary: "Brief Project Summary details" },
                supportHoursAllowance: "5",
                maintenanceScope: [ "Scope item 1 details", "Scope item 2 details" ],
                responseTimeSLA: { critical: "4", normal: "24" },
                extraHourlyRate: "1,500",
                terminationNoticeDays: "30"
            };
        case 'nda':
            return {
                date: "Current Date",
                disclosingParty: { name: "Disclosing Company Name", company: "Disclosing Company Name", representative: "Representative Name", email: "disclosing@email.com", address: "Full Address, Bangladesh" },
                receivingParty: { name: "Receiving Company Name", representative: "Representative Name", email: "receiving@email.com", address: "Full Address, Bangladesh", website: "https://receivingwebsite.com" },
                purpose: "Purpose of disclosing confidential info",
                activeTermYears: "2",
                survivalYears: "3",
                governingState: "the People's Republic of Bangladesh",
                jurisdiction: "Dhaka, Bangladesh"
            };
        case 'handover':
            return {
                date: "Current Date",
                developer: { name: "Developer Company Name", representative: "Representative Name", email: "developer@email.com", address: "Full Address, Bangladesh", website: "https://developerwebsite.com" },
                client: { name: "Client Company Name", company: "Company Name", representative: "Representative Name", email: "client@email.com", address: "Full Address, Bangladesh" },
                project: { name: "Project Title", summary: "Brief Project Summary details" },
                git: { url: "Git repository URL", mainBranch: "main", stagingBranch: "develop" },
                deployment: { productionHost: "Prod Host details", productionUrl: "Prod URL", stagingUrl: "Staging URL", adminUrl: "Admin URL" },
                credentials: [ { service: "Service Name", url: "Login URL", username: "Username", actionRequired: "Action required on handover" } ],
                environmentVariables: [ { key: "ENV_KEY_NAME", description: "What it is", exampleValue: "Example format value" } ],
                localSetup: { nodeVersion: "18.x", installCommand: "npm install", dbCommand: "npx prisma db push", runCommand: "npm run dev" }
            };
        default:
            return {};
    }
}

app.post('/api/documents/ai/generate', requireAuth, async (req, res) => {
    const { documentType, industry, prompt: userPrompt } = req.body;
    
    if (!documentType) {
        return res.status(400).json({ error: "Missing required parameter: documentType" });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to the .env file in the root workspace or contract-api directory." 
        });
    }
    
    try {
        const schema = getSchemaForType(documentType);
        
        const systemPrompt = `You are an AI assistant specialized in generating professional legal and technical project documents for freelancers, developers, and clients.
Your task is to generate a highly realistic JSON payload for a document of type "${documentType}".
The user's business industry: "${industry || 'General Web Development'}"
The user's custom details/prompt: "${userPrompt || 'Create a standard project document'}"

You must return a JSON object that adheres strictly to the structure of the following schema:
${JSON.stringify(schema, null, 2)}

Instructions:
1. Populate all fields of the schema.
2. Analyze the requested business type/industry and prompt. Generate realistic, highly tailored details. For example, if the industry is "Doctor Clinic", make the features, project name, scope, milestones, or exclusions related to healthcare, online booking, EHR, prescriptions, etc. If the industry is "Event Management", milestones/features should be about venue bookings, event listings, galleries, ticket sales, etc.
3. Make default addresses, names (e.g. using common Bangladeshi names like Sajjadul Islam Ontor, Sarker Ayon), laws (e.g. the People's Republic of Bangladesh, courts of Dhaka), and currency (৳) match a realistic local context, especially if the user mentions Bangladesh.
4. Ensure the JSON is valid and complete. Do not truncate the JSON.
5. Return ONLY the raw JSON object matching the schema. Your response must be parseable directly. Do not wrap it in markdown code blocks.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: systemPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API returned error status ${response.status}: ${errText}`);
        }
        
        const resData = await response.json();
        const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!generatedText) {
            throw new Error("No content returned from Gemini AI model.");
        }
        
        let parsedJSON;
        try {
            parsedJSON = JSON.parse(generatedText);
        } catch (parseErr) {
            console.error("Failed to parse Gemini output as JSON:", generatedText);
            throw new Error("Gemini AI did not return a valid JSON object. Please try again with more specific prompts.");
        }
        
        return res.json(parsedJSON);
        
    } catch (err) {
        console.error("Gemini Generation Error: ", err);
        return res.status(500).json({ error: err.message || "Failed to generate document using Gemini AI." });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Contract Engine running on port ${PORT}`));