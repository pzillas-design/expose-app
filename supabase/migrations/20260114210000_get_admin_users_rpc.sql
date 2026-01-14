-- Secure function to fetch users for admin panel
-- Automatically joins with auth.users to get the real email
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  credits numeric,
  total_spent numeric,
  created_at timestamptz,
  last_active_at timestamptz
) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the requesting user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(au.email, p.email) as email, -- Prefer auth email, fallback to profile
    p.full_name,
    p.role,
    p.credits,
    p.total_spent,
    p.created_at,
    p.last_active_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;
