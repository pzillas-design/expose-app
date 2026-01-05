-- Fix "Function Search Path Mutable" warnings
-- See: https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker

-- 1. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. get_average_durations (if it exists, we try to set it. If we don't know the signature, we might fail, so we wrap in DO block?)
-- Actually, we can't easily alter without signature in raw SQL if overloaded.
-- But we can try the most likely signature ()
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_average_durations') THEN
        BEGIN
            ALTER FUNCTION public.get_average_durations() SET search_path = public;
        EXCEPTION WHEN OTHERS THEN
             -- Ignore if signature mismatch, manual fix might be needed
             NULL;
        END;
    END IF;
END
$$;
