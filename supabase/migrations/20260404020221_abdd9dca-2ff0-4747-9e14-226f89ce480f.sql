
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_tenant_slug text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_service_id uuid,
  p_scheduled_at timestamp with time zone,
  p_staff_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  INSERT INTO public.appointments (tenant_id, client_id, service_id, staff_id, scheduled_at, duration_minutes)
  VALUES (v_tenant_id, v_client_id, v_service_id, p_staff_id, p_scheduled_at, v_service.duration_minutes)
  RETURNING id INTO v_appointment_id;

  RETURN json_build_object('appointment_id', v_appointment_id, 'status', 'scheduled');
END;
$$;
