
-- 1. Create helper function to check user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. Fix profiles INSERT policy - prevent self-assigning admin/owner roles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('staff', 'user')
);

-- 3. Fix profiles UPDATE policy - prevent changing role or tenant_id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  AND tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- 4. Restrict evolution_instances SELECT to admin/owner only
DROP POLICY IF EXISTS "Tenant members can view instances" ON public.evolution_instances;
CREATE POLICY "Admins can view instances"
ON public.evolution_instances
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND get_user_role() IN ('admin', 'owner')
);

-- 5. Restrict tenant_settings INSERT/UPDATE to admin/owner
DROP POLICY IF EXISTS "Tenant admins can insert settings" ON public.tenant_settings;
CREATE POLICY "Tenant admins can insert settings"
ON public.tenant_settings
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND get_user_role() IN ('admin', 'owner')
);

DROP POLICY IF EXISTS "Tenant admins can update settings" ON public.tenant_settings;
CREATE POLICY "Tenant admins can update settings"
ON public.tenant_settings
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND get_user_role() IN ('admin', 'owner')
);

-- 6. Restrict team_invitations SELECT to admin/owner
DROP POLICY IF EXISTS "Tenant members can view invitations" ON public.team_invitations;
CREATE POLICY "Admins can view invitations"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND get_user_role() IN ('admin', 'owner')
);

-- 7. Add DELETE policy for client_packages
CREATE POLICY "Tenant members can delete client packages"
ON public.client_packages
FOR DELETE
TO authenticated
USING (tenant_id = get_user_tenant_id());
