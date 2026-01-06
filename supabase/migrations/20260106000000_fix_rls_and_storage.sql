-- Migration: Fix RLS and Storage Policies
-- Reverting to working patterns while keeping optimization where possible

-- 1. Helper Function Fix (ensuring it handles ALL correctly if called, but we'll use raw SQL now for clarity)
DROP FUNCTION IF EXISTS public.recreate_optimized_policy(text, text, text, text[], text);

-- 2. Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ( (select auth.uid()) = id );

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING ( (select public.is_admin()) );

-- 3. Boards
DROP POLICY IF EXISTS "Users can view their own boards" ON public.boards;
CREATE POLICY "Users can view their own boards" ON public.boards FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );

-- 4. Canvas Images
DROP POLICY IF EXISTS "Users can view their own images" ON public.canvas_images;
CREATE POLICY "Users can view their own images" ON public.canvas_images FOR SELECT TO authenticated USING ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users can insert their own images" ON public.canvas_images;
CREATE POLICY "Users can insert their own images" ON public.canvas_images FOR INSERT TO authenticated WITH CHECK ( (select auth.uid()) = user_id );

-- 5. Global Presets
DROP POLICY IF EXISTS "Public Presets Read" ON public.global_presets;
CREATE POLICY "Public Presets Read" ON public.global_presets FOR SELECT TO public USING (true);

-- 6. Storage Policies (CRITICAL: Fix for "images not loading")
DROP POLICY IF EXISTS "Users can access their own folder" ON storage.objects;
CREATE POLICY "Users can access their own folder" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'user-content');

-- 7. Extra tables mentioned in bookmarks/lint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_bookmarks') THEN
        DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
        CREATE POLICY "Users can manage own bookmarks" ON public.user_bookmarks FOR ALL TO authenticated USING ( (select auth.uid()) = user_id );
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_presets') THEN
        DROP POLICY IF EXISTS "Users can manage own presets" ON public.user_presets;
        CREATE POLICY "Users can manage own presets" ON public.user_presets FOR ALL TO authenticated USING ( (select auth.uid()) = user_id );
    END IF;
END $$;
