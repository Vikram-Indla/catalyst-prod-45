-- ════════════════════════════════════════════════════════════════════════
--  Admin Overhaul — Phase 0 — RLS, orphan rename, audit, feature flag
--  Run via Lovable's SQL runner. Idempotent. Re-running is safe.
-- ════════════════════════════════════════════════════════════════════════
--
-- Sections:
--   A.  RLS hardening for 4 admin-touched tables
--   B.  Rename 12 orphan tables to _zz_<name> for one-sprint observation
--   C.  Create admin_action_audit
--   D.  Insert admin_v2_enabled feature flag (default OFF)
--   E.  PostgREST cache reload (NOTIFY + DDL nudge)
--   F.  Smoke verify
--
-- Per CLAUDE.md L1: all schema changes go via Lovable's SQL runner.
-- Per CLAUDE.md L1b: PostgREST cache reload escalation ladder is
--   NOTIFY pgrst -> COMMENT ON TABLE DDL nudge -> Lovable redeploy.
-- ════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- A. RLS hardening
-- ─────────────────────────────────────────────────────────────────────────
--
-- Pattern: admin/owner role required for writes; authenticated reads
-- depend on the table. The role check joins user_product_roles to
-- product_roles by name so renaming the role label flows through.

-- A.1  jira_auth_credentials  (CRITICAL — was unprotected API keys)
ALTER TABLE IF EXISTS public.jira_auth_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jira_auth_credentials_select ON public.jira_auth_credentials;
CREATE POLICY jira_auth_credentials_select ON public.jira_auth_credentials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS jira_auth_credentials_write ON public.jira_auth_credentials;
CREATE POLICY jira_auth_credentials_write ON public.jira_auth_credentials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

-- A.2  custom_field_defs
ALTER TABLE IF EXISTS public.custom_field_defs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS custom_field_defs_select ON public.custom_field_defs;
CREATE POLICY custom_field_defs_select ON public.custom_field_defs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS custom_field_defs_write ON public.custom_field_defs;
CREATE POLICY custom_field_defs_write ON public.custom_field_defs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

-- A.3  admin_permission_audit
ALTER TABLE IF EXISTS public.admin_permission_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_permission_audit_select ON public.admin_permission_audit;
CREATE POLICY admin_permission_audit_select ON public.admin_permission_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS admin_permission_audit_insert ON public.admin_permission_audit;
CREATE POLICY admin_permission_audit_insert ON public.admin_permission_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

-- A.4  admin_nav_modules
ALTER TABLE IF EXISTS public.admin_nav_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_nav_modules_select ON public.admin_nav_modules;
CREATE POLICY admin_nav_modules_select ON public.admin_nav_modules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS admin_nav_modules_write ON public.admin_nav_modules;
CREATE POLICY admin_nav_modules_write ON public.admin_nav_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- B. Orphan rename — 12 tables to _zz_<name> for one-sprint observation
-- ─────────────────────────────────────────────────────────────────────────
--
-- These tables had no consuming code as of the audit. Renaming to _zz_
-- keeps them in the database (so any cron / trigger surfaces immediately)
-- but moves them out of the working tree of admin v2 surfaces. After one
-- full sprint of no failures, they can be dropped.
--
-- NOT included: jira_auth_credentials (still in active use via
-- admin/JiraSyncControlPage; just got RLS in section A).

DO $$
DECLARE
  t text;
  orphans text[] := ARRAY[
    'disposable_email_domains',
    'drawer_tab_configs',
    'enterprise_grid_user_state',
    'feature_flag_audit',
    'generation_events',
    'generation_items',
    'home_migration_metrics',
    'mask_rules',
    'module_packages',
    'ph_hierarchy_overrides',
    'project_sync_summary',
    'template_workspaces'
  ];
BEGIN
  FOREACH t IN ARRAY orphans LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, '_zz_' || t);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- C. admin_action_audit — new audit table for useAdminMutation
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_action_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  table_name      text NOT NULL,
  row_id          text NULL,
  before_state    jsonb NULL,
  after_state     jsonb NULL,
  reason          text NULL,
  ip_address      inet NULL,
  user_agent      text NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_action_audit_actor_created_idx
  ON public.admin_action_audit (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_audit_table_created_idx
  ON public.admin_action_audit (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_audit_created_idx
  ON public.admin_action_audit (created_at DESC);

ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_action_audit_select ON public.admin_action_audit;
CREATE POLICY admin_action_audit_select ON public.admin_action_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_product_roles upr
      JOIN public.product_roles pr ON pr.id = upr.product_role_id
      WHERE upr.user_id = auth.uid()
        AND pr.name IN ('admin', 'owner')
    )
  );

-- The insert policy lets any authenticated user log THEIR OWN actions.
-- The hook only inserts after a successful mutation, so this is safe.
DROP POLICY IF EXISTS admin_action_audit_insert ON public.admin_action_audit;
CREATE POLICY admin_action_audit_insert ON public.admin_action_audit
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

GRANT SELECT, INSERT ON public.admin_action_audit
  TO authenticated, anon, service_role, authenticator;

-- ─────────────────────────────────────────────────────────────────────────
-- D. Feature flag — admin_v2_enabled (default OFF)
-- ─────────────────────────────────────────────────────────────────────────
--
-- The legacy useFeatureFlag hook queries `flag_key` which does not exist
-- on this table. useAdminV2Flag queries `module_key` instead. Use ON
-- CONFLICT DO NOTHING so re-runs don't reset operator-flipped values.

INSERT INTO public.feature_flags (
  module_key, label, module_name, description, category, status,
  enabled, is_enabled, route, group_name, icon_name, icon_color,
  sort_order, updated_by_name
) VALUES (
  'admin_v2_enabled',
  'Admin v2',
  'admin_v2',
  'Phase 0 — gates the /admin/v2 re-architected admin surface.',
  'admin',
  'beta',
  false,
  false,
  '/admin/v2',
  'admin',
  'shield',
  '#0C66E4',
  0,
  'system'
)
ON CONFLICT (module_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- E. PostgREST cache reload (CLAUDE.md L1b)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Step 1 — soft reload via NOTIFY. Usually enough.
-- Step 2 — DDL nudge via COMMENT ON TABLE forces a reload if the cache is
-- stuck. If both fail, the next escalation rung is a Lovable redeploy.

NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.admin_action_audit IS
  'Phase 0 admin overhaul audit log. Reload nudge: '
  || to_char(now(), 'YYYY-MM-DD HH24:MI:SS');

-- ─────────────────────────────────────────────────────────────────────────
-- F. Smoke verify — paste the output back to confirm everything took
-- ─────────────────────────────────────────────────────────────────────────

-- 1. RLS is enabled on the four hardened tables
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
  'jira_auth_credentials',
  'custom_field_defs',
  'admin_permission_audit',
  'admin_nav_modules',
  'admin_action_audit'
)
ORDER BY relname;

-- 2. Orphans renamed to _zz_
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '\_zz\_%' ESCAPE '\'
ORDER BY table_name;

-- 3. Feature flag is in place
SELECT module_key, label, enabled, is_enabled
FROM public.feature_flags
WHERE module_key = 'admin_v2_enabled';

-- 4. Policies installed on admin_action_audit
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'admin_action_audit'
ORDER BY policyname;

-- 5. Audit table is queryable (will be empty until the first admin v2 write)
SELECT count(*) AS rows FROM public.admin_action_audit;
