ALTER TABLE public.class_party_26_registrations
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS selected_option_id TEXT,
  ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS subtotal_with_vat NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_payable NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS vat_percent NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bkash_fee_percent NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bkash_fee_amount NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE public.class_party_26_share_links
  ADD COLUMN IF NOT EXISTS organizer TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS can_approve_payments BOOLEAN NOT NULL DEFAULT false;

UPDATE public.class_party_26_share_links
SET
  organizer = params->>'organizer',
  can_approve_payments = COALESCE((params->>'canApprovePayments')::boolean, false)
WHERE id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
