
CREATE OR REPLACE FUNCTION public.setup_new_tenant(
  p_user_id UUID,
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES (p_tenant_name, p_tenant_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.profiles (user_id, tenant_id, full_name, role)
  VALUES (p_user_id, v_tenant_id, p_full_name, 'owner');
END;
$$;
