
-- Add user_draft_prompt column to canvas_images
ALTER TABLE public.canvas_images 
ADD COLUMN IF NOT EXISTS user_draft_prompt TEXT;

-- Verify policy checks (optional, just ensuring they exist from previous migration)
-- Policies are already defined on the table in create_images_table.sql
