CREATE TABLE IF NOT EXISTS public.injira_tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES injira_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.injira_tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own tenant memberships"
  ON public.injira_tenant_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage tenant memberships"
  ON public.injira_tenant_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Seed: add all existing users to the default tenant
INSERT INTO public.injira_tenant_members (tenant_id, user_id)
SELECT t.id, p.id
FROM public.injira_tenants t, public.profiles p
WHERE t.key = 'default-tenant'
ON CONFLICT DO NOTHING;