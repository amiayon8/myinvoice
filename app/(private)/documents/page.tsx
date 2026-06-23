'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

interface EntityProfile {
  id: string;
  name: string;
  email: string;
  website: string;
  address: string;
  phone: string;
  color: string;
  logo_url: string;
}

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  address: string;
  phone?: string;
}

export default function DocumentsPage() {
  const supabase = createClient();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [companies, setCompanies] = useState<EntityProfile[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [activeDocType, setActiveDocType] = useState<string>('contract');

  // Selected dropdown IDs
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Default configurations
  const defaultCommonData = {
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    currency: '৳ ',
    developer: {
      name: 'Acme Web Solutions',
      representative: 'Sarker Ayon',
      email: 'john@acmeweb.com',
      address: '123 Tech Hub Suite A, San Francisco, CA 94107',
      website: 'https://acmeweb.com',
    },
    client: {
      name: 'Stellar Startups Inc.',
      company: 'Stellar Startups Inc.',
      representative: 'Jane Smith',
      email: 'jane@stellar.io',
      address: '456 Launchpad Way, Austin, TX 78701',
    },
    project: {
      name: 'Enterprise Dashboard Portal',
      summary: 'A secure web portal for managing enterprise resource planning and reporting data.',
    },
  };

  const [docConfigs, setDocConfigs] = useState<Record<string, any>>({
    contract: {
      date: defaultCommonData.date,
      currency: defaultCommonData.currency,
      developer: { ...defaultCommonData.developer },
      client: { ...defaultCommonData.client },
      project: { ...defaultCommonData.project },
      pricing: {
        total: '15,000',
        advance: '5,000',
        hourlyRate: '150',
        paymentTermsDays: 15,
      },
      milestones: [
        { name: 'Phase 1: Architecture & UI Designs', dueDate: 'July 15, 2026', paymentAmount: '5,000' },
        { name: 'Phase 2: Core Development & APIs', dueDate: 'August 30, 2026', paymentAmount: '5,000' },
      ],
      revisions: {
        limit: 3,
      },
      termination: {
        noticeDays: 14,
      },
      legal: {
        governingLaw: 'the State of California',
        jurisdiction: 'San Francisco County, California',
      },
    },
    sow: {
      date: defaultCommonData.date,
      developer: { ...defaultCommonData.developer },
      client: { ...defaultCommonData.client },
      project: { ...defaultCommonData.project },
      features: [
        { title: 'User Authentication & Roles', description: 'Secure signup, signin, and password resets using JWT tokens. Role-based access control for Admins, Managers, and general Staff.' },
        { title: 'Reporting Dashboard & Analytics', description: 'Visual data widgets displaying financial metrics and operations logs, including custom charts generated via Chart.js.' },
        { title: 'Stripe Payment Gateway', description: 'Secure credit card checkouts, automated invoices, and transaction state synchronization using webhooks.' },
      ],
      pages: [
        { name: 'Landing Dashboard', description: 'Operational overview displaying aggregate stats and recent client logs.' },
        { name: 'Payments / Invoicing Page', description: 'Lists all recent billing statements with download capabilities and checkout links.' },
        { name: 'Settings Management Panel', description: 'Enables users to customize profile information, set alert preferences, and toggle security.' },
      ],
      techStack: {
        frontend: 'React.js with Next.js Framework & Tailwind CSS',
        backend: 'Node.js with Express API & Prisma ORM Engine',
        database: 'PostgreSQL Database Engine hosted on Supabase',
        other: 'GitHub Actions CI/CD pipeline, Vercel Application hosting',
        thirdPartyApis: 'Stripe API for Checkouts, SendGrid for transactional notifications',
      },
      exclusions: [
        'Native Mobile Apps creation (iOS and Android client stores)',
        'Legacy data cleanup or data parsing from existing spreadsheets',
        'SEO copy campaign creation and marketing execution',
      ],
      clientDependencies: [
        'Provisioning of Stripe Sandbox credentials and dashboard access keys',
        'Provisioning of domain registers, SSL redirects, and DNS registers',
        'Branding materials: vector logos, specific font licenses, and color styling assets',
      ],
    },
    proposal: {
      date: defaultCommonData.date,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      developer: { ...defaultCommonData.developer },
      client: { ...defaultCommonData.client },
      project: { ...defaultCommonData.project },
      problem: 'The Client currently manages operational data and reports using fragmented spreadsheets and manual input. This setup creates administrative backlogs, increases reporting inaccuracies, and slows down executive decisions.',
      solution: 'We propose developing a unified, web-based Enterprise Dashboard Portal. This application will automate database reports, secure client authorization, and integrate payment collections, reducing admin efforts by up to 40%.',
      currency: '৳ ',
      pricing: {
        total: '15,000',
        advance: '5,000',
      },
      phases: [
        { name: 'Phase 1: Discovery & Interface Prototypes', duration: '1-2 Weeks', description: 'Interactive wireframes design, database architecture mapping, and API routing designs.' },
        { name: 'Phase 2: Core Engineering Sprints', duration: '4-6 Weeks', description: 'Database integrations, API endpoints implementation, UI components creation, and security checks.' },
        { name: 'Phase 3: QA, Tuning & Launch Support', duration: '1-2 Weeks', description: 'Cross-device browser verification, server configuration, domain mapping, and staff onboarding.' },
      ],
      pricingOptions: [
        { name: 'MVP Core Package', description: 'Includes core dashboard components, standard database, 30 days post-launch support, and hosting config.', amount: '10,000' },
        { name: 'Standard Complete Package', description: 'Includes SOW specs, full Stripe payment suite, custom notifications, and 90 days support.', amount: '15,000' },
        { name: 'Enterprise Premium Package', description: 'Includes complete dashboard, multi-tenant databases, SMS alerts, and 6 months dedicated maintenance support.', amount: '22,000' },
      ],
      whyUs: [
        'Over 8 years of specialized experience engineering secure, scale-ready SaaS platforms.',
        'High availability communication: Direct Discord access, daily Git commit logs, and weekly demo deployments.',
        'Strong security defaults: Encrypted environment configs, safe authentication, and automated backup strategies.',
      ],
    },
    maintenance: {
      date: defaultCommonData.date,
      termMonths: '6',
      monthlyFee: '1,200',
      currency: '৳ ',
      developer: { ...defaultCommonData.developer },
      client: { ...defaultCommonData.client },
      project: { ...defaultCommonData.project },
      supportHoursAllowance: '5',
      maintenanceScope: [
        'Ongoing package dependencies auditing and version security patch updates.',
        'Periodic database structure optimizations and index health reviews.',
        'Continuous application uptime monitoring with email alerts.',
        'Up to 5 hours/month of minor styling adjustments, text modifications, or layout fixes.',
        'Weekly automated backup verifications and off-site archives.',
      ],
      responseTimeSLA: {
        critical: '4',
        normal: '24',
      },
      extraHourlyRate: '150',
      terminationNoticeDays: '30',
    },
    nda: {
      date: defaultCommonData.date,
      disclosingParty: { ...defaultCommonData.client },
      receivingParty: { ...defaultCommonData.developer },
      purpose: 'Evaluating, designing, building, and delivering software services and enterprise integrations for the Enterprise Dashboard Portal project.',
      activeTermYears: '2',
      survivalYears: '3',
      governingState: 'the State of California',
      jurisdiction: 'San Francisco County, California',
    },
    handover: {
      date: defaultCommonData.date,
      developer: { ...defaultCommonData.developer },
      client: { ...defaultCommonData.client },
      project: { ...defaultCommonData.project },
      git: {
        url: 'https://github.com/stellar-startups-inc/enterprise-dashboard-portal.git',
        mainBranch: 'main',
        stagingBranch: 'develop',
      },
      deployment: {
        productionHost: 'Vercel Enterprise & AWS RDS Database Engine',
        productionUrl: 'https://dashboard.stellarstartups.io',
        stagingUrl: 'https://staging-dashboard.stellarstartups.io',
        adminUrl: 'https://dashboard.stellarstartups.io/admin-console',
      },
      credentials: [
        { service: 'GitHub Organization', url: 'https://github.com', username: 'stellar-admin@stellar.io', actionRequired: 'Transfer primary ownership and remove developer rights.' },
        { service: 'AWS Console Access', url: 'https://aws.amazon.com', username: 'aws-admin-dev', actionRequired: 'Rotate root security keys and modify access passwords.' },
        { service: 'Stripe Production dashboard', url: 'https://stripe.com', username: 'payments-billing@stellar.io', actionRequired: 'Remove Developer webhook credentials and rotate signing keys.' },
        { service: 'Supabase Cloud Database', url: 'https://supabase.com', username: 'postgres-main-admin', actionRequired: 'Update PostgreSQL root db key.' },
      ],
      environmentVariables: [
        { key: 'DATABASE_URL', description: 'Postgres connection string containing DB username, address, and security key credentials.', exampleValue: 'postgresql://postgres:********@aws-rds-endpoint.com:5432/main_db' },
        { key: 'NEXTAUTH_SECRET', description: 'Cryptographically randomized token key used by NextAuth to sign and verify security session webhooks.', exampleValue: '71a9a8385bf7de534d0bce628...8cb1' },
        { key: 'STRIPE_SECRET_KEY', description: 'Stripe API private token for transactions.', exampleValue: 'sk_live_51N...8u2' },
        { key: 'SENDGRID_API_KEY', description: 'SendGrid authentication key token for transactional emails delivery.', exampleValue: 'SG.yH98s...Jk2' },
      ],
      localSetup: {
        nodeVersion: '18.16.0',
        installCommand: 'npm install',
        dbCommand: 'npx prisma db push',
        runCommand: 'npm run dev',
      },
    },
  });

  const activeData = docConfigs[activeDocType];

  useEffect(() => {
    const fetchDBData = async () => {
      setLoading(true);
      try {
        const [comps, cls] = await Promise.all([
          supabase.from('companies').select('*').order('name'),
          supabase.from('clients').select('*').order('name'),
        ]);
        setCompanies(comps.data || []);
        setClients(cls.data || []);
      } catch (err) {
        console.error('Error fetching entities/clients:', err);
        toast.error('Failed to load database profiles');
      } finally {
        setLoading(false);
      }
    };
    fetchDBData();
  }, []);

  const handleFieldChange = (path: string, value: any) => {
    const pathKeys = path.split('.');
    const updatedConfigs = { ...docConfigs };
    let current = updatedConfigs[activeDocType];

    for (let i = 0; i < pathKeys.length - 1; i++) {
      if (!current[pathKeys[i]]) current[pathKeys[i]] = {};
      current = current[pathKeys[i]];
    }

    current[pathKeys[pathKeys.length - 1]] = value;
    setDocConfigs(updatedConfigs);
  };

  const handleListFieldChange = (listName: string, index: number, field: string, value: any) => {
    const updatedConfigs = { ...docConfigs };
    updatedConfigs[activeDocType][listName][index][field] = value;
    setDocConfigs(updatedConfigs);
  };

  const handleArrayStringFieldChange = (listName: string, index: number, value: string) => {
    const updatedConfigs = { ...docConfigs };
    updatedConfigs[activeDocType][listName][index] = value;
    setDocConfigs(updatedConfigs);
  };

  const addListRow = (listName: string, defaultRow: any) => {
    const updatedConfigs = { ...docConfigs };
    if (!updatedConfigs[activeDocType][listName]) {
      updatedConfigs[activeDocType][listName] = [];
    }
    updatedConfigs[activeDocType][listName].push(defaultRow);
    setDocConfigs(updatedConfigs);
  };

  const removeListRow = (listName: string, index: number) => {
    const updatedConfigs = { ...docConfigs };
    updatedConfigs[activeDocType][listName].splice(index, 1);
    setDocConfigs(updatedConfigs);
  };

  const applySelectedEntity = (id: string) => {
    setSelectedEntityId(id);
    if (!id) return;
    const company = companies.find((c) => c.id === id);
    if (!company) return;

    const updatedConfigs = { ...docConfigs };
    if (activeDocType === 'nda') {
      updatedConfigs[activeDocType].receivingParty = {
        ...updatedConfigs[activeDocType].receivingParty,
        name: company.name || '',
        email: company.email || '',
        address: company.address || '',
        website: company.website || '',
      };
    } else {
      updatedConfigs[activeDocType].developer = {
        ...updatedConfigs[activeDocType].developer,
        name: company.name || '',
        email: company.email || '',
        address: company.address || '',
        website: company.website || '',
      };
    }
    setDocConfigs(updatedConfigs);
    toast.success('Loaded Entity profile.');
  };

  const applySelectedClient = (id: string) => {
    setSelectedClientId(id);
    if (!id) return;
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    const updatedConfigs = { ...docConfigs };
    if (activeDocType === 'nda') {
      updatedConfigs[activeDocType].disclosingParty = {
        ...updatedConfigs[activeDocType].disclosingParty,
        name: client.name || '',
        company: client.name || '',
        email: client.email || '',
        address: client.address || '',
        phone: client.phone || '',
      };
    } else {
      updatedConfigs[activeDocType].client = {
        ...updatedConfigs[activeDocType].client,
        name: client.name || '',
        company: client.name || '',
        email: client.email || '',
        address: client.address || '',
        phone: client.phone || '',
      };
    }
    setDocConfigs(updatedConfigs);
    toast.success('Loaded Client profile.');
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(`http://localhost:5000/api/documents/${activeDocType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(activeData),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      let clientName = 'Client';
      if (activeDocType === 'nda') {
        clientName =
          activeData.disclosingParty.name === defaultCommonData.client.name
            ? activeData.disclosingParty.name
            : activeData.receivingParty.name;
      } else {
        clientName = activeData.client.name;
      }
      clientName = clientName.replace(/\s+/g, '_');

      a.download = `${activeDocType.toUpperCase()}_${clientName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF successfully generated!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error compiling PDF document');
    } finally {
      setGenerating(false);
    }
  };

  const docIntroductions: Record<string, { title: string; desc: string }> = {
    contract: {
      title: 'Service Agreement / Development Contract',
      desc: 'The primary legal agreement outlining project deliverables, timeline schedules, IP ownership rights, and liability caps.',
    },
    sow: {
      title: 'Scope of Work (SOW)',
      desc: 'Detailed technical document specifications. Highlights all included features, stack models, and crucially what is OUT of scope.',
    },
    proposal: {
      title: 'Project Proposal Document',
      desc: 'Sales-focused overview highlighting client pain points, solution outline, project milestones, pricing package estimates, and next steps.',
    },
    maintenance: {
      title: 'Maintenance & Support Agreement',
      desc: 'Post-delivery service contract detailing system maintenance boundaries, support SLA response metrics, and extra development rates.',
    },
    nda: {
      title: 'Mutual Non-Disclosure Agreement (NDA)',
      desc: 'Legally ensures confidentiality during early talks or developer onboarding. Sets rules on data security and survival terms.',
    },
    handover: {
      title: 'Handover & Technical Credentials Document',
      desc: 'Administrative summary detailing repo URLs, staging/prod hosting links, environment keys, console users, and local build instructions.',
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center w-full min-h-screen text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="border-4 border-indigo-500/20 border-t-indigo-500 rounded-full w-12 h-12 animate-spin"></div>
          <p className="font-semibold text-sm uppercase tracking-widest">Accessing Registries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Banner actions */}
      <div className="flex justify-between items-center bg-slate-900 p-6 border-slate-800 border-b no-print">
        <div>
          <h1 className="font-black text-white text-xl uppercase tracking-tight">
            Document Generation OS
          </h1>
          <p className="text-slate-400 text-xs">
            Compile customized legal and technical paperwork in real-time.
          </p>
        </div>
        <div>
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 shadow-indigo-600/20 shadow-xl px-5 py-3 rounded-lg font-black text-white text-xs uppercase tracking-widest transition-all"
          >
            {generating ? (
              <>
                <div className="border-2 border-white/20 border-t-white rounded-full w-4 h-4 animate-spin"></div>
                <span>Compiling EJS...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-pdf"></i>
                <span>Generate PDF Document</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main layout divided into Sidebar / Forms / Raw JSON view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Type Selector (Left Sidebar) */}
        <div className="bg-slate-950/20 p-4 border-slate-800 border-r w-72 overflow-y-auto">
          <p className="mb-4 px-2 font-black text-[10px] text-slate-500 uppercase tracking-widest">
            Select Template
          </p>
          <div className="space-y-1">
            {Object.keys(docConfigs).map((docType) => (
              <button
                key={docType}
                onClick={() => {
                  setActiveDocType(docType);
                  setSelectedEntityId('');
                  setSelectedClientId('');
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-lg text-left text-sm font-semibold transition-all ${activeDocType === docType
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
              >
                <span className="capitalize">{docType === 'sow' ? 'Scope of Work (SOW)' : docType}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${docType === 'contract' || docType === 'nda'
                    ? 'bg-blue-500/10 text-blue-400'
                    : docType === 'sow' || docType === 'handover'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                    }`}
                >
                  {docType === 'contract' || docType === 'nda' ? 'Legal' : docType === 'sow' || docType === 'handover' ? 'Tech' : 'Sales'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Form Area (Middle) */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="mb-8 pb-4 border-slate-800/60 border-b">
            <h2 className="font-bold text-slate-800 dark:text-white text-xl">
              {docIntroductions[activeDocType].title}
            </h2>
            <p className="mt-1 text-slate-400 text-sm">
              {docIntroductions[activeDocType].desc}
            </p>
          </div>

          <div className="space-y-6">
            {/* Database Selection Feed */}
            <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
              <h3 className="mb-4 font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                Prepopulate from Database
              </h3>
              <div className="gap-4 grid grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-400 text-xs uppercase tracking-wider">
                    Select Entity Profile (Developer)
                  </label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => applySelectedEntity(e.target.value)}
                    className="bg-slate-950/30 dark:bg-slate-950/50 p-3 border border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300 text-sm"
                  >
                    <option value="">-- Choose Entity --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-400 text-xs uppercase tracking-wider">
                    Select Client Profile (Recipient)
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => applySelectedClient(e.target.value)}
                    className="bg-slate-950/30 dark:bg-slate-950/50 p-3 border border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300 text-sm"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Common Parties fields */}
            {activeDocType !== 'nda' && (
              <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                  Developer & Client Details
                </h3>
                <div className="space-y-4">
                  <div className="gap-4 grid grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">Developer Name</label>
                      <input
                        type="text"
                        value={activeData.developer.name}
                        onChange={(e) => handleFieldChange('developer.name', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">Client Name</label>
                      <input
                        type="text"
                        value={activeData.client.name}
                        onChange={(e) => handleFieldChange('client.name', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                      />
                    </div>
                  </div>
                  <div className="gap-4 grid grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">Developer Email</label>
                      <input
                        type="email"
                        value={activeData.developer.email}
                        onChange={(e) => handleFieldChange('developer.email', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">Client Email</label>
                      <input
                        type="email"
                        value={activeData.client.email}
                        onChange={(e) => handleFieldChange('client.email', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                      />
                    </div>
                  </div>
                  {(activeDocType === 'contract' || activeDocType === 'maintenance') && (
                    <>
                      <div className="gap-4 grid grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-slate-400 text-xs">Developer Address</label>
                          <input
                            type="text"
                            value={activeData.developer.address || ''}
                            onChange={(e) => handleFieldChange('developer.address', e.target.value)}
                            className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-slate-400 text-xs">Client Address</label>
                          <input
                            type="text"
                            value={activeData.client.address || ''}
                            onChange={(e) => handleFieldChange('client.address', e.target.value)}
                            className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                          />
                        </div>
                      </div>
                      <div className="gap-4 grid grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-slate-400 text-xs">Developer Representative</label>
                          <input
                            type="text"
                            value={activeData.developer.representative || ''}
                            onChange={(e) => handleFieldChange('developer.representative', e.target.value)}
                            className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-slate-400 text-xs">Client Representative</label>
                          <input
                            type="text"
                            value={activeData.client.representative || ''}
                            onChange={(e) => handleFieldChange('client.representative', e.target.value)}
                            className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Document Specific Parameters */}
            {activeDocType === 'contract' && (
              <>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    Contract Parameters
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Agreement Date</label>
                        <input
                          type="text"
                          value={activeData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Currency</label>
                        <input
                          type="text"
                          value={activeData.currency}
                          onChange={(e) => handleFieldChange('currency', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Project Name</label>
                        <input
                          type="text"
                          value={activeData.project.name}
                          onChange={(e) => handleFieldChange('project.name', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Total Budget</label>
                        <input
                          type="text"
                          value={activeData.pricing.total}
                          onChange={(e) => handleFieldChange('pricing.total', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Kickoff Deposit</label>
                        <input
                          type="text"
                          value={activeData.pricing.advance}
                          onChange={(e) => handleFieldChange('pricing.advance', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Hourly Rate</label>
                        <input
                          type="text"
                          value={activeData.pricing.hourlyRate}
                          onChange={(e) => handleFieldChange('pricing.hourlyRate', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Invoice Net Terms (Days)</label>
                        <input
                          type="number"
                          value={activeData.pricing.paymentTermsDays}
                          onChange={(e) => handleFieldChange('pricing.paymentTermsDays', parseInt(e.target.value) || 0)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Revision Limit</label>
                        <input
                          type="number"
                          value={activeData.revisions.limit}
                          onChange={(e) => handleFieldChange('revisions.limit', parseInt(e.target.value) || 0)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Termination Notice (Days)</label>
                        <input
                          type="number"
                          value={activeData.termination.noticeDays}
                          onChange={(e) => handleFieldChange('termination.noticeDays', parseInt(e.target.value) || 0)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Governing Law</label>
                        <input
                          type="text"
                          value={activeData.legal.governingLaw}
                          onChange={(e) => handleFieldChange('legal.governingLaw', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Court Jurisdiction</label>
                        <input
                          type="text"
                          value={activeData.legal.jurisdiction}
                          onChange={(e) => handleFieldChange('legal.jurisdiction', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestones dynamic list */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-slate-800/50 border-b">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      Project Milestones Deliverables
                    </h3>
                    <button
                      onClick={() => addListRow('milestones', { name: 'New Milestone', dueDate: 'TBD', paymentAmount: '0' })}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-xs transition-all"
                    >
                      + Add Milestone
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeData.milestones.map((m: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-950/30 p-3 border border-slate-800 rounded-lg">
                        <div className="flex-1 gap-3 grid grid-cols-3">
                          <input
                            type="text"
                            placeholder="Milestone Name"
                            value={m.name}
                            onChange={(e) => handleListFieldChange('milestones', idx, 'name', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Due Date"
                            value={m.dueDate}
                            onChange={(e) => handleListFieldChange('milestones', idx, 'dueDate', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Amount"
                            value={m.paymentAmount}
                            onChange={(e) => handleListFieldChange('milestones', idx, 'paymentAmount', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                        </div>
                        <button
                          onClick={() => removeListRow('milestones', idx)}
                          className="bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeDocType === 'sow' && (
              <>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    SOW Settings & Tech Stack
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Project Name</label>
                        <input
                          type="text"
                          value={activeData.project.name}
                          onChange={(e) => handleFieldChange('project.name', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Scope Date</label>
                        <input
                          type="text"
                          value={activeData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Frontend Stack</label>
                        <input
                          type="text"
                          value={activeData.techStack.frontend}
                          onChange={(e) => handleFieldChange('techStack.frontend', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Backend Stack</label>
                        <input
                          type="text"
                          value={activeData.techStack.backend}
                          onChange={(e) => handleFieldChange('techStack.backend', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Database Engine</label>
                        <input
                          type="text"
                          value={activeData.techStack.database}
                          onChange={(e) => handleFieldChange('techStack.database', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Hosting / Deployment</label>
                        <input
                          type="text"
                          value={activeData.techStack.other}
                          onChange={(e) => handleFieldChange('techStack.other', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">Third Party APIs</label>
                      <input
                        type="text"
                        value={activeData.techStack.thirdPartyApis || ''}
                        onChange={(e) => handleFieldChange('techStack.thirdPartyApis', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Features dynamic list */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-slate-800/50 border-b">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      Included Scope Features
                    </h3>
                    <button
                      onClick={() => addListRow('features', { title: 'New Feature', description: 'Functional specs.' })}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-xs transition-all"
                    >
                      + Add Feature
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeData.features.map((f: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-slate-950/30 p-3 border border-slate-800 rounded-lg">
                        <div className="flex flex-col flex-1 gap-2">
                          <input
                            type="text"
                            placeholder="Feature Title"
                            value={f.title}
                            onChange={(e) => handleListFieldChange('features', idx, 'title', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none font-bold text-slate-300 text-xs"
                          />
                          <textarea
                            placeholder="Specification description"
                            value={f.description}
                            onChange={(e) => handleListFieldChange('features', idx, 'description', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none h-16 text-slate-300 text-xs resize-none"
                          />
                        </div>
                        <button
                          onClick={() => removeListRow('features', idx)}
                          className="bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exclusions dynamic list */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-slate-800/50 border-b">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      Out of Scope Exclusions
                    </h3>
                    <button
                      onClick={() => addListRow('exclusions', 'New Exclusion')}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-xs transition-all"
                    >
                      + Add Exclusion
                    </button>
                  </div>
                  <div className="space-y-2">
                    {activeData.exclusions.map((ex: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-950/30 p-2.5 border border-slate-800 rounded-lg">
                        <input
                          type="text"
                          value={ex}
                          onChange={(e) => handleArrayStringFieldChange('exclusions', idx, e.target.value)}
                          className="flex-1 bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                        />
                        <button
                          onClick={() => removeListRow('exclusions', idx)}
                          className="bg-red-500/10 hover:bg-red-500/20 px-2 py-1.5 rounded text-red-400 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeDocType === 'proposal' && (
              <>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    Proposal Details & Executive Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Proposal Date</label>
                        <input
                          type="text"
                          value={activeData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Valid Until</label>
                        <input
                          type="text"
                          value={activeData.validUntil}
                          onChange={(e) => handleFieldChange('validUntil', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Currency</label>
                        <input
                          type="text"
                          value={activeData.currency}
                          onChange={(e) => handleFieldChange('currency', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">The Problem / Pain points</label>
                      <textarea
                        value={activeData.problem}
                        onChange={(e) => handleFieldChange('problem', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none h-24 text-slate-300 text-sm resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">The Solution Proposed</label>
                      <textarea
                        value={activeData.solution}
                        onChange={(e) => handleFieldChange('solution', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none h-24 text-slate-300 text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing options list */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-slate-800/50 border-b">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      Pricing Package Tiers
                    </h3>
                    <button
                      onClick={() => addListRow('pricingOptions', { name: 'New Tier Option', description: 'Description', amount: '5,000' })}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-xs transition-all"
                    >
                      + Add Tier
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeData.pricingOptions.map((opt: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-950/30 p-3 border border-slate-800 rounded-lg">
                        <div className="flex-1 gap-3 grid grid-cols-3">
                          <input
                            type="text"
                            placeholder="Tier Name"
                            value={opt.name}
                            onChange={(e) => handleListFieldChange('pricingOptions', idx, 'name', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={opt.description}
                            onChange={(e) => handleListFieldChange('pricingOptions', idx, 'description', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Amount"
                            value={opt.amount}
                            onChange={(e) => handleListFieldChange('pricingOptions', idx, 'amount', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                        </div>
                        <button
                          onClick={() => removeListRow('pricingOptions', idx)}
                          className="bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeDocType === 'maintenance' && (
              <>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    SLA & Maintenance Boundary Setup
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Agreement Date</label>
                        <input
                          type="text"
                          value={activeData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Monthly Fee</label>
                        <input
                          type="text"
                          value={activeData.monthlyFee}
                          onChange={(e) => handleFieldChange('monthlyFee', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Currency</label>
                        <input
                          type="text"
                          value={activeData.currency}
                          onChange={(e) => handleFieldChange('currency', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Term (Months)</label>
                        <input
                          type="text"
                          value={activeData.termMonths}
                          onChange={(e) => handleFieldChange('termMonths', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">SLA Response Critical (Hrs)</label>
                        <input
                          type="text"
                          value={activeData.responseTimeSLA.critical}
                          onChange={(e) => handleFieldChange('responseTimeSLA.critical', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">SLA Response Normal (Hrs)</label>
                        <input
                          type="text"
                          value={activeData.responseTimeSLA.normal}
                          onChange={(e) => handleFieldChange('responseTimeSLA.normal', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Maintenance Task Scope list */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-slate-800/50 border-b">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      Maintenance Task Scope
                    </h3>
                    <button
                      onClick={() => addListRow('maintenanceScope', 'New maintenance tasks')}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-xs transition-all"
                    >
                      + Add Task
                    </button>
                  </div>
                  <div className="space-y-2">
                    {activeData.maintenanceScope.map((scope: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-950/30 p-2.5 border border-slate-800 rounded-lg">
                        <input
                          type="text"
                          value={scope}
                          onChange={(e) => handleArrayStringFieldChange('maintenanceScope', idx, e.target.value)}
                          className="flex-1 bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                        />
                        <button
                          onClick={() => removeListRow('maintenanceScope', idx)}
                          className="bg-red-500/10 hover:bg-red-500/20 px-2 py-1.5 rounded text-red-400 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeDocType === 'nda' && (
              <>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    NDA Parties
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Disclosing Party (Client)</label>
                        <input
                          type="text"
                          value={activeData.disclosingParty.name}
                          onChange={(e) => handleFieldChange('disclosingParty.name', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Receiving Party (Developer)</label>
                        <input
                          type="text"
                          value={activeData.receivingParty.name}
                          onChange={(e) => handleFieldChange('receivingParty.name', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Disclosing Email</label>
                        <input
                          type="email"
                          value={activeData.disclosingParty.email}
                          onChange={(e) => handleFieldChange('disclosingParty.email', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Receiving Email</label>
                        <input
                          type="email"
                          value={activeData.receivingParty.email}
                          onChange={(e) => handleFieldChange('receivingParty.email', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Disclosing Representative</label>
                        <input
                          type="text"
                          value={activeData.disclosingParty.representative || ''}
                          onChange={(e) => handleFieldChange('disclosingParty.representative', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Receiving Representative</label>
                        <input
                          type="text"
                          value={activeData.receivingParty.representative || ''}
                          onChange={(e) => handleFieldChange('receivingParty.representative', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    NDA Parameters
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Effective Date</label>
                        <input
                          type="text"
                          value={activeData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Active Term (Years)</label>
                        <input
                          type="number"
                          value={activeData.activeTermYears}
                          onChange={(e) => handleFieldChange('activeTermYears', parseInt(e.target.value) || 0)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Survival Term (Years)</label>
                        <input
                          type="number"
                          value={activeData.survivalYears}
                          onChange={(e) => handleFieldChange('survivalYears', parseInt(e.target.value) || 0)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Governing State</label>
                        <input
                          type="text"
                          value={activeData.governingState}
                          onChange={(e) => handleFieldChange('governingState', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Jurisdiction Court</label>
                        <input
                          type="text"
                          value={activeData.jurisdiction}
                          onChange={(e) => handleFieldChange('jurisdiction', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 text-xs">NDA Purpose</label>
                      <textarea
                        value={activeData.purpose}
                        onChange={(e) => handleFieldChange('purpose', e.target.value)}
                        className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none h-20 text-slate-300 text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeDocType === 'handover' && (
              <>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <h3 className="mb-4 pb-2 border-slate-800/50 border-b font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    Handover Repositories & Deployment Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="gap-4 grid grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Handover Date</label>
                        <input
                          type="text"
                          value={activeData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Project Name</label>
                        <input
                          type="text"
                          value={activeData.project.name}
                          onChange={(e) => handleFieldChange('project.name', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Git Main Branch</label>
                        <input
                          type="text"
                          value={activeData.git.mainBranch}
                          onChange={(e) => handleFieldChange('git.mainBranch', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                    <div className="gap-4 grid grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Git URL</label>
                        <input
                          type="text"
                          value={activeData.git.url}
                          onChange={(e) => handleFieldChange('git.url', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 text-xs">Live App URL</label>
                        <input
                          type="text"
                          value={activeData.deployment.productionUrl}
                          onChange={(e) => handleFieldChange('deployment.productionUrl', e.target.value)}
                          className="bg-slate-950/20 p-3 border border-slate-800/80 focus:border-indigo-500 rounded-lg outline-none text-slate-300 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Env Variables list */}
                <div className="bg-slate-900/40 backdrop-blur-md p-6 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between items-center mb-4 pb-2 border-slate-800/50 border-b">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      Required Env Config Keys
                    </h3>
                    <button
                      onClick={() => addListRow('environmentVariables', { key: 'NEW_ENV_KEY', description: 'Configuration detail', exampleValue: 'value' })}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded font-bold text-xs transition-all"
                    >
                      + Add Key
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeData.environmentVariables.map((env: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-950/30 p-3 border border-slate-800 rounded-lg">
                        <div className="flex-1 gap-3 grid grid-cols-3">
                          <input
                            type="text"
                            placeholder="Key Name"
                            value={env.key}
                            onChange={(e) => handleListFieldChange('environmentVariables', idx, 'key', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none font-mono text-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Purpose"
                            value={env.description}
                            onChange={(e) => handleListFieldChange('environmentVariables', idx, 'description', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Example / Format"
                            value={env.exampleValue || ''}
                            onChange={(e) => handleListFieldChange('environmentVariables', idx, 'exampleValue', e.target.value)}
                            className="bg-slate-950/30 p-2 border border-slate-800 rounded outline-none text-slate-300 text-xs"
                          />
                        </div>
                        <button
                          onClick={() => removeListRow('environmentVariables', idx)}
                          className="bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Real-time sync Raw JSON preview panel (Right) */}
        <div className="flex flex-col bg-slate-950 border-slate-800 border-l w-96 h-full overflow-hidden">
          <div className="flex justify-between items-center p-4 border-slate-850 border-b">
            <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider">
              Post Request JSON
            </h3>
            <span className="font-mono text-[9px] text-emerald-400 tracking-widest animate-pulse">
              REAL-TIME SYNC
            </span>
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-[10px] text-emerald-400 whitespace-pre custom-scrollbar">
            {JSON.stringify(activeData, null, 4)}
          </div>
        </div>
      </div>
    </div>
  );
}
