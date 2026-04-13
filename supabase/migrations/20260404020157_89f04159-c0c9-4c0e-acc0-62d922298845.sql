
-- Function to get public staff list for a tenant by slug
CREATE OR REPLACE FUNCTION public.get_public_staff(p_slug text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
  FROM (
    SELECT DISTINCT p.id, p.full_name
    FROM public.profiles p
    JOIN public.tenants t ON t.id = p.tenant_id
    JOIN public.business_hours bh ON bh.staff_id = p.id AND bh.tenant_id = t.id AND bh.active = true
    WHERE t.slug = p_slug
    ORDER BY p.full_name
  ) s;
$$;

-- Function to get available time slots for a staff member on a given date
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
AS $$
DECLARE
  v_tenant_id UUID;
  v_day_of_week INTEGER;
  v_duration INTEGER;
  v_bh RECORD;
  v_slots JSON;
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

  -- Generate slots every 30 min within business hours, excluding occupied ones
  SELECT COALESCE(json_agg(slot_time ORDER BY slot_time), '[]'::json)
  INTO v_slots
  FROM (
    SELECT to_char(gs, 'HH24:MI') as slot_time
    FROM generate_series(
      (p_date + v_bh.start_time)::timestamp,
      (p_date + v_bh.end_time - (v_duration || ' minutes')::interval)::timestamp,
      '30 minutes'::interval
    ) gs
    WHERE NOT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.staff_id = p_staff_id
        AND a.tenant_id = v_tenant_id
        AND a.status IN ('scheduled', 'confirmed')
        AND tstzrange(
            a.scheduled_at,
            a.scheduled_at + make_interval(mins => a.duration_minutes),
            '[)'
          )
        &&
          tstzrange(
            gs::timestamptz,
            gs::timestamptz + make_interval(mins => v_duration),
            '[)'
          )
    )
  ) available;

  RETURN v_slots;
END;
$$;
