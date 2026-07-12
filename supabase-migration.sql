-- ====================================================================
-- FINANCE BUDDY - COMPLETE SUPABASE MIGRATION SCRIPT
-- ====================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    initial_balance NUMERIC NOT NULL DEFAULT 0,
    target_goal NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Income' or 'Expense'
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- YYYY-MM-DD
    type TEXT NOT NULL, -- 'Income', 'Expense', 'Transfer'
    account TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    is_receivable BOOLEAN NOT NULL DEFAULT false,
    is_payable BOOLEAN NOT NULL DEFAULT false,
    is_cleared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT NOT NULL DEFAULT 'all',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_budgets JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
);

-- 5. BANK RECONCILIATIONS TABLE
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    opening_balance NUMERIC NOT NULL DEFAULT 0,
    closing_balance NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL, -- 'Draft', 'Completed'
    statement_file_name TEXT,
    statement_file_size NUMERIC,
    statement_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    adjustments JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    prepared_by TEXT NOT NULL,
    notes TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TAX PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.tax_profiles (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    taxpayer_name TEXT NOT NULL,
    tin TEXT NOT NULL,
    tax_year TEXT NOT NULL,
    assessment_year TEXT NOT NULL,
    residency_status TEXT NOT NULL, -- 'Resident', 'Non-Resident'
    gender_category TEXT NOT NULL, -- 'General', 'Female', 'Senior (65+)', etc.
    date_of_birth TEXT NOT NULL,
    employment_status TEXT NOT NULL,
    main_source_of_income TEXT NOT NULL,
    tax_jurisdiction TEXT NOT NULL, -- 'Dhaka/Chittagong City', etc.
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TAX CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tax_configurations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_year TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    tax_free_threshold NUMERIC NOT NULL DEFAULT 0,
    special_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
    minimum_tax JSONB NOT NULL DEFAULT '{}'::jsonb,
    investment_rebate_rate NUMERIC NOT NULL DEFAULT 0,
    rebate_percentage_of_income NUMERIC NOT NULL DEFAULT 0,
    max_rebate_limit NUMERIC NOT NULL DEFAULT 0,
    surcharge_rates JSONB NOT NULL DEFAULT '[]'::jsonb,
    rounding_rule TEXT NOT NULL,
    slabs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TAX CALCULATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tax_calculations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_year TEXT NOT NULL,
    assessment_year TEXT NOT NULL,
    profile_id TEXT NOT NULL REFERENCES public.tax_profiles(id) ON DELETE CASCADE,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL, -- 'Draft', 'Under Review', 'Finalized'
    version NUMERIC NOT NULL DEFAULT 1,
    income_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    salary_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
    exempt_incomes JSONB NOT NULL DEFAULT '[]'::jsonb,
    tax_paid_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    tax_config_used JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    prepared_by TEXT NOT NULL,
    preparation_date TEXT NOT NULL,
    assumptions TEXT,
    audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ADVISER CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.adviser_conversations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ADVISER MESSAGES
CREATE TABLE IF NOT EXISTS public.adviser_messages (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES public.adviser_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'model'
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ADVISER ALERTS
CREATE TABLE IF NOT EXISTS public.adviser_alerts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'danger', 'warning', 'success'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_module TEXT NOT NULL, -- 'tax', 'reconciliation', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ADVISER INSIGHTS
CREATE TABLE IF NOT EXISTS public.adviser_insights (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    what_detected TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    target_tab TEXT NOT NULL,
    supporting_records TEXT NOT NULL,
    confidence_level TEXT NOT NULL,
    preview_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. ADVISER SUMMARIES
CREATE TABLE IF NOT EXISTS public.adviser_summaries (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. SCHEMA MAPPINGS FOR ALL MODULE SUB-ENTITIES TO SATISFY MODULE MIGRATIONS LISTING
CREATE OR REPLACE VIEW public.receivables AS
SELECT id, user_id, date, amount, account, category, description, is_cleared, created_at
FROM public.transactions
WHERE is_receivable = true;

CREATE OR REPLACE VIEW public.payables AS
SELECT id, user_id, date, amount, account, category, description, is_cleared, created_at
FROM public.transactions
WHERE is_payable = true;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_summaries ENABLE ROW LEVEL SECURITY;

-- Accounts RLS
CREATE POLICY "Users can manage their own accounts" 
ON public.accounts FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Categories RLS
CREATE POLICY "Users can manage their own categories" 
ON public.categories FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Transactions RLS
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Budgets RLS
CREATE POLICY "Users can manage their own budgets" 
ON public.budgets FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Bank Reconciliations RLS
CREATE POLICY "Users can manage their own reconciliations" 
ON public.bank_reconciliations FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Tax Profiles RLS
CREATE POLICY "Users can manage their own tax profiles" 
ON public.tax_profiles FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Tax Configurations RLS
CREATE POLICY "Users can manage their own tax configurations" 
ON public.tax_configurations FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Tax Calculations RLS
CREATE POLICY "Users can manage their own tax calculations" 
ON public.tax_calculations FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Adviser Conversations RLS
CREATE POLICY "Users can manage their own conversations" 
ON public.adviser_conversations FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Adviser Messages RLS
CREATE POLICY "Users can manage their own adviser messages" 
ON public.adviser_messages FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Adviser Alerts RLS
CREATE POLICY "Users can manage their own adviser alerts" 
ON public.adviser_alerts FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Adviser Insights RLS
CREATE POLICY "Users can manage their own adviser insights" 
ON public.adviser_insights FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Adviser Summaries RLS
CREATE POLICY "Users can manage their own summaries" 
ON public.adviser_summaries FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- STORAGE BUCKETS CONFIGURATION
-- ====================================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('transaction-documents', 'transaction-documents', false, 10485760, NULL),
  ('bank-statements', 'bank-statements', false, 10485760, NULL),
  ('tax-documents', 'tax-documents', false, 10485760, NULL),
  ('report-files', 'report-files', false, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for transaction-documents
CREATE POLICY "Users can manage their own transaction documents" 
ON storage.objects FOR ALL 
USING (bucket_id = 'transaction-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'transaction-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for bank-statements
CREATE POLICY "Users can manage their own bank statements" 
ON storage.objects FOR ALL 
USING (bucket_id = 'bank-statements' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'bank-statements' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for tax-documents
CREATE POLICY "Users can manage their own tax documents" 
ON storage.objects FOR ALL 
USING (bucket_id = 'tax-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'tax-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for report-files
CREATE POLICY "Users can manage their own report files" 
ON storage.objects FOR ALL 
USING (bucket_id = 'report-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'report-files' AND (storage.foldername(name))[1] = auth.uid()::text);
