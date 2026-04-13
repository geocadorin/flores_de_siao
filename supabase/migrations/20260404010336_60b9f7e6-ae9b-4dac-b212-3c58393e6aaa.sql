
-- Tenant settings table
CREATE TABLE public.tenant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  allow_registration BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view settings" ON public.tenant_settings 
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can update settings" ON public.tenant_settings 
FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can insert settings" ON public.tenant_settings 
FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_tenant_settings_updated_at 
BEFORE UPDATE ON public.tenant_settings 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings audit log
CREATE TABLE public.settings_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view audit log" ON public.settings_audit_log 
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can insert audit log" ON public.settings_audit_log 
FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- Function to check if registration is allowed (public, used by edge function)
CREATE OR REPLACE FUNCTION public.is_registration_allowed(p_slug text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_allowed BOOLEAN;
BEGIN
  -- If no slug, this is a new tenant registration - always allowed
  IF p_slug IS NULL OR p_slug = '' THEN
    RETURN true;
  END IF;

  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = p_slug;
  IF v_tenant_id IS NULL THEN
    RETURN true; -- tenant not found, allow (new tenant)
  END IF;

  SELECT allow_registration INTO v_allowed 
  FROM public.tenant_settings 
  WHERE tenant_id = v_tenant_id;

  -- If no settings row, default to allowed
  RETURN COALESCE(v_allowed, true);
END;
$$;

-- Function to update settings with audit trail
CREATE OR REPLACE FUNCTION public.update_registration_setting(p_allow_registration boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_profile RECORD;
  v_old_value BOOLEAN;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Check admin
  SELECT * INTO v_profile FROM public.profiles
  WHERE user_id = auth.uid() AND tenant_id = v_tenant_id;
  
  IF v_profile.role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar esta configuração';
  END IF;

  -- Get or create settings
  SELECT allow_registration INTO v_old_value 
  FROM public.tenant_settings WHERE tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    INSERT INTO public.tenant_settings (tenant_id, allow_registration)
    VALUES (v_tenant_id, p_allow_registration);
    v_old_value := true;
  ELSE
    UPDATE public.tenant_settings 
    SET allow_registration = p_allow_registration
    WHERE tenant_id = v_tenant_id;
  END IF;

  -- Audit log
  INSERT INTO public.settings_audit_log (tenant_id, changed_by, field_name, old_value, new_value)
  VALUES (v_tenant_id, auth.uid(), 'allow_registration', v_old_value::text, p_allow_registration::text);

  RETURN json_build_object('allow_registration', p_allow_registration);
END;
$$;
