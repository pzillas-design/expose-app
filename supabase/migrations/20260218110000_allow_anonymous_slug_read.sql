-- Allow anonymous users to read presets that have a slug (shared) or are system presets
DROP POLICY IF EXISTS "Public Presets Read" ON public.global_presets;

CREATE POLICY "Public Presets Read" 
ON public.global_presets FOR SELECT 
TO authenticated, anon 
USING (user_id IS NULL OR user_id = auth.uid() OR slug IS NOT NULL);
