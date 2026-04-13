-- Messages log table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  direction TEXT NOT NULL DEFAULT 'outbound',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view messages" ON public.messages
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant members can insert messages" ON public.messages
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant members can update messages" ON public.messages
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- Messages queue for async processing
CREATE TABLE public.messages_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.messages_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view queue" ON public.messages_queue
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant members can insert queue" ON public.messages_queue
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Evolution API instances per tenant
CREATE TABLE public.evolution_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  api_url TEXT NOT NULL DEFAULT 'https://api.evolution-api.com',
  api_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, instance_name)
);

ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view instances" ON public.evolution_instances
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can insert instances" ON public.evolution_instances
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can update instances" ON public.evolution_instances
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can delete instances" ON public.evolution_instances
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- Function to queue a message (callable via RPC)
CREATE OR REPLACE FUNCTION public.queue_message(
  p_client_id UUID,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_queue_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Insert into queue
  INSERT INTO public.messages_queue (tenant_id, client_id, message)
  VALUES (v_tenant_id, p_client_id, p_message)
  RETURNING id INTO v_queue_id;

  -- Insert into messages log
  INSERT INTO public.messages (tenant_id, client_id, message, status)
  VALUES (v_tenant_id, p_client_id, p_message, 'queued');

  RETURN v_queue_id;
END;
$$;

-- Auto-queue welcome message on client creation
CREATE OR REPLACE FUNCTION public.auto_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    INSERT INTO public.messages_queue (tenant_id, client_id, message)
    VALUES (NEW.tenant_id, NEW.id, 
      'Olá ' || NEW.full_name || '! 😊 Seja bem-vindo(a)! Estamos felizes em tê-lo(a) conosco. Qualquer dúvida, estamos à disposição! ✨');
    
    INSERT INTO public.messages (tenant_id, client_id, message, status)
    VALUES (NEW.tenant_id, NEW.id, 
      'Olá ' || NEW.full_name || '! 😊 Seja bem-vindo(a)! Estamos felizes em tê-lo(a) conosco. Qualquer dúvida, estamos à disposição! ✨', 'queued');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_welcome
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_welcome_message();

-- Auto-queue appointment confirmation
CREATE OR REPLACE FUNCTION public.auto_appointment_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_service RECORD;
  v_date_str TEXT;
  v_time_str TEXT;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE id = NEW.client_id;
  SELECT * INTO v_service FROM public.services WHERE id = NEW.service_id;
  
  v_date_str := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
  v_time_str := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  
  IF v_client.phone IS NOT NULL AND v_client.phone != '' THEN
    INSERT INTO public.messages_queue (tenant_id, client_id, message)
    VALUES (NEW.tenant_id, NEW.client_id, 
      'Olá ' || v_client.full_name || '! ✅ Seu agendamento foi confirmado:' || chr(10) ||
      '📋 ' || v_service.name || chr(10) ||
      '📅 ' || v_date_str || ' às ' || v_time_str || chr(10) ||
      '⏱ Duração: ' || NEW.duration_minutes || ' minutos' || chr(10) ||
      'Até lá! 💫');

    INSERT INTO public.messages (tenant_id, client_id, message, status)
    VALUES (NEW.tenant_id, NEW.client_id, 
      'Olá ' || v_client.full_name || '! ✅ Seu agendamento foi confirmado:' || chr(10) ||
      '📋 ' || v_service.name || chr(10) ||
      '📅 ' || v_date_str || ' às ' || v_time_str || chr(10) ||
      '⏱ Duração: ' || NEW.duration_minutes || ' minutos' || chr(10) ||
      'Até lá! 💫', 'queued');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_confirmation
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_appointment_confirmation();

-- Updated_at trigger for new tables
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evolution_instances_updated_at
  BEFORE UPDATE ON public.evolution_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();