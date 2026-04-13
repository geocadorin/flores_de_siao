
-- Fix create_public_appointment: v_service_id -> p_service_id
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_tenant_slug text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_service_id uuid,
  p_scheduled_at timestamp with time zone,
  p_staff_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT id INTO v_client_id FROM public.clients
  WHERE tenant_id = v_tenant_id AND (phone = p_client_phone OR email = p_client_email)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (tenant_id, full_name, phone, email)
    VALUES (v_tenant_id, p_client_name, p_client_phone, p_client_email)
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO public.appointments (tenant_id, client_id, service_id, staff_id, scheduled_at, duration_minutes)
  VALUES (v_tenant_id, v_client_id, p_service_id, p_staff_id, p_scheduled_at, v_service.duration_minutes)
  RETURNING id INTO v_appointment_id;

  RETURN json_build_object('appointment_id', v_appointment_id, 'status', 'scheduled');
END;
$function$;

-- Rewrite get_public_available_slots to use service duration as step
-- and compare in America/Sao_Paulo timezone (same logic as admin panel)
CREATE OR REPLACE FUNCTION public.get_public_available_slots(
  p_slug text,
  p_staff_id uuid,
  p_date date,
  p_service_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_duration INTEGER;
  v_day_of_week INTEGER;
  v_bh RECORD;
  v_slots JSON;
  v_start_minutes INTEGER;
  v_end_minutes INTEGER;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = p_slug;
  IF v_tenant_id IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT duration_minutes INTO v_duration FROM public.services
  WHERE id = p_service_id AND tenant_id = v_tenant_id AND active = true;
  IF v_duration IS NULL THEN
    RETURN '[]'::json;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date);

  SELECT * INTO v_bh FROM public.business_hours
  WHERE staff_id = p_staff_id
    AND tenant_id = v_tenant_id
    AND day_of_week = v_day_of_week
    AND active = true;

  IF NOT FOUND THEN
    RETURN '[]'::json;
  END IF;

  v_start_minutes := EXTRACT(HOUR FROM v_bh.start_time) * 60 + EXTRACT(MINUTE FROM v_bh.start_time);
  v_end_minutes := EXTRACT(HOUR FROM v_bh.end_time) * 60 + EXTRACT(MINUTE FROM v_bh.end_time);

  -- Generate candidate slots using service duration as step (same as panel)
  -- Check overlap against existing appointments using local SP time
  SELECT COALESCE(json_agg(slot_label ORDER BY slot_label), '[]'::json)
  INTO v_slots
  FROM (
    SELECT
      lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0') AS slot_label,
      m AS slot_start,
      m + v_duration AS slot_end
    FROM generate_series(v_start_minutes, v_end_minutes - v_duration, v_duration) AS m
  ) candidates
  WHERE NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.staff_id = p_staff_id
      AND a.tenant_id = v_tenant_id
      AND a.status NOT IN ('cancelled', 'no_show')
      AND (a.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date
      AND (
        -- overlap check using local minutes
        EXTRACT(HOUR FROM (a.scheduled_at AT TIME ZONE 'America/Sao_Paulo'))::int * 60
          + EXTRACT(MINUTE FROM (a.scheduled_at AT TIME ZONE 'America/Sao_Paulo'))::int
        < candidates.slot_end
        AND
        EXTRACT(HOUR FROM (a.scheduled_at AT TIME ZONE 'America/Sao_Paulo'))::int * 60
          + EXTRACT(MINUTE FROM (a.scheduled_at AT TIME ZONE 'America/Sao_Paulo'))::int
          + a.duration_minutes
        > candidates.slot_start
      )
  );

  RETURN v_slots;
END;
$function$;
