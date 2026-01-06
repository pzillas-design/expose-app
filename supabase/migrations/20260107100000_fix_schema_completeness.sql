-- Migration: Fix Schema Completeness
-- Restore missing tables and columns required by userService and adminService

-- 1. Updates to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_spent DECIMAL DEFAULT 0.0;

-- 2. User Objects tables
CREATE TABLE IF NOT EXISTS public.user_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_hidden_objects (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    object_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, object_id)
);

-- 3. Global Objects Library
CREATE TABLE IF NOT EXISTS public.global_objects_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label_de TEXT NOT NULL,
    label_en TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_objects_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.global_objects_categories(id) ON DELETE CASCADE,
    label_de TEXT NOT NULL,
    label_en TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.user_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_objects_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_objects_items ENABLE ROW LEVEL SECURITY;

-- 5. Helper for safe policy recreation (copied from previous migration for standalone execution)
CREATE OR REPLACE FUNCTION public.recreate_optimized_policy_v2(
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

-- 6. Apply RLS Policies
DO $$ 
BEGIN
    -- user_objects: Owners can manage their own
    PERFORM public.recreate_optimized_policy_v2('user_objects', 'Users can manage their own objects', 'ALL', ARRAY['public'], '(SELECT auth.uid()) = user_id');

    -- user_hidden_objects: Owners can manage their own
    PERFORM public.recreate_optimized_policy_v2('user_hidden_objects', 'Users can manage their hidden objects', 'ALL', ARRAY['public'], '(SELECT auth.uid()) = user_id');

    -- global_objects_categories: Public read, Admin write
    PERFORM public.recreate_optimized_policy_v2('global_objects_categories', 'Public Categories Read', 'SELECT', ARRAY['public'], 'true');
    PERFORM public.recreate_optimized_policy_v2('global_objects_categories', 'Admin Categories Insert', 'INSERT', ARRAY['authenticated'], '(SELECT public.is_admin())');
    PERFORM public.recreate_optimized_policy_v2('global_objects_categories', 'Admin Categories Update', 'UPDATE', ARRAY['authenticated'], '(SELECT public.is_admin())');
    PERFORM public.recreate_optimized_policy_v2('global_objects_categories', 'Admin Categories Delete', 'DELETE', ARRAY['authenticated'], '(SELECT public.is_admin())');

    -- global_objects_items: Public read, Admin write
    PERFORM public.recreate_optimized_policy_v2('global_objects_items', 'Public Items Read', 'SELECT', ARRAY['public'], 'true');
    PERFORM public.recreate_optimized_policy_v2('global_objects_items', 'Admin Items Insert', 'INSERT', ARRAY['authenticated'], '(SELECT public.is_admin())');
    PERFORM public.recreate_optimized_policy_v2('global_objects_items', 'Admin Items Update', 'UPDATE', ARRAY['authenticated'], '(SELECT public.is_admin())');
    PERFORM public.recreate_optimized_policy_v2('global_objects_items', 'Admin Items Delete', 'DELETE', ARRAY['authenticated'], '(SELECT public.is_admin())');
END $$;

-- Cleanup helper
DROP FUNCTION public.recreate_optimized_policy_v2(text, text, text, text[], text);
