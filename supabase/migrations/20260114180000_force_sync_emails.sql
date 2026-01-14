-- FORCE SYNC EMAILS
-- This ensures that even if email was an empty string, it gets overwritten by the auth.users value.
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id 
  AND (p.email IS NULL OR p.email = '');
END $$;
