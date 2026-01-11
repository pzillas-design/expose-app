-- Add request_payload to generation_jobs to store the complete API request for debugging
ALTER TABLE public.generation_jobs 
ADD COLUMN IF NOT EXISTS request_payload JSONB;

-- Comment
COMMENT ON COLUMN public.generation_jobs.request_payload IS 'Complete Gemini API request payload for debugging and transparency';
