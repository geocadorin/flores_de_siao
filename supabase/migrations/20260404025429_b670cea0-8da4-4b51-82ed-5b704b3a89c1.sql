-- Allow tenant members to delete messages
CREATE POLICY "Tenant members can delete messages"
ON public.messages
FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Allow tenant members to delete from queue
CREATE POLICY "Tenant members can delete queue"
ON public.messages_queue
FOR DELETE
USING (tenant_id = get_user_tenant_id());