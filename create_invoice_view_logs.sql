-- =====================================================================
-- Run this in Supabase SQL Editor
-- Invoice Share Links: extended tokens + view log table
-- =====================================================================

-- 1. Extend invoice_access_tokens with new columns
ALTER TABLE public.invoice_access_tokens
  ADD COLUMN IF NOT EXISTS never_expires BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Set never_expires = true for any existing rows that have NULL expires_at
UPDATE public.invoice_access_tokens
SET never_expires = true
WHERE expires_at IS NULL;

-- 2. Allow expires_at to be NULL (for never-expiring tokens)
ALTER TABLE public.invoice_access_tokens
  ALTER COLUMN expires_at DROP NOT NULL;


-- 3. Create invoice_view_logs table
CREATE TABLE IF NOT EXISTS public.invoice_view_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id    UUID         NOT NULL REFERENCES public.invoice_access_tokens(id) ON DELETE CASCADE,
  invoice_id  UUID         NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ip_address  TEXT,
  user_agent  TEXT,
  browser     TEXT,
  os          TEXT,
  device      TEXT,
  referrer    TEXT
);

CREATE INDEX IF NOT EXISTS idx_view_logs_token   ON public.invoice_view_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_invoice ON public.invoice_view_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_viewed  ON public.invoice_view_logs(viewed_at DESC);

-- 4. Enable RLS
ALTER TABLE public.invoice_view_logs ENABLE ROW LEVEL SECURITY;

-- Service-role can do everything (used by the logging API route)
CREATE POLICY "service_role_full_access" ON public.invoice_view_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users (owners) can read logs
CREATE POLICY "authenticated_read" ON public.invoice_view_logs
  FOR SELECT TO authenticated USING (true);
