-- Add missing columns to profiles table to prevent Admin Page crash
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_spent DECIMAL DEFAULT 0.0;

-- Ensure these columns have defaults for existing rows
UPDATE public.profiles SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.profiles SET last_active_at = NOW() WHERE last_active_at IS NULL;
UPDATE public.profiles SET total_spent = 0.0 WHERE total_spent IS NULL;
