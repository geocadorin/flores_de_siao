
-- Add hero customization columns
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS hero_title text,
ADD COLUMN IF NOT EXISTS hero_description text;

-- Update update_tenant_info to accept hero fields
CREATE OR REPLACE FUNCTION public.update_tenant_info(
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_hero_title text DEFAULT NULL,
  p_hero_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_profile RECORD;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

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
    hero_title = COALESCE(p_hero_title, hero_title),
    hero_description = COALESCE(p_hero_description, hero_description),
    updated_at = now()
  WHERE id = v_tenant_id;

  SELECT json_build_object(
    'id', id, 'name', name, 'slug', slug, 'phone', phone, 'address', address,
    'logo_url', logo_url, 'hero_title', hero_title, 'hero_description', hero_description
  ) INTO v_result
  FROM public.tenants WHERE id = v_tenant_id;

  RETURN v_result;
END;
$function$;

-- Update get_public_tenant_info
CREATE OR REPLACE FUNCTION public.get_public_tenant_info(p_slug text)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'id', id, 'name', name, 'slug', slug, 'phone', phone,
    'address', address, 'logo_url', logo_url,
    'hero_title', hero_title, 'hero_description', hero_description
  )
  FROM public.tenants WHERE slug = p_slug LIMIT 1;
$function$;

-- Update get_all_public_tenants
CREATE OR REPLACE FUNCTION public.get_all_public_tenants()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT id, name, slug, phone, address, logo_url, hero_title, hero_description
    FROM public.tenants ORDER BY name
  ) t;
$function$;
