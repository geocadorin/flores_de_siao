-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(tenant_id, email)
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view invitations"
  ON public.team_invitations FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can insert invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- Accept invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token uuid, p_user_id uuid, p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  SELECT * INTO v_invitation FROM public.team_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  INSERT INTO public.profiles (user_id, tenant_id, full_name, role)
  VALUES (p_user_id, v_invitation.tenant_id, p_full_name, v_invitation.role);

  UPDATE public.team_invitations SET status = 'accepted' WHERE id = v_invitation.id;
END;
$$;

-- Public tenant info (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_tenant_info(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'phone', phone,
    'address', address,
    'logo_url', logo_url
  )
  FROM public.tenants
  WHERE slug = p_slug
  LIMIT 1;
$$;

-- Public services listing (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_services(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
  FROM (
    SELECT sv.id, sv.name, sv.description, sv.duration_minutes, sv.price
    FROM public.services sv
    JOIN public.tenants t ON t.id = sv.tenant_id
    WHERE t.slug = p_slug AND sv.active = true
    ORDER BY sv.name
  ) s;
$$;

-- Public appointment creation (no auth required)
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_tenant_slug text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_service_id uuid,
  p_scheduled_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_client_id UUID;
  v_service RECORD;
  v_appointment_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = p_tenant_slug;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Clínica não encontrada';
  END IF;

  SELECT * INTO v_service FROM public.services
  WHERE id = p_service_id AND tenant_id = v_tenant_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço não encontrado';
  END IF;

  -- Find or create client
  SELECT id INTO v_client_id FROM public.clients
  WHERE tenant_id = v_tenant_id AND (phone = p_client_phone OR email = p_client_email)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (tenant_id, full_name, phone, email)
    VALUES (v_tenant_id, p_client_name, p_client_phone, p_client_email)
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO public.appointments (tenant_id, client_id, service_id, scheduled_at, duration_minutes)
  VALUES (v_tenant_id, v_client_id, v_service_id, p_scheduled_at, v_service.duration_minutes)
  RETURNING id INTO v_appointment_id;

  RETURN json_build_object('appointment_id', v_appointment_id, 'status', 'scheduled');
END;
$$;