-- Create a private bucket for user content
INSERT INTO storage.buckets (id, name, public) VALUES ('user-content', 'user-content', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for Storage: Users can see and upload their own files
CREATE POLICY "Users can upload their own content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'user-content' AND auth.uid() = owner );

CREATE POLICY "Users can view their own content"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'user-content' AND auth.uid() = owner );

CREATE POLICY "Users can update their own content"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'user-content' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own content"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'user-content' AND auth.uid() = owner );


-- Create table for image metadata
CREATE TABLE IF NOT EXISTS public.canvas_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- File Data
    storage_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    
    -- Metadata
    title TEXT,
    base_name TEXT,
    version INTEGER DEFAULT 1,
    
    -- Generation Context
    prompt TEXT,
    generation_params JSONB, -- stores quality, model, etc.
    parent_id UUID, -- For tracking lineage (v1 -> v2)
    
    -- App State
    annotations JSONB, -- Store mask paths/stamps
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE public.canvas_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Table
CREATE POLICY "Users can view their own images"
ON public.canvas_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
ON public.canvas_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
ON public.canvas_images FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.canvas_images FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups based on usage
CREATE INDEX IF NOT EXISTS idx_canvas_images_user_id ON public.canvas_images(user_id);
