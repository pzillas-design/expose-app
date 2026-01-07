-- Migration to change global_presets ID from UUID to TEXT to support readable system IDs
-- 1. Drop constraints that depend on the UUID type
ALTER TABLE IF EXISTS public.user_preset_preferences DROP CONSTRAINT IF EXISTS user_preset_preferences_preset_id_fkey;
ALTER TABLE IF EXISTS public.global_presets DROP CONSTRAINT IF EXISTS global_presets_original_id_fkey;

-- 2. Change column types in global_presets
ALTER TABLE public.global_presets ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.global_presets ALTER COLUMN original_id TYPE TEXT USING original_id::text;

-- 3. Change column type in user_preset_preferences
ALTER TABLE public.user_preset_preferences ALTER COLUMN preset_id TYPE TEXT USING preset_id::text;

-- 4. Re-add constraints
ALTER TABLE public.global_presets ADD CONSTRAINT global_presets_original_id_fkey FOREIGN KEY (original_id) REFERENCES public.global_presets(id) ON DELETE SET NULL;
ALTER TABLE public.user_preset_preferences ADD CONSTRAINT user_preset_preferences_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.global_presets(id) ON DELETE CASCADE;

-- 5. Remove the default gen_random_uuid() for the primary key to avoid confusing defaults if using text IDs
ALTER TABLE public.global_presets ALTER COLUMN id DROP DEFAULT;
