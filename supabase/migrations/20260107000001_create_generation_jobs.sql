
CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'processing', 'pending')),
    cost DOUBLE PRECISION DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    thumbnail TEXT,
    prompt_preview TEXT
);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own jobs' AND tablename = 'generation_jobs') THEN
    CREATE POLICY "Users can view own jobs" ON public.generation_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own jobs' AND tablename = 'generation_jobs') THEN
    CREATE POLICY "Users can insert own jobs" ON public.generation_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all jobs' AND tablename = 'generation_jobs') THEN
    -- Admin policy might rely on is_admin() function which might not be there yet? 
    -- We assume standard RLS for now. is_admin() usually created in 0000... or early migration.
    -- If is_admin doesn't exist, we skip or use simple check.
    -- For safety we just let users see own. Admin view usually uses service_role or specific admin policy.
    NULL;
  END IF;
END $$;
