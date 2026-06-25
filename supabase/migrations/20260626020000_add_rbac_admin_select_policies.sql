-- Phase 1.2A: Add SELECT policies and table-level grants for RBAC tables
--
-- Scope:
--   - SELECT policies only (no INSERT/UPDATE/DELETE)
--   - All 14 rbac_* tables
--   - Table-level GRANT SELECT to authenticated role
--   - Admin-only access via public.user_roles.role = 'admin'::public.app_role
--
-- Prerequisites:
--   - Phase 1.1 schema applied (rbac_* tables exist with RLS enabled)
--   - public.user_roles table exists
--   - public.app_role enum exists with 'admin' value
--
-- Post-condition:
--   - authenticated role can SELECT from rbac_* tables if user has admin role
--   - RLS policies enforce admin-only access
--   - Phase 1.2 UI implementation can read RBAC configuration

-- ============================================================================
-- GRANT SELECT to authenticated role
-- ============================================================================
-- PostgreSQL requires table-level GRANT before RLS policies are evaluated.
-- Phase 1.1 created rbac_* tables with RLS enabled but no grants.
-- Without these GRANT statements, PostgREST returns 403 "permission denied".

-- Grant on public.user_roles (required for EXISTS subquery in policies)
GRANT SELECT ON TABLE public.user_roles TO authenticated;

-- Grants on all 14 rbac_* tables
GRANT SELECT ON TABLE public.rbac_roles TO authenticated;
GRANT SELECT ON TABLE public.rbac_user_roles TO authenticated;
GRANT SELECT ON TABLE public.rbac_guest_access TO authenticated;
GRANT SELECT ON TABLE public.rbac_modules TO authenticated;
GRANT SELECT ON TABLE public.rbac_entities TO authenticated;
GRANT SELECT ON TABLE public.rbac_fields TO authenticated;
GRANT SELECT ON TABLE public.rbac_actions TO authenticated;
GRANT SELECT ON TABLE public.rbac_workflows TO authenticated;
GRANT SELECT ON TABLE public.rbac_workflow_transitions TO authenticated;
GRANT SELECT ON TABLE public.rbac_role_module_permissions TO authenticated;
GRANT SELECT ON TABLE public.rbac_role_field_permissions TO authenticated;
GRANT SELECT ON TABLE public.rbac_role_action_permissions TO authenticated;
GRANT SELECT ON TABLE public.rbac_role_transition_permissions TO authenticated;
GRANT SELECT ON TABLE public.rbac_permission_audit_log TO authenticated;

-- ============================================================================
-- CREATE SELECT policies (admin-only access)
-- ============================================================================
-- Pattern: Admin-only gate via EXISTS (SELECT 1 FROM public.user_roles ...)
-- Non-admins: GRANT granted, RLS USING check fails → 0 rows returned
-- Admins: GRANT granted, RLS USING check passes → rows returned

CREATE POLICY "Admin can read roles"
  ON public.rbac_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read user role assignments"
  ON public.rbac_user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read guest access"
  ON public.rbac_guest_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read modules"
  ON public.rbac_modules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read entities"
  ON public.rbac_entities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read fields"
  ON public.rbac_fields
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read actions"
  ON public.rbac_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read workflows"
  ON public.rbac_workflows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read workflow transitions"
  ON public.rbac_workflow_transitions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read role module permissions"
  ON public.rbac_role_module_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read role field permissions"
  ON public.rbac_role_field_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read role action permissions"
  ON public.rbac_role_action_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read role transition permissions"
  ON public.rbac_role_transition_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "Admin can read permission audit log"
  ON public.rbac_permission_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );
