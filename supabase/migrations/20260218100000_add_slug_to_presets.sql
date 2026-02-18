-- Add slug column to global_presets
ALTER TABLE public.global_presets ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create an index for fast lookups by slug
CREATE INDEX IF NOT EXISTS idx_global_presets_slug ON public.global_presets(slug);

-- Optional: Generate slugs for existing presets if needed
-- This is a simple version, might need manual refinement if titles are duplicate
-- UPDATE public.global_presets SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
