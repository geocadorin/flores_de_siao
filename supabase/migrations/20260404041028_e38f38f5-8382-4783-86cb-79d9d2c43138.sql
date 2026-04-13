
-- Add onboarding progress fields to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_skipped_steps text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_data jsonb;

-- Function to save onboarding progress
CREATE OR REPLACE FUNCTION public.save_onboarding_progress(
  p_step integer,
  p_skipped_steps text[] DEFAULT '{}',
  p_data jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem salvar progresso do onboarding';
  END IF;

  UPDATE public.tenants SET
    onboarding_step = p_step,
    onboarding_skipped_steps = p_skipped_steps,
    onboarding_data = COALESCE(p_data, onboarding_data),
    updated_at = now()
  WHERE id = v_tenant_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Update complete_onboarding to also seed default message templates
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem completar o onboarding';
  END IF;

  UPDATE public.tenants 
  SET onboarding_completed = true, updated_at = now()
  WHERE id = v_tenant_id;

  -- Seed default message templates if none exist
  IF NOT EXISTS (SELECT 1 FROM public.message_templates WHERE tenant_id = v_tenant_id LIMIT 1) THEN
    INSERT INTO public.message_templates (tenant_id, name, content, category) VALUES
      (v_tenant_id, 'Boas-vindas', 'Olá {{nome}}! 😊 Seja bem-vindo(a) à nossa clínica! Estamos felizes em tê-lo(a) conosco. Qualquer dúvida, estamos à disposição! ✨', 'welcome'),
      (v_tenant_id, 'Confirmação de Agendamento', 'Olá {{nome}}! ✅ Seu agendamento foi confirmado:' || chr(10) || '📋 {{servico}}' || chr(10) || '📅 {{data}} às {{hora}}' || chr(10) || 'Até lá! 💫', 'confirmation'),
      (v_tenant_id, 'Lembrete de Agendamento', 'Olá {{nome}}! ⏰ Lembrete: você tem um agendamento amanhã:' || chr(10) || '📋 {{servico}}' || chr(10) || '📅 {{data}} às {{hora}}' || chr(10) || 'Confirme sua presença! 😊', 'reminder');
  END IF;

  -- Seed default financial categories if none exist
  PERFORM public.seed_default_categories();

  RETURN json_build_object('success', true);
END;
$$;

-- Function to get onboarding progress
CREATE OR REPLACE FUNCTION public.get_onboarding_progress()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
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
    'step', onboarding_step,
    'skipped_steps', onboarding_skipped_steps,
    'data', onboarding_data,
    'completed', onboarding_completed
  ) INTO v_result
  FROM public.tenants
  WHERE id = v_tenant_id;

  RETURN v_result;
END;
$$;
