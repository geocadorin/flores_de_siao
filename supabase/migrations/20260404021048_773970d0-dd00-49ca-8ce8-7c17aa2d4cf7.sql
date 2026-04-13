
CREATE OR REPLACE FUNCTION public.get_all_public_tenants()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT id, name, slug, phone, address, logo_url
    FROM public.tenants
    ORDER BY name
  ) t;
$$;
