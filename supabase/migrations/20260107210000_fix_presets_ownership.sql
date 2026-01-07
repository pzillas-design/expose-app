-- Add user_id column to global_presets to distinguish system vs user presets
ALTER TABLE public.global_presets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.global_presets ENABLE ROW LEVEL SECURITY;

-- Helper to drop policies safely
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Presets Read" ON public.global_presets;
    DROP POLICY IF EXISTS "Users can manage own presets" ON public.global_presets;
    DROP POLICY IF EXISTS "Admins can manage all presets" ON public.global_presets;
END $$;

-- 1. Read: Everyone can read system presets (user_id IS NULL) + their own presets
CREATE POLICY "Public Presets Read" 
ON public.global_presets FOR SELECT 
TO authenticated 
USING (user_id IS NULL OR user_id = auth.uid());

-- 2. Management: Users can only manage (insert/update/delete) their own presets
CREATE POLICY "Users can manage own presets" 
ON public.global_presets FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Admin: Admins can manage everything (override via is_admin check if needed)
-- Note: Supabase service role already bypasses RLS, but for client-side admin tools:
CREATE POLICY "Admins can manage all presets" 
ON public.global_presets FOR ALL 
TO authenticated 
USING (public.is_admin());
