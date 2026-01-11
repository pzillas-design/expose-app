-- Add job_id to canvas_images to link generations to their result images
ALTER TABLE public.canvas_images 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_canvas_images_job_id ON public.canvas_images(job_id);

-- Comment
COMMENT ON COLUMN public.canvas_images.job_id IS 'Links the generated image to its generation job for admin tracking';
