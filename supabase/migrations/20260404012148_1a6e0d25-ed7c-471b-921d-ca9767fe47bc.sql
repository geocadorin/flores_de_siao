
CREATE OR REPLACE FUNCTION public.check_staff_availability(
  p_staff_id uuid,
  p_scheduled_at timestamp with time zone,
  p_duration_minutes integer,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_day_of_week INTEGER;
  v_time TIME;
  v_end_time TIME;
  v_bh RECORD;
  v_conflict RECORD;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Get day of week (0=Sunday, 6=Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_scheduled_at);
  v_time := (p_scheduled_at AT TIME ZONE 'America/Sao_Paulo')::time;
  v_end_time := v_time + (p_duration_minutes || ' minutes')::interval;

  -- Check business hours
  SELECT * INTO v_bh FROM public.business_hours
  WHERE staff_id = p_staff_id
    AND tenant_id = v_tenant_id
    AND day_of_week = v_day_of_week
    AND active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('available', false, 'reason', 'Atendente não trabalha neste dia');
  END IF;

  IF v_time < v_bh.start_time OR v_end_time > v_bh.end_time THEN
    RETURN json_build_object('available', false, 'reason', 
      'Fora do horário de trabalho (' || to_char(v_bh.start_time, 'HH24:MI') || ' - ' || to_char(v_bh.end_time, 'HH24:MI') || ')');
  END IF;

  -- Check conflicting appointments
  SELECT a.id INTO v_conflict
  FROM public.appointments a
  WHERE a.staff_id = p_staff_id
    AND a.tenant_id = v_tenant_id
    AND a.status IN ('scheduled', 'confirmed')
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    AND a.scheduled_at < (p_scheduled_at + (p_duration_minutes || ' minutes')::interval)
    AND (a.scheduled_at + (a.duration_minutes || ' minutes')::interval) > p_scheduled_at
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('available', false, 'reason', 'Conflito com outro agendamento');
  END IF;

  RETURN json_build_object('available', true, 'reason', null);
END;
$$;
