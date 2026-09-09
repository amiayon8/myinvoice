-- =========================================================================
-- COMPLETE SUPABASE MIGRATION: AttendX/AcademiX, Notes, and Payment Methods
-- Run this in your Supabase SQL Editor to enable full DB persistence.
-- =========================================================================

-- 1. AttendX / AcademiX Organizations Table
CREATE TABLE IF NOT EXISTS public.attendx_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL UNIQUE,
    org_name TEXT NOT NULL,
    client_id TEXT NOT NULL, -- Webhook Bearer token / Client ID
    webhook_secret TEXT, -- Secret key for requesting SaaS refreshSubscription
    client_web_base TEXT NOT NULL, -- e.g. https://clientapp.academix.xyz
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    warning_start TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '25 days'),
    subscription_ends TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'biannual', 'yearly', 'custom')),
    plan_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT '৳',
    linked_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    last_webhook_status JSONB DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. AttendX Hardware Deployments & Sales Table
CREATE TABLE IF NOT EXISTS public.attendx_hardware_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.attendx_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serial_numbers TEXT[] DEFAULT '{}',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    warranty_months INTEGER DEFAULT 12,
    sold_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1 AttendX Payments & Collection Ledger Table
CREATE TABLE IF NOT EXISTS public.attendx_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.attendx_organizations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Apple Notes - Folders Table
CREATE TABLE IF NOT EXISTS public.note_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'fa-folder',
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Apple Notes - Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    content TEXT NOT NULL DEFAULT '',
    plain_text TEXT DEFAULT '',
    folder_id TEXT NOT NULL DEFAULT 'all',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    mentions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Dynamic Payment Methods Table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'mobile_banking' CHECK (type IN ('mobile_banking', 'bank_transfer', 'card', 'crypto', 'other')),
    badge TEXT,
    icon_svg TEXT,
    icon_name TEXT DEFAULT 'fa-credit-card',
    color TEXT DEFAULT '#6366f1',
    bg_gradient TEXT DEFAULT 'from-indigo-600 to-purple-600',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    instructions TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    visibility JSONB NOT NULL DEFAULT '{"mode": "all", "client_ids": []}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Client Payment Update / Verification Requests Table
CREATE TABLE IF NOT EXISTS public.payment_update_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL DEFAULT 'invoice' CHECK (type IN ('invoice', 'subscription')),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    invoice_number TEXT,
    subscription_id UUID,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT,
    client_contact TEXT,
    transaction_id TEXT NOT NULL,
    account_number TEXT NOT NULL,
    payment_method_id TEXT,
    payment_method_name TEXT,
    amount NUMERIC(12, 2),
    currency TEXT DEFAULT '৳',
    notes TEXT,
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_attendx_org_id ON public.attendx_organizations(org_id);
CREATE INDEX IF NOT EXISTS idx_attendx_status ON public.attendx_organizations(status);
CREATE INDEX IF NOT EXISTS idx_attendx_hardware_org ON public.attendx_hardware_sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON public.notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON public.payment_methods(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_update_requests(status);

-- Enable RLS
ALTER TABLE public.attendx_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendx_hardware_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendx_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_update_requests ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for full authenticated & public access
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Full access on attendx_organizations" ON public.attendx_organizations;
    CREATE POLICY "Full access on attendx_organizations" ON public.attendx_organizations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access on attendx_hardware_sales" ON public.attendx_hardware_sales;
    CREATE POLICY "Full access on attendx_hardware_sales" ON public.attendx_hardware_sales FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access on attendx_payments" ON public.attendx_payments;
    CREATE POLICY "Full access on attendx_payments" ON public.attendx_payments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access on note_folders" ON public.note_folders;
    CREATE POLICY "Full access on note_folders" ON public.note_folders FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access on notes" ON public.notes;
    CREATE POLICY "Full access on notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access on payment_methods" ON public.payment_methods;
    CREATE POLICY "Full access on payment_methods" ON public.payment_methods FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Full access on payment_update_requests" ON public.payment_update_requests;
    CREATE POLICY "Full access on payment_update_requests" ON public.payment_update_requests FOR ALL USING (true) WITH CHECK (true);
END $$;
