
-- Update complete_appointment to auto-generate revenue
CREATE OR REPLACE FUNCTION public.complete_appointment(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment RECORD;
  v_service RECORD;
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  
  SELECT * INTO v_appointment FROM public.appointments 
  WHERE id = p_appointment_id AND tenant_id = v_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_appointment.status = 'completed' THEN
    RAISE EXCEPTION 'Agendamento já foi concluído';
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

  -- Auto-generate income transaction
  SELECT * INTO v_service FROM public.services WHERE id = v_appointment.service_id;
  IF FOUND AND v_service.price > 0 THEN
    INSERT INTO public.financial_transactions (
      tenant_id, type, description, amount, transaction_date, appointment_id
    ) VALUES (
      v_tenant_id, 'income',
      'Serviço: ' || v_service.name,
      v_service.price,
      v_appointment.scheduled_at::date,
      p_appointment_id
    );
  END IF;
END;
$$;

-- Function to seed default categories for a tenant
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Only seed if tenant has no categories yet
  IF EXISTS (SELECT 1 FROM public.financial_categories WHERE tenant_id = v_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.financial_categories (tenant_id, name, type) VALUES
    (v_tenant_id, 'Consulta', 'income'),
    (v_tenant_id, 'Sessão', 'income'),
    (v_tenant_id, 'Pacote', 'income'),
    (v_tenant_id, 'Produto', 'income'),
    (v_tenant_id, 'Outros (Receita)', 'income'),
    (v_tenant_id, 'Material', 'expense'),
    (v_tenant_id, 'Aluguel', 'expense'),
    (v_tenant_id, 'Salários', 'expense'),
    (v_tenant_id, 'Marketing', 'expense'),
    (v_tenant_id, 'Manutenção', 'expense'),
    (v_tenant_id, 'Impostos', 'expense'),
    (v_tenant_id, 'Outros (Despesa)', 'expense');
END;
$$;
