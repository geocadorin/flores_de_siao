
-- Allow tenant members to delete services
CREATE POLICY "Tenant members can delete services"
ON public.services
FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Allow tenant members to delete packages
CREATE POLICY "Tenant members can delete packages"
ON public.packages
FOR DELETE
USING (tenant_id = get_user_tenant_id());
