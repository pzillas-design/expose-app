-- Create boards table
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Mein Board',
    thumbnail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add board_id to canvas_images
ALTER TABLE public.canvas_images ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;

-- Add board_id to generation_jobs if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'generation_jobs') THEN
        ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Enable RLS on boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own boards' AND tablename = 'boards') THEN
    CREATE POLICY "Users can view their own boards" ON public.boards FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own boards' AND tablename = 'boards') THEN
    CREATE POLICY "Users can insert their own boards" ON public.boards FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own boards' AND tablename = 'boards') THEN
    CREATE POLICY "Users can update their own boards" ON public.boards FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own boards' AND tablename = 'boards') THEN
    CREATE POLICY "Users can delete their own boards" ON public.boards FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Update existing images to belong to a default board for each user
DO $$
DECLARE
    user_record RECORD;
    new_board_id UUID;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM public.canvas_images WHERE board_id IS NULL LOOP
        -- Create a default board for the user
        INSERT INTO public.boards (user_id, name)
        VALUES (user_record.user_id, 'Mein Board')
        RETURNING id INTO new_board_id;

        -- Update images for this user
        UPDATE public.canvas_images
        SET board_id = new_board_id
        WHERE user_id = user_record.user_id AND board_id IS NULL;
    END LOOP;
END
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_images_board_id ON public.canvas_images(board_id);
