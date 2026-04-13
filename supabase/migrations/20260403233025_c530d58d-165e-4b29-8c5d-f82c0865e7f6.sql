
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- TENANTS
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- PACKAGES (bundles of sessions)
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_sessions INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- CLIENT PACKAGES (purchased packages)
CREATE TABLE public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  sessions_total INT NOT NULL,
  sessions_used INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  client_package_id UUID REFERENCES public.client_packages(id),
  staff_id UUID REFERENCES public.profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- REMINDERS
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (type IN ('whatsapp', 'email', 'sms')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS POLICIES

CREATE POLICY "Users can view own tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id());

CREATE POLICY "Owners can update tenant" ON public.tenants
  FOR UPDATE USING (
    id = public.get_user_tenant_id()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Users can view tenant profiles" ON public.profiles
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Tenant members can view clients" ON public.clients
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert clients" ON public.clients
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update clients" ON public.clients
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can delete clients" ON public.clients
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can view services" ON public.services
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert services" ON public.services
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update services" ON public.services
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can view packages" ON public.packages
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert packages" ON public.packages
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update packages" ON public.packages
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can view client packages" ON public.client_packages
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert client packages" ON public.client_packages
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update client packages" ON public.client_packages
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can view appointments" ON public.appointments
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert appointments" ON public.appointments
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update appointments" ON public.appointments
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can delete appointments" ON public.appointments
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can view reminders" ON public.reminders
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert reminders" ON public.reminders
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update reminders" ON public.reminders
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- Triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_packages_updated_at BEFORE UPDATE ON public.client_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX idx_services_tenant ON public.services(tenant_id);
CREATE INDEX idx_packages_tenant ON public.packages(tenant_id);
CREATE INDEX idx_client_packages_tenant ON public.client_packages(tenant_id);
CREATE INDEX idx_client_packages_client ON public.client_packages(client_id);
CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_scheduled ON public.appointments(scheduled_at);
CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_reminders_tenant ON public.reminders(tenant_id);
CREATE INDEX idx_reminders_scheduled ON public.reminders(scheduled_for);

-- RPC: complete appointment and decrement session
CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment RECORD;
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  
  SELECT * INTO v_appointment FROM public.appointments 
  WHERE id = p_appointment_id AND tenant_id = v_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  UPDATE public.appointments SET status = 'completed' WHERE id = p_appointment_id;
  
  IF v_appointment.client_package_id IS NOT NULL THEN
    UPDATE public.client_packages 
    SET sessions_used = sessions_used + 1,
        status = CASE 
          WHEN sessions_used + 1 >= sessions_total THEN 'completed'
          ELSE status 
        END
    WHERE id = v_appointment.client_package_id AND tenant_id = v_tenant_id;
  END IF;
END;
$$;

-- RPC: get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  
  SELECT json_build_object(
    'total_clients', (SELECT COUNT(*) FROM public.clients WHERE tenant_id = v_tenant_id),
    'appointments_today', (SELECT COUNT(*) FROM public.appointments WHERE tenant_id = v_tenant_id AND scheduled_at::date = CURRENT_DATE),
    'appointments_week', (SELECT COUNT(*) FROM public.appointments WHERE tenant_id = v_tenant_id AND scheduled_at >= date_trunc('week', now()) AND scheduled_at < date_trunc('week', now()) + interval '7 days'),
    'active_packages', (SELECT COUNT(*) FROM public.client_packages WHERE tenant_id = v_tenant_id AND status = 'active'),
    'upcoming_appointments', (
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
      FROM (
        SELECT ap.id, ap.scheduled_at, ap.status, ap.duration_minutes,
               c.full_name as client_name, c.phone as client_phone,
               s.name as service_name
        FROM public.appointments ap
        JOIN public.clients c ON c.id = ap.client_id
        JOIN public.services s ON s.id = ap.service_id
        WHERE ap.tenant_id = v_tenant_id 
          AND ap.scheduled_at >= now()
          AND ap.status IN ('scheduled', 'confirmed')
        ORDER BY ap.scheduled_at
        LIMIT 10
      ) a
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
