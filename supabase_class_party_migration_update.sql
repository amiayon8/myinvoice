-- ==============================================================================
-- Class Party '26: Database Migration Update
-- 1. Remove VAT & surcharge columns
-- 2. Add subtotal and paid_amount columns
-- 3. Sync existing registrations to exact party rates:
--    - Set Menu: 800 (Cash) / 820 (bKash)
--    - Buffet: 1350 (Cash) / 1380 (bKash)
--    - Other: 0
-- ==============================================================================

-- Step 1: Add new financial columns if they don't already exist
ALTER TABLE public.class_party_26_registrations
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT NULL;

-- Step 2: Populate subtotal and paid_amount based on official party amounts
UPDATE public.class_party_26_registrations
SET 
  subtotal = CASE 
    WHEN LOWER(selected_option_title) = 'other' OR LOWER(selected_option_category) = 'other' THEN 0
    WHEN LOWER(selected_option_title) LIKE '%buffet%' OR LOWER(selected_option_category) LIKE '%buffet%' THEN 
      CASE WHEN payment_method = 'bkash' THEN 1380 ELSE 1350 END
    WHEN LOWER(selected_option_title) LIKE '%combo%' OR LOWER(selected_option_title) LIKE '%set%' OR LOWER(selected_option_category) LIKE '%thai-chinese%' THEN 
      CASE WHEN payment_method = 'bkash' THEN 820 ELSE 800 END
    ELSE COALESCE(subtotal_with_vat, base_price, 0)
  END,
  paid_amount = total_payable;

-- Step 3: Keep subtotal_with_vat in sync for full backwards compatibility
UPDATE public.class_party_26_registrations
SET subtotal_with_vat = subtotal;

-- Step 4: Remove all VAT and surcharge percentage/amount columns
ALTER TABLE public.class_party_26_registrations
  DROP COLUMN IF EXISTS vat_percent,
  DROP COLUMN IF EXISTS vat_amount,
  DROP COLUMN IF EXISTS bkash_fee_percent,
  DROP COLUMN IF EXISTS bkash_fee_amount;

-- Step 5: Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
