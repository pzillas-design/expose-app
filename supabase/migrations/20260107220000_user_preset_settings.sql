-- Add original_id to global_presets to track forks of system presets
ALTER TABLE public.global_presets 
ADD COLUMN IF NOT EXISTS original_id UUID REFERENCES public.global_presets(id) ON DELETE SET NULL;

-- Create table to track user-specific preset preferences (like hiding system presets)
CREATE TABLE IF NOT EXISTS public.user_preset_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_id UUID NOT NULL REFERENCES public.global_presets(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, preset_id)
);

-- Enable RLS on preferences
ALTER TABLE public.user_preset_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for preferences
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preset_preferences;
END $$;

CREATE POLICY "Users can manage own preferences" 
ON public.user_preset_preferences FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_preset_prefs_user_id ON public.user_preset_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_global_presets_original_id ON public.global_presets(original_id);
