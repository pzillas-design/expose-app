-- Fix generation_jobs table for Admin Page
ALTER TABLE public.generation_jobs 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS api_cost DECIMAL DEFAULT 0.0;

-- Ensure created_at is populated for existing rows
UPDATE public.generation_jobs SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.generation_jobs SET updated_at = NOW() WHERE updated_at IS NULL;

-- Also ensuring profiles are fixed (in case previous run failed)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_spent DECIMAL DEFAULT 0.0;
