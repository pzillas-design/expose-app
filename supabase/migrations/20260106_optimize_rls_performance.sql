-- Migration: Optimize RLS Performance and Fix overlapping policies
-- Addressing: auth_rls_initplan and multiple_permissive_policies

-- 1. Helper for safe policy recreation
CREATE OR REPLACE FUNCTION public.recreate_optimized_policy(
    tbl_name text, 
    pol_name text, 
    cmd text, 
    roles text[], 
    using_expr text, 
    check_expr text DEFAULT NULL
) RETURNS void AS $$
DECLARE
    role_name text;
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl_name);
    
    IF check_expr IS NOT NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO %s USING (%s) WITH CHECK (%s)', 
            pol_name, tbl_name, cmd, array_to_string(roles, ','), using_expr, check_expr);
    ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s TO %s USING (%s)', 
            pol_name, tbl_name, cmd, array_to_string(roles, ','), using_expr);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply optimizations to all tables reported in Lint
DO $$ 
BEGIN
    -- PROFILES
    PERFORM public.recreate_optimized_policy('profiles', 'Users can view their own profile', 'SELECT', ARRAY['public'], '(SELECT auth.uid()) = id');
    PERFORM public.recreate_optimized_policy('profiles', 'Users can update their own profile', 'UPDATE', ARRAY['public'], '(SELECT auth.uid()) = id');
    PERFORM public.recreate_optimized_policy('profiles', 'Admins can view all profiles', 'SELECT', ARRAY['authenticated'], '(SELECT public.is_admin())');
    PERFORM public.recreate_optimized_policy('profiles', 'Admins can update all profiles', 'UPDATE', ARRAY['authenticated'], '(SELECT public.is_admin())');

    -- BOARDS
    PERFORM public.recreate_optimized_policy('boards', 'Users can view their own boards', 'SELECT', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('boards', 'Users can insert their own boards', 'INSERT', ARRAY['public'], 'true', '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('boards', 'Users can update their own boards', 'UPDATE', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('boards', 'Users can delete their own boards', 'DELETE', ARRAY['public'], '(SELECT auth.uid()) = user_id');

    -- CANVAS IMAGES
    PERFORM public.recreate_optimized_policy('canvas_images', 'Users can view their own images', 'SELECT', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('canvas_images', 'Users can insert their own images', 'INSERT', ARRAY['public'], 'true', '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('canvas_images', 'Users can update their own images', 'UPDATE', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('canvas_images', 'Users can delete their own images', 'DELETE', ARRAY['public'], '(SELECT auth.uid()) = user_id');

    -- GENERATION JOBS
    PERFORM public.recreate_optimized_policy('generation_jobs', 'Users can view their own jobs', 'SELECT', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('generation_jobs', 'Users can insert their own jobs', 'INSERT', ARRAY['public'], 'true', '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('generation_jobs', 'Users can update their own jobs', 'UPDATE', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    PERFORM public.recreate_optimized_policy('generation_jobs', 'Users can delete their own jobs', 'DELETE', ARRAY['public'], '(SELECT auth.uid()) = user_id');

    -- GLOBAL PRESETS (Overlapping fixes)
    PERFORM public.recreate_optimized_policy('global_presets', 'Public Presets Read', 'SELECT', ARRAY['public'], 'true');
    PERFORM public.recreate_optimized_policy('global_presets', 'Admin Presets Write', 'INSERT,UPDATE,DELETE', ARRAY['authenticated'], '(SELECT public.is_admin())');

    -- GLOBAL OBJECTS (Overlapping fixes)
    PERFORM public.recreate_optimized_policy('global_objects_categories', 'Public Categories Read', 'SELECT', ARRAY['public'], 'true');
    PERFORM public.recreate_optimized_policy('global_objects_categories', 'Admin Objects Write', 'INSERT,UPDATE,DELETE', ARRAY['authenticated'], '(SELECT public.is_admin())');
    PERFORM public.recreate_optimized_policy('global_objects_items', 'Public Items Read', 'SELECT', ARRAY['public'], 'true');
    PERFORM public.recreate_optimized_policy('global_objects_items', 'Admin Items Write', 'INSERT,UPDATE,DELETE', ARRAY['authenticated'], '(SELECT public.is_admin())');

    -- TABLES POSSIBLY ADDED VIA UI (mentioned in lint)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_presets') THEN
        PERFORM public.recreate_optimized_policy('user_presets', 'Users can manage own presets', 'ALL', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_bookmarks') THEN
        PERFORM public.recreate_optimized_policy('user_bookmarks', 'Users can manage own bookmarks', 'ALL', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_objects') THEN
        PERFORM public.recreate_optimized_policy('user_objects', 'Users can manage their own objects', 'ALL', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_hidden_objects') THEN
        PERFORM public.recreate_optimized_policy('user_hidden_objects', 'Users can manage their hidden objects', 'ALL', ARRAY['public'], '(SELECT auth.uid()) = user_id');
    END IF;
END $$;

-- 3. Cleanup helper
DROP FUNCTION public.recreate_optimized_policy(text, text, text, text[], text, text);

-- 4. Storage fix
DROP POLICY IF EXISTS "Users can access their own folder" ON storage.objects;
CREATE POLICY "Users can access their own folder" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'user-content' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
