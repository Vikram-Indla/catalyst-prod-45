-- Fix ph_jira_connection RLS — gate on user_roles, not profiles.role.
--
-- Root cause (P0 recovery, 2026-06-24): jira_connection_admin_select gated on
-- profiles.role IN ('admin','super_admin'). Catalyst stores system roles in
-- public.user_roles (CLAUDE.md 2026-05-12 / 2026-05-19), so profiles.role is
-- typically null for admins. AdminGuard admits the user (via user_roles) but the
-- RLS read returns nothing → useJiraConnection sees no row → the page falsely shows
-- "Not configured" even when a valid, connected ph_jira_connection row exists
-- (confirmed via service-role readiness function: status='connected').
--
-- Canonical Catalyst admin check inside RLS:
--   EXISTS (SELECT 1 FROM public.user_roles ur
--           WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)

DO $$
BEGIN
  -- SELECT
  DROP POLICY IF EXISTS jira_connection_admin_select ON public.ph_jira_connection;
  CREATE POLICY jira_connection_admin_select ON public.ph_jira_connection
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
      )
    );

  -- UPDATE
  DROP POLICY IF EXISTS jira_connection_admin_update ON public.ph_jira_connection;
  CREATE POLICY jira_connection_admin_update ON public.ph_jira_connection
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
      )
    );
END $$;
