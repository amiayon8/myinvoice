CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.class_party_26_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    student_id TEXT,
    email TEXT,
    selected_option_title TEXT NOT NULL,
    selected_option_category TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(10, 2) DEFAULT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bkash')),
    bkash_sender_number TEXT,
    bkash_transaction_id TEXT,
    cash_paid_to TEXT,
    special_notes TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'rejected')),
    verified_by TEXT,
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cp26_phone ON public.class_party_26_registrations (phone);
CREATE INDEX IF NOT EXISTS idx_cp26_status ON public.class_party_26_registrations (payment_status);
CREATE INDEX IF NOT EXISTS idx_cp26_method ON public.class_party_26_registrations (payment_method);
CREATE INDEX IF NOT EXISTS idx_cp26_paid_to ON public.class_party_26_registrations (cash_paid_to);

ALTER TABLE public.class_party_26_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select class_party_26_registrations"
    ON public.class_party_26_registrations FOR SELECT USING (true);

CREATE POLICY "Allow anon insert class_party_26_registrations"
    ON public.class_party_26_registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update class_party_26_registrations"
    ON public.class_party_26_registrations FOR UPDATE USING (true);

CREATE POLICY "Allow anon delete class_party_26_registrations"
    ON public.class_party_26_registrations FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.class_party_26_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    label TEXT,
    type TEXT NOT NULL DEFAULT 'all',
    organizer TEXT,
    can_approve_payments BOOLEAN NOT NULL DEFAULT false,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    never_expires BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp26_links_token ON public.class_party_26_share_links (token);

ALTER TABLE public.class_party_26_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select class_party_26_share_links"
    ON public.class_party_26_share_links FOR SELECT USING (true);

CREATE POLICY "Allow anon insert class_party_26_share_links"
    ON public.class_party_26_share_links FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update class_party_26_share_links"
    ON public.class_party_26_share_links FOR UPDATE USING (true);

CREATE POLICY "Allow anon delete class_party_26_share_links"
    ON public.class_party_26_share_links FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.class_party_26_view_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES public.class_party_26_share_links(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    referrer TEXT,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp26_view_logs_token_id ON public.class_party_26_view_logs (token_id);
CREATE INDEX IF NOT EXISTS idx_cp26_view_logs_viewed_at ON public.class_party_26_view_logs (viewed_at DESC);

ALTER TABLE public.class_party_26_view_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert class_party_26_view_logs"
    ON public.class_party_26_view_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select class_party_26_view_logs"
    ON public.class_party_26_view_logs FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.class_party_26_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'registration',
    actor TEXT NOT NULL DEFAULT 'System',
    action TEXT NOT NULL,
    details TEXT,
    record_id UUID,
    participant_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp26_activity_logs_created_at ON public.class_party_26_activity_logs (created_at DESC);

ALTER TABLE public.class_party_26_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert class_party_26_activity_logs"
    ON public.class_party_26_activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select class_party_26_activity_logs"
    ON public.class_party_26_activity_logs FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE class_party_26_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE class_party_26_activity_logs;
