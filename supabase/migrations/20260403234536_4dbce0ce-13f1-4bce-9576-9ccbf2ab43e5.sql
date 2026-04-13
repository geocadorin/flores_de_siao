-- Update setup_new_tenant to use 'admin' for the first user
CREATE OR REPLACE FUNCTION public.setup_new_tenant(p_user_id uuid, p_tenant_name text, p_tenant_slug text, p_full_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES (p_tenant_name, p_tenant_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.profiles (user_id, tenant_id, full_name, role)
  VALUES (p_user_id, v_tenant_id, p_full_name, 'admin');
END;
$$;

-- Trigger function: auto-assign role on profile insert
-- If no other profile exists in the tenant, assign 'admin'; otherwise 'user'
CREATE OR REPLACE FUNCTION public.assign_role_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-assign if role was not explicitly set or is the default 'staff'
  IF NEW.role = 'staff' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE tenant_id = NEW.tenant_id AND id != NEW.id
    ) THEN
      NEW.role := 'admin';
    ELSE
      NEW.role := 'user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_role_assignment
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_role_on_profile_insert();