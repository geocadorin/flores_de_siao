-- Remove the welcome message trigger to prevent duplicate sends
DROP TRIGGER IF EXISTS on_client_welcome ON public.clients;

-- Update the appointment confirmation function to include a greeting for first-time clients
CREATE OR REPLACE FUNCTION public.auto_appointment_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client RECORD;
  v_service RECORD;
  v_date_str TEXT;
  v_time_str TEXT;
  v_is_new_client BOOLEAN;
  v_greeting TEXT;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE id = NEW.client_id;
  SELECT * INTO v_service FROM public.services WHERE id = NEW.service_id;
  
  v_date_str := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY');
  v_time_str := to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  
  -- Check if this is the client's first appointment (new client)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE client_id = NEW.client_id AND id != NEW.id
  ) INTO v_is_new_client;
  
  -- Build greeting based on whether client is new
  IF v_is_new_client THEN
    v_greeting := 'Olá ' || v_client.full_name || '! 😊 Seja bem-vindo(a)! ' || chr(10) || chr(10) ||
      '✅ Seu primeiro agendamento foi confirmado:';
  ELSE
    v_greeting := 'Olá ' || v_client.full_name || '! ✅ Seu agendamento foi confirmado:';
  END IF;
  
  IF v_client.phone IS NOT NULL AND v_client.phone != '' THEN
    INSERT INTO public.messages_queue (tenant_id, client_id, message)
    VALUES (NEW.tenant_id, NEW.client_id,
      v_greeting || chr(10) ||
      '📋 ' || v_service.name || chr(10) ||
      '📅 ' || v_date_str || ' às ' || v_time_str || chr(10) ||
      '⏱ Duração: ' || NEW.duration_minutes || ' minutos' || chr(10) ||
      'Até lá! 💫');

    INSERT INTO public.messages (tenant_id, client_id, message, status)
    VALUES (NEW.tenant_id, NEW.client_id,
      v_greeting || chr(10) ||
      '📋 ' || v_service.name || chr(10) ||
      '📅 ' || v_date_str || ' às ' || v_time_str || chr(10) ||
      '⏱ Duração: ' || NEW.duration_minutes || ' minutos' || chr(10) ||
      'Até lá! 💫', 'queued');
  END IF;
  RETURN NEW;
END;
$function$;