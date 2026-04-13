
-- Function: get_reports_data
-- Returns monthly revenue, sessions, and client recurrence for the current tenant
CREATE OR REPLACE FUNCTION public.get_reports_data()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT json_build_object(
    'monthly_revenue', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT 
          to_char(date_trunc('month', a.scheduled_at), 'YYYY-MM') as month,
          to_char(date_trunc('month', a.scheduled_at), 'Mon/YY') as label,
          COALESCE(SUM(s.price), 0)::numeric as revenue,
          COUNT(*)::integer as sessions
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.tenant_id = v_tenant_id
          AND a.status = 'completed'
          AND a.scheduled_at >= (now() - interval '12 months')
        GROUP BY date_trunc('month', a.scheduled_at)
        ORDER BY date_trunc('month', a.scheduled_at)
      ) r
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(s.price), 0)::numeric
      FROM public.appointments a
      JOIN public.services s ON s.id = a.service_id
      WHERE a.tenant_id = v_tenant_id AND a.status = 'completed'
        AND a.scheduled_at >= date_trunc('month', now())
    ),
    'total_sessions', (
      SELECT COUNT(*)::integer
      FROM public.appointments
      WHERE tenant_id = v_tenant_id AND status = 'completed'
        AND scheduled_at >= date_trunc('month', now())
    ),
    'recurrence_rate', (
      SELECT CASE 
        WHEN total.cnt = 0 THEN 0
        ELSE ROUND((recurring.cnt::numeric / total.cnt::numeric) * 100, 1)
      END
      FROM 
        (SELECT COUNT(DISTINCT client_id)::integer as cnt FROM public.appointments WHERE tenant_id = v_tenant_id) total,
        (SELECT COUNT(*)::integer as cnt FROM (
          SELECT client_id FROM public.appointments WHERE tenant_id = v_tenant_id GROUP BY client_id HAVING COUNT(*) >= 2
        ) sub) recurring
    ),
    'top_services', (
      SELECT COALESCE(json_agg(row_to_json(ts)), '[]'::json)
      FROM (
        SELECT s.name, COUNT(*)::integer as count, COALESCE(SUM(s.price), 0)::numeric as revenue
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.tenant_id = v_tenant_id AND a.status = 'completed'
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 5
      ) ts
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function: update_tenant_info
-- Allows admin to update tenant details
CREATE OR REPLACE FUNCTION public.update_tenant_info(
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_logo_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_profile RECORD;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Check admin role
  SELECT * INTO v_profile FROM public.profiles
  WHERE user_id = auth.uid() AND tenant_id = v_tenant_id;
  
  IF v_profile.role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar configurações';
  END IF;

  UPDATE public.tenants SET
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    address = COALESCE(p_address, address),
    logo_url = COALESCE(p_logo_url, logo_url),
    updated_at = now()
  WHERE id = v_tenant_id;

  SELECT json_build_object(
    'id', id, 'name', name, 'slug', slug, 'phone', phone, 'address', address, 'logo_url', logo_url
  ) INTO v_result
  FROM public.tenants WHERE id = v_tenant_id;

  RETURN v_result;
END;
$$;
