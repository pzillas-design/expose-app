-- Protect sensitive profile fields (credits, role, total_spent) from client-side manipulation.
-- Only service_role requests (edge functions) can modify these fields.
-- Regular authenticated users can still update safe fields like full_name, avatar_url, last_active_at.

CREATE OR REPLACE FUNCTION protect_sensitive_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    NEW.credits := OLD.credits;
    NEW.role := OLD.role;
    NEW.total_spent := OLD.total_spent;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION protect_sensitive_profile_fields();
