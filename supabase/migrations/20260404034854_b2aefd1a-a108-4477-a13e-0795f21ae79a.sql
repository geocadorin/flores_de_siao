
-- Add onboarding and segment columns to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS segment text;

-- Function to complete onboarding
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem completar o onboarding';
  END IF;

  UPDATE public.tenants 
  SET onboarding_completed = true, updated_at = now()
  WHERE id = v_tenant_id;

  RETURN json_build_object('success', true);
END;
$$;
