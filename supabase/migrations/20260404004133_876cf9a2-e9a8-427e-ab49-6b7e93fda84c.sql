
-- Create storage bucket for clinic logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true);

-- Anyone can view logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-logos');

-- Authenticated users can upload to their tenant folder
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinic-logos'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Authenticated users can update their tenant logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clinic-logos'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Authenticated users can delete their tenant logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clinic-logos'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Update get_reports_data to accept date range
CREATE OR REPLACE FUNCTION public.get_reports_data(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
  v_start TIMESTAMP WITH TIME ZONE;
  v_end TIMESTAMP WITH TIME ZONE;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  v_start := COALESCE(p_start_date, now() - interval '12 months');
  v_end := COALESCE(p_end_date, now());

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
          AND a.scheduled_at >= v_start
          AND a.scheduled_at <= v_end
        GROUP BY date_trunc('month', a.scheduled_at)
        ORDER BY date_trunc('month', a.scheduled_at)
      ) r
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(s.price), 0)::numeric
      FROM public.appointments a
      JOIN public.services s ON s.id = a.service_id
      WHERE a.tenant_id = v_tenant_id AND a.status = 'completed'
        AND a.scheduled_at >= v_start AND a.scheduled_at <= v_end
    ),
    'total_sessions', (
      SELECT COUNT(*)::integer
      FROM public.appointments
      WHERE tenant_id = v_tenant_id AND status = 'completed'
        AND scheduled_at >= v_start AND scheduled_at <= v_end
    ),
    'recurrence_rate', (
      SELECT CASE 
        WHEN total.cnt = 0 THEN 0
        ELSE ROUND((recurring.cnt::numeric / total.cnt::numeric) * 100, 1)
      END
      FROM 
        (SELECT COUNT(DISTINCT client_id)::integer as cnt FROM public.appointments WHERE tenant_id = v_tenant_id AND scheduled_at >= v_start AND scheduled_at <= v_end) total,
        (SELECT COUNT(*)::integer as cnt FROM (
          SELECT client_id FROM public.appointments WHERE tenant_id = v_tenant_id AND scheduled_at >= v_start AND scheduled_at <= v_end GROUP BY client_id HAVING COUNT(*) >= 2
        ) sub) recurring
    ),
    'top_services', (
      SELECT COALESCE(json_agg(row_to_json(ts)), '[]'::json)
      FROM (
        SELECT s.name, COUNT(*)::integer as count, COALESCE(SUM(s.price), 0)::numeric as revenue
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.tenant_id = v_tenant_id AND a.status = 'completed'
          AND a.scheduled_at >= v_start AND a.scheduled_at <= v_end
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 5
      ) ts
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
