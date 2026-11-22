ALTER TABLE public.class_party_26_registrations
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT NULL;

UPDATE public.class_party_26_registrations
SET subtotal = 820
WHERE id = '43c7de4e-33cb-4b67-a790-514f42e7b241';

UPDATE public.class_party_26_registrations
SET subtotal = 800
WHERE id = '6d17f3eb-37c2-4ab6-92c9-3ce0784c11d4';

ALTER TABLE public.class_party_26_registrations
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS subtotal_with_vat,
  DROP COLUMN IF EXISTS total_payable,
  DROP COLUMN IF EXISTS selected_option_id,
  DROP COLUMN IF EXISTS vat_percent,
  DROP COLUMN IF EXISTS vat_amount,
  DROP COLUMN IF EXISTS bkash_fee_percent,
  DROP COLUMN IF EXISTS bkash_fee_amount;

ALTER TABLE public.class_party_26_share_links
  ADD COLUMN IF NOT EXISTS organizer TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS can_approve_payments BOOLEAN NOT NULL DEFAULT false;

UPDATE public.class_party_26_share_links
SET
  organizer = params->>'organizer',
  can_approve_payments = COALESCE((params->>'canApprovePayments')::boolean, false)
WHERE id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
