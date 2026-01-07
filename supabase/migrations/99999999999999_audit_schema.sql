-- Migration: Restore missing generation_jobs columns
-- These columns are expected by adminService and imageService

ALTER TABLE public.generation_jobs 
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Generation',
ADD COLUMN IF NOT EXISTS cost DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_cost DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_prompt INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_completion INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_total INTEGER DEFAULT 0;

-- Ensure RLS is updated if needed (re-run helper)
CREATE OR REPLACE FUNCTION public.recreate_optimized_policy_v3(
    tbl_name text, 
    pol_name text, 
    cmd text, 
    roles text[], 
    expr text
) RETURNS void AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl_name);
    
    IF cmd = 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO %s WITH CHECK (%s)', 
            pol_name, tbl_name, cmd, array_to_string(roles, ','), expr);
    ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO %s USING (%s)', 
            pol_name, tbl_name, cmd, array_to_string(roles, ','), expr);
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
    PERFORM public.recreate_optimized_policy_v3('generation_jobs', 'Users can view their own jobs', 'SELECT', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy_v3('generation_jobs', 'Users can insert their own jobs', 'INSERT', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy_v3('generation_jobs', 'Users can update their own jobs', 'UPDATE', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy_v3('generation_jobs', 'Users can delete their own jobs', 'DELETE', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    
    PERFORM public.recreate_optimized_policy_v3('generation_jobs', 'Admins can view all jobs', 'SELECT', ARRAY['authenticated'], '(SELECT public.is_admin())');
END $$;

DROP FUNCTION public.recreate_optimized_policy_v3(text, text, text, text[], text);
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'global_presets';
