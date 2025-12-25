-- Migration to add thumbnail storage path for LOD performance
ALTER TABLE public.canvas_images 
ADD COLUMN IF NOT EXISTS thumb_storage_path TEXT;

-- Update existing records: if we wanted to backfill, we'd need a script, 
-- but for now new images will just have this filled.
