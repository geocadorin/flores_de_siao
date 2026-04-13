
-- Staff-Service assignment table
CREATE TABLE public.staff_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, service_id)
);

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view staff_services"
  ON public.staff_services FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant members can insert staff_services"
  ON public.staff_services FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant members can delete staff_services"
  ON public.staff_services FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Business hours per staff member
CREATE TABLE public.business_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view business_hours"
  ON public.business_hours FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant members can insert business_hours"
  ON public.business_hours FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant members can update business_hours"
  ON public.business_hours FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant members can delete business_hours"
  ON public.business_hours FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
