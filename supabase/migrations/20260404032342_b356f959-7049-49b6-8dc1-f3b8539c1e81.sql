
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view templates"
  ON public.message_templates FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can insert templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update templates"
  ON public.message_templates FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can delete templates"
  ON public.message_templates FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
