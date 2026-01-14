-- 1. FIX THE TRIGGER FUNCTION
-- Ensure email is always synced and defaults to 20.0 credits for new accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, credits)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    20.0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email; -- Update email if it triggers again
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. BACKFILL EMAILS
-- Copy emails from auth.users to public.profiles for existing users
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND p.email IS NULL;
END $$;
