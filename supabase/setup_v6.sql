-- ============================================================================
-- EXPOSE V6 CODEX - CLEAN INIT SCHEMA
-- Run this entire script in the Supabase SQL Editor of the new project.
-- ============================================================================

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  credits DECIMAL DEFAULT 100.0,
  total_spent DECIMAL DEFAULT 0.0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Auth Trigger for New Profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, joined_at, last_active_at)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', NOW(), NOW());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Canvas Images Table (Streamlined)
CREATE TABLE public.canvas_images (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT,
  thumb_storage_path TEXT,
  width INTEGER,
  height INTEGER,
  real_width INTEGER,
  real_height INTEGER,
  title TEXT,
  base_name TEXT,
  version INTEGER DEFAULT 1,
  is_generating BOOLEAN DEFAULT FALSE,
  prompt TEXT,
  user_draft_prompt TEXT,
  parent_id UUID,
  job_id UUID,
  annotations JSONB,
  generation_params JSONB,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.canvas_images ENABLE ROW LEVEL SECURITY;

-- 4. Generation Jobs Table
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  type TEXT DEFAULT 'Generation',
  model TEXT,
  status TEXT DEFAULT 'processing',
  cost DECIMAL DEFAULT 0.0,
  api_cost DECIMAL DEFAULT 0.0,
  tokens_prompt INTEGER DEFAULT 0,
  tokens_completion INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  prompt_preview TEXT,
  request_payload JSONB,
  board_id UUID,
  parent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- 5. Global Presets Table
CREATE TABLE public.global_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  prompt TEXT,
  emoji TEXT,
  tags JSONB,
  is_custom BOOLEAN DEFAULT FALSE,
  controls JSONB,
  lang TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.global_presets ENABLE ROW LEVEL SECURITY;

-- 6. User Objects Tables
CREATE TABLE public.user_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_objects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_hidden_objects (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  PRIMARY KEY (user_id, object_id)
);
ALTER TABLE public.user_hidden_objects ENABLE ROW LEVEL SECURITY;

-- 7. Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    credits DECIMAL,
    total_spent DECIMAL,
    created_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.email,
        p.full_name,
        p.role,
        p.credits,
        p.total_spent,
        p.created_at,
        p.last_active_at
    FROM public.profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Setup Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('user-content', 'user-content', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('user-settings', 'user-settings', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/json'])
ON CONFLICT (id) DO NOTHING;

-- 9. Setup RLS Security Policies
-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Canvas Images
CREATE POLICY "Users can view own images" ON public.canvas_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own images" ON public.canvas_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own images" ON public.canvas_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own images" ON public.canvas_images FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all images" ON public.canvas_images FOR SELECT USING (public.is_admin());

-- Generation Jobs
CREATE POLICY "Users can view own jobs" ON public.generation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.generation_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.generation_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.generation_jobs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all jobs" ON public.generation_jobs FOR SELECT USING (public.is_admin());

-- Global Presets
CREATE POLICY "Anyone can view presets" ON public.global_presets FOR SELECT USING (true);
CREATE POLICY "Users can create custom presets" ON public.global_presets FOR INSERT WITH CHECK (auth.uid() = user_id AND is_custom = true);
CREATE POLICY "Users can update own presets" ON public.global_presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own presets" ON public.global_presets FOR DELETE USING (auth.uid() = user_id);

-- User Objects
CREATE POLICY "Users can manage own objects" ON public.user_objects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own hidden objects" ON public.user_hidden_objects FOR ALL USING (auth.uid() = user_id);

-- Storage Policies: user-content
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'user-content' );
CREATE POLICY "Users can upload their own files" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'user-content' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING ( bucket_id = 'user-content' AND auth.uid()::text = owner::text );
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING ( bucket_id = 'user-content' AND auth.uid()::text = owner::text );

-- Storage Policies: user-settings
CREATE POLICY "Settings Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'user-settings' );
CREATE POLICY "Users can upload settings" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'user-settings' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update settings" ON storage.objects FOR UPDATE USING ( bucket_id = 'user-settings' AND auth.uid()::text = owner::text );
CREATE POLICY "Users can delete settings" ON storage.objects FOR DELETE USING ( bucket_id = 'user-settings' AND auth.uid()::text = owner::text );

-- ============================================================================
-- DONE!
-- ============================================================================
