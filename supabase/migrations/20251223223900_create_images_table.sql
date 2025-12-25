-- Create a private bucket for user content
INSERT INTO storage.buckets (id, name, public) VALUES ('user-content', 'user-content', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for Storage: Users can see and upload their own files
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can upload their own content' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can upload their own content" on storage.objects for insert to authenticated with check ( bucket_id = 'user-content' and auth.uid() = owner );
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own content' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can view their own content" on storage.objects for select to authenticated using ( bucket_id = 'user-content' and auth.uid() = owner );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own content' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can update their own content" on storage.objects for update to authenticated using ( bucket_id = 'user-content' and auth.uid() = owner );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own content' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can delete their own content" on storage.objects for delete to authenticated using ( bucket_id = 'user-content' and auth.uid() = owner );
  end if;
end
$$;


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
-- RLS Policies for Table
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own images' and tablename = 'canvas_images') then
    create policy "Users can view their own images" on public.canvas_images for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own images' and tablename = 'canvas_images') then
    create policy "Users can insert their own images" on public.canvas_images for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own images' and tablename = 'canvas_images') then
    create policy "Users can update their own images" on public.canvas_images for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own images' and tablename = 'canvas_images') then
    create policy "Users can delete their own images" on public.canvas_images for delete using (auth.uid() = user_id);
  end if;
end
$$;

-- Create index for faster lookups based on usage
CREATE INDEX IF NOT EXISTS idx_canvas_images_user_id ON public.canvas_images(user_id);
