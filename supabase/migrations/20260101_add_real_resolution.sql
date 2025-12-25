-- Add real resolution columns to canvas_images
ALTER TABLE public.canvas_images 
ADD COLUMN IF NOT EXISTS real_width INTEGER,
ADD COLUMN IF NOT EXISTS real_height INTEGER;
