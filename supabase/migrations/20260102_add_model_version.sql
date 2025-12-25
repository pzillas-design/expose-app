-- Add model_version column to canvas_images to store actual model name from API
ALTER TABLE public.canvas_images 
ADD COLUMN IF NOT EXISTS model_version TEXT;
