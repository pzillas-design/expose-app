
-- Migration: Add user_objects table for custom stamps
CREATE TABLE IF NOT EXISTS public.user_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_objects ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies for user_objects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_objects' AND policyname = 'Users can manage their own objects'
    ) THEN
        CREATE POLICY "Users can manage their own objects" ON public.user_objects
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
