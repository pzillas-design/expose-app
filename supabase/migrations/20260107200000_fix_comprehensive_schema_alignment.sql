-- COMPREHENSIVE SCHEMA ALIGNMENT FIX
-- This script ensures ALL columns expected by the frontend code exist in Supabase.

-- 1. Table: global_presets
ALTER TABLE public.global_presets 
ALTER COLUMN label DROP NOT NULL;

ALTER TABLE public.global_presets 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'de',
ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS controls JSONB;

-- Sync title from label if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='global_presets' AND column_name='label') THEN
        UPDATE public.global_presets SET title = label WHERE title IS NULL;
    END IF;
END $$;

-- 2. Table: generation_jobs
ALTER TABLE public.generation_jobs 
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS prompt TEXT,
ADD COLUMN IF NOT EXISTS tokens_prompt INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_completion INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_id UUID,
ADD COLUMN IF NOT EXISTS api_cost DECIMAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing'; -- ensures status exists if table was wiped

-- Sync prompt from prompt_preview if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generation_jobs' AND column_name='prompt_preview') THEN
        UPDATE public.generation_jobs SET prompt = prompt_preview WHERE prompt IS NULL;
    END IF;
END $$;

-- 3. Table: profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS credits DECIMAL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_spent DECIMAL DEFAULT 0.0;

-- 4. Table: canvas_images
ALTER TABLE public.canvas_images 
ADD COLUMN IF NOT EXISTS real_width INTEGER,
ADD COLUMN IF NOT EXISTS real_height INTEGER,
ADD COLUMN IF NOT EXISTS thumb_storage_path TEXT,
ADD COLUMN IF NOT EXISTS user_draft_prompt TEXT,
ADD COLUMN IF NOT EXISTS model_version TEXT,
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- 5. Final Schema Cache Reload Instruction (Implicit for User)
-- NOTIFY pgrst, 'reload schema';
