-- =====================================================================
-- Option 1: Concrete DML Script (Recommended & Safe)
-- Direct grouping using the specific IDs of the provided database state.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Series A: Express.Js API Hosting + Email Hosting (1 Month)
-- Parent: INV-2026-5807 ('1ac37741-3eb1-463d-b20e-2e97fcfa7646')
-- Children:
--   - INV-2026-5809 ('888c11ac-cee2-47eb-8060-65343fb0dcae') -> Feb 2026
--   - INV-2026-5810 ('019a6afb-c17b-46c4-ac52-d9ef4d6d458d') -> Mar 2026
-- ---------------------------------------------------------------------

-- Update parent template's next generation date to April 26, 2026
UPDATE "public"."invoices"
SET "next_generation_date" = '2026-04-26'
WHERE "id" = '1ac37741-3eb1-463d-b20e-2e97fcfa7646';

-- Update children to disable template recurrence flags (since they are generated instances)
UPDATE "public"."invoices"
SET "is_recurring" = false,
    "recurring_frequency" = NULL,
    "next_generation_date" = NULL
WHERE "id" IN (
    '888c11ac-cee2-47eb-8060-65343fb0dcae', 
    '019a6afb-c17b-46c4-ac52-d9ef4d6d458d'
);

-- Insert child mapping logs in recurring_invoices table
INSERT INTO "public"."recurring_invoices" ("parent_invoice_id", "child_invoice_id", "month", "year") VALUES
('1ac37741-3eb1-463d-b20e-2e97fcfa7646', '888c11ac-cee2-47eb-8060-65343fb0dcae', '02', '26'),
('1ac37741-3eb1-463d-b20e-2e97fcfa7646', '019a6afb-c17b-46c4-ac52-d9ef4d6d458d', '03', '26');


-- ---------------------------------------------------------------------
-- Series B: Hetzner CX33 VPS Hosting 1 month
-- Parent: INV-2026-5246 ('df142005-ee6b-4c2d-83b7-a5cea5514ba4')
-- Children:
--   - INV-2026-5247 ('789fb4d0-4047-4712-9693-f3eba028b05b') -> May 2026
--   - INV-2026-5249 ('4f1c9f32-1c0f-4d1a-bdfb-3966b74a3c62') -> Jun 2026
-- ---------------------------------------------------------------------

-- Update parent template's next generation date to July 13, 2026
UPDATE "public"."invoices"
SET "next_generation_date" = '2026-07-13'
WHERE "id" = 'df142005-ee6b-4c2d-83b7-a5cea5514ba4';

-- Update children to disable template recurrence flags
UPDATE "public"."invoices"
SET "is_recurring" = false,
    "recurring_frequency" = NULL,
    "next_generation_date" = NULL
WHERE "id" IN (
    '789fb4d0-4047-4712-9693-f3eba028b05b', 
    '4f1c9f32-1c0f-4d1a-bdfb-3966b74a3c62'
);

-- Insert child mapping logs in recurring_invoices table
INSERT INTO "public"."recurring_invoices" ("parent_invoice_id", "child_invoice_id", "month", "year") VALUES
('df142005-ee6b-4c2d-83b7-a5cea5514ba4', '789fb4d0-4047-4712-9693-f3eba028b05b', '05', '26'),
('df142005-ee6b-4c2d-83b7-a5cea5514ba4', '4f1c9f32-1c0f-4d1a-bdfb-3966b74a3c62', '06', '26');

COMMIT;



-- =====================================================================
-- Option 2: Dynamic PostgreSQL CTE Script
-- This script groups recurring invoices dynamically by company_id, 
-- client_id, and first item description, designates the earliest created 
-- invoice as the template, and marks the others as children.
-- =====================================================================

/*
-- Uncomment to execute Option 2:
BEGIN;

-- 1. Identify groups and their parent templates
WITH recurring_series AS (
    SELECT 
        inv.id AS invoice_id,
        inv.created_at,
        inv.next_generation_date,
        inv.recurring_frequency,
        inv.company_id,
        inv.client_id,
        items.description AS item_desc,
        -- Get the oldest invoice in the same group (same company, client, and item description)
        FIRST_VALUE(inv.id) OVER(
            PARTITION BY inv.company_id, inv.client_id, items.description 
            ORDER BY inv.created_at ASC
        ) AS parent_id,
        -- Count how many items in this series group
        COUNT(*) OVER(
            PARTITION BY inv.company_id, inv.client_id, items.description
        ) AS series_count
    FROM "public"."invoices" inv
    JOIN "public"."invoice_items" items ON inv.id = items.invoice_id
    WHERE inv.is_recurring = true
),
-- Filter out only actual children (where invoice_id is not the parent_id)
child_instances AS (
    SELECT 
        invoice_id,
        parent_id,
        TO_CHAR(created_at, 'MM') AS gen_month,
        TO_CHAR(created_at, 'YY') AS gen_year
    FROM recurring_series
    WHERE invoice_id != parent_id
),
-- Calculate the max next_generation_date among all invoices in the series to set it on the parent
parent_updates AS (
    SELECT DISTINCT ON (parent_id)
        parent_id,
        FIRST_VALUE(next_generation_date) OVER(
            PARTITION BY parent_id 
            ORDER BY next_generation_date DESC NULLS LAST
        ) AS max_next_gen_date
    FROM recurring_series
)
-- Perform updates and inserts:

-- A. Link child instances to their parent templates in recurring_invoices log
INSERT INTO "public"."recurring_invoices" ("parent_invoice_id", "child_invoice_id", "month", "year")
SELECT parent_id, invoice_id, gen_month, gen_year
FROM child_instances
ON CONFLICT DO NOTHING;

-- B. Clear template flags on child invoices
UPDATE "public"."invoices"
SET "is_recurring" = false,
    "recurring_frequency" = NULL,
    "next_generation_date" = NULL
WHERE "id" IN (SELECT invoice_id FROM child_instances);

-- C. Update parent templates next generation date to the latest scheduled date
UPDATE "public"."invoices" i
SET "next_generation_date" = u.max_next_gen_date
FROM parent_updates u
WHERE i.id = u.parent_id AND u.max_next_gen_date IS NOT NULL;

COMMIT;
*/
