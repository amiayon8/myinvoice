-- ==========================================
-- DOCUMENT GENERATIONS LOGGING TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.document_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    request_ip VARCHAR(50),
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.document_generations ENABLE ROW LEVEL SECURITY;

-- 1. Insert Policy: Allow users to insert logs if they are authenticated and the user_id matches their own ID
CREATE POLICY "Allow authenticated users to insert their own logs" 
    ON public.document_generations 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 2. Select Policy: Allow users to query only their own logs
CREATE POLICY "Allow users to read their own generation logs" 
    ON public.document_generations 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Index by user_id for fast user audits
CREATE INDEX IF NOT EXISTS idx_doc_gen_user ON public.document_generations(user_id);

-- Index by created_at for sorting timelines
CREATE INDEX IF NOT EXISTS idx_doc_gen_created ON public.document_generations(created_at);
