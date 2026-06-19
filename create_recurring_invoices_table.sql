-- =====================================================================
-- DDL Script to create the recurring_invoices table in Supabase/PostgreSQL
-- =====================================================================

-- 1. Create table with foreign key cascading and audit timestamp
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    child_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    month VARCHAR(2) NOT NULL,
    year VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a child invoice cannot be double-generated for the same parent template in the same month/year
    CONSTRAINT uq_parent_month_year UNIQUE (parent_invoice_id, month, year)
);

-- 2. Add performance index on parent/child references
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_parent ON public.recurring_invoices(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_child ON public.recurring_invoices(child_invoice_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for authenticated users
CREATE POLICY "Allow select for authenticated users" 
ON public.recurring_invoices 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.recurring_invoices 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.recurring_invoices 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.recurring_invoices 
FOR DELETE 
TO authenticated 
USING (true);
