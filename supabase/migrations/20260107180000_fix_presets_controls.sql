-- Fix global_presets table: Add missing 'controls' column
ALTER TABLE public.global_presets 
ADD COLUMN IF NOT EXISTS controls JSONB;

-- Note: No default needed as it can be null (for presets without variables)
