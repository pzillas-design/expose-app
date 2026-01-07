-- 1. Fix Profiles Table (Critical for Edge Function)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS credits DECIMAL DEFAULT 10.0;

-- 2. Fix Canvas Images Table (Critical for Saving Images)
ALTER TABLE public.canvas_images
ADD COLUMN IF NOT EXISTS real_width INTEGER,
ADD COLUMN IF NOT EXISTS real_height INTEGER,
ADD COLUMN IF NOT EXISTS thumb_storage_path TEXT,
ADD COLUMN IF NOT EXISTS user_draft_prompt TEXT,
ADD COLUMN IF NOT EXISTS model_version TEXT,
ADD COLUMN IF NOT EXISTS board_id UUID;

-- 3. Ensure RLS allows users to read their own credits
-- (Existing policies might cover this, but being safe)
