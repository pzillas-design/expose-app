-- Migration: Add parent_id to generation_jobs
ALTER TABLE public.generation_jobs 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.canvas_images(id) ON DELETE SET NULL;

-- Create index for faster lineage lookups
CREATE INDEX IF NOT EXISTS idx_generation_jobs_parent_id ON public.generation_jobs(parent_id);

COMMENT ON COLUMN public.generation_jobs.parent_id IS 'ID of the source image if this job is an edit or variation';
