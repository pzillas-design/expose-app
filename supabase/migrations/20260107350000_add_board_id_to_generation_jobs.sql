-- Migration: Add board_id column to generation_jobs
-- The column was missing entirely, causing 400 errors

ALTER TABLE public.generation_jobs 
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_jobs_board_id ON public.generation_jobs(board_id);
