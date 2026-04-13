
-- 1. Trigger function to prevent staff overlap
CREATE OR REPLACE FUNCTION public.prevent_staff_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Skip if no staff assigned or appointment is not active
  IF NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('completed', 'cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping appointments
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.staff_id = NEW.staff_id
      AND a.tenant_id = NEW.tenant_id
      AND a.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.status IN ('scheduled', 'confirmed')
      AND tstzrange(a.scheduled_at, a.scheduled_at + make_interval(mins => a.duration_minutes), '[)')
       && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_minutes), '[)')
  ) THEN
    RAISE EXCEPTION 'Conflito de horário: o atendente já possui um agendamento neste intervalo.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Attach trigger
DROP TRIGGER IF EXISTS trg_prevent_staff_overlap ON public.appointments;
CREATE TRIGGER trg_prevent_staff_overlap
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_staff_overlap();

-- 3. Atomic manage_appointment function
CREATE OR REPLACE FUNCTION public.manage_appointment(
  p_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_service_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_duration_minutes integer DEFAULT NULL,
  p_client_package_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result RECORD;
  v_duration INTEGER;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Determine duration
  IF p_duration_minutes IS NOT NULL THEN
    v_duration := p_duration_minutes;
  ELSIF p_service_id IS NOT NULL THEN
    SELECT duration_minutes INTO v_duration FROM public.services WHERE id = p_service_id AND tenant_id = v_tenant_id;
  ELSE
    v_duration := 60;
  END IF;

  IF p_id IS NOT NULL THEN
    -- UPDATE existing appointment
    UPDATE public.appointments SET
      client_id = COALESCE(p_client_id, client_id),
      service_id = COALESCE(p_service_id, service_id),
      staff_id = p_staff_id,
      scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
      duration_minutes = COALESCE(v_duration, duration_minutes),
      client_package_id = p_client_package_id,
      notes = p_notes,
      updated_at = now()
    WHERE id = p_id AND tenant_id = v_tenant_id
    RETURNING * INTO v_result;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Agendamento não encontrado';
    END IF;
  ELSE
    -- INSERT new appointment
    IF p_client_id IS NULL OR p_service_id IS NULL OR p_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'client_id, service_id e scheduled_at são obrigatórios';
    END IF;

    INSERT INTO public.appointments (
      tenant_id, client_id, service_id, staff_id, scheduled_at,
      duration_minutes, client_package_id, notes
    ) VALUES (
      v_tenant_id, p_client_id, p_service_id, p_staff_id, p_scheduled_at,
      v_duration, p_client_package_id, p_notes
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN json_build_object(
    'id', v_result.id,
    'tenant_id', v_result.tenant_id,
    'client_id', v_result.client_id,
    'service_id', v_result.service_id,
    'staff_id', v_result.staff_id,
    'scheduled_at', v_result.scheduled_at,
    'duration_minutes', v_result.duration_minutes,
    'status', v_result.status
  );
END;
$$;
