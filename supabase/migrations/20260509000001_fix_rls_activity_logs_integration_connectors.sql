-- Block 1 — admin Phase C RLS hardening (2026-05-09)
--
-- Audit findings:
--   activity_logs          — USING(true) → any user could read all audit logs
--                            and INSERT fabricated entries.
--   integration_connectors — USING(true) → any user could read auth_config_json
--                            (API secrets) and mutate connectors.
--
-- Fix:
--   activity_logs          → SELECT admin-only; no INSERT/UPDATE/DELETE for
--                            authenticated role (edge functions insert via
--                            service_role which bypasses RLS).
--   integration_connectors → all operations admin-only.
--
-- Companion tests: supabase/tests/rls_activity_logs.test.sql
--                  supabase/tests/rls_integration_connectors.test.sql

-- ── activity_logs ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.activity_logs;

-- Admins can read the full audit trail (admin UI, reporting).
CREATE POLICY "Admins can read audit log"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (public.is_user_admin(auth.uid()));

-- No INSERT / UPDATE / DELETE policy for the authenticated role.
-- Only the service_role (edge functions, triggers) may write audit entries.
-- Supabase service_role bypasses RLS — no explicit policy needed.

-- ── integration_connectors ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.integration_connectors;

CREATE POLICY "Admins can read connectors"
  ON public.integration_connectors
  FOR SELECT
  TO authenticated
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can insert connectors"
  ON public.integration_connectors
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update connectors"
  ON public.integration_connectors
  FOR UPDATE
  TO authenticated
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can delete connectors"
  ON public.integration_connectors
  FOR DELETE
  TO authenticated
  USING (public.is_user_admin(auth.uid()));
