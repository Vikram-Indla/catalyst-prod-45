-- ════════════════════════════════════════════════════════════════════════
--  Admin Overhaul — Phase 2a — Workflows surface
--  Run via Lovable's SQL runner. Idempotent. Re-running is safe.
-- ════════════════════════════════════════════════════════════════════════
--
-- This bundle:
--   A.  RLS hardening on the three workflow tables
--   B.  Optional feature flag insert (workflows_v2_enabled)
--   C.  PostgREST cache reload nudge
--   D.  Smoke verify
--
-- Workflows v2 ships behind the same `admin_v2_enabled` flag as the rest
-- of the surface, so the section-B insert is OPTIONAL — only run it if
-- you want a per-section dark-launch toggle. The page is reachable as
-- soon as `admin_v2_enabled` is on.

-- ─── A. RLS hardening — the three workflow tables ───────────────────────

-- A.1  catalyst_workflow_schemes
ALTER TABLE IF EXISTS public.catalyst_workflow_schemes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalyst_workflow_schemes_select ON public.catalyst_workflow_schemes;
CREATE POLICY catalyst_workflow_schemes_select ON public.catalyst_workflow_schemes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS catalyst_workflow_schemes_write ON public.catalyst_workflow_schemes;
CREATE POLICY catalyst_workflow_schemes_write ON public.catalyst_workflow_schemes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code IN ('super_admin','product_owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code IN ('super_admin','product_owner')
  ));

-- A.2  catalyst_workflow_statuses
ALTER TABLE IF EXISTS public.catalyst_workflow_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalyst_workflow_statuses_select ON public.catalyst_workflow_statuses;
CREATE POLICY catalyst_workflow_statuses_select ON public.catalyst_workflow_statuses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS catalyst_workflow_statuses_write ON public.catalyst_workflow_statuses;
CREATE POLICY catalyst_workflow_statuses_write ON public.catalyst_workflow_statuses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code IN ('super_admin','product_owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code IN ('super_admin','product_owner')
  ));

-- A.3  catalyst_workflow_transitions
ALTER TABLE IF EXISTS public.catalyst_workflow_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalyst_workflow_transitions_select ON public.catalyst_workflow_transitions;
CREATE POLICY catalyst_workflow_transitions_select ON public.catalyst_workflow_transitions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS catalyst_workflow_transitions_write ON public.catalyst_workflow_transitions;
CREATE POLICY catalyst_workflow_transitions_write ON public.catalyst_workflow_transitions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code IN ('super_admin','product_owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code IN ('super_admin','product_owner')
  ));

-- ─── B. Optional per-section flag (skip if you only use admin_v2_enabled) ──

INSERT INTO public.feature_flags (
  module_key, label, module_name, description, category, status,
  enabled, is_enabled, route, group_name, icon_name, icon_color,
  sort_order, updated_by_name
) VALUES (
  'workflows_v2_enabled','Workflows v2','workflows_v2',
  'Phase 2a — gates the /admin/v2/work-items/workflows surface independently.',
  'admin','beta',true,true,'/admin/v2/work-items/workflows','admin','flow-chart','#0C66E4',10,'system'
)
ON CONFLICT (module_key) DO NOTHING;

-- ─── C. PostgREST cache reload ──────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  EXECUTE format(
    'COMMENT ON TABLE public.catalyst_workflow_schemes IS %L',
    'Phase 2a admin overhaul. Reload nudge: '
      || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
END $$;

-- ─── D. Smoke verify ────────────────────────────────────────────────────

-- 1. RLS enabled on all three workflow tables
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
  'catalyst_workflow_schemes',
  'catalyst_workflow_statuses',
  'catalyst_workflow_transitions'
)
ORDER BY relname;

-- 2. Policies installed
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename LIKE 'catalyst_workflow_%'
ORDER BY tablename, policyname;

-- 3. Sanity row counts (will reflect existing data)
SELECT 'schemes' AS entity, count(*) AS rows FROM public.catalyst_workflow_schemes
UNION ALL
SELECT 'statuses', count(*) FROM public.catalyst_workflow_statuses
UNION ALL
SELECT 'transitions', count(*) FROM public.catalyst_workflow_transitions;

-- 4. Workflows v2 flag (if section B was run)
SELECT module_key, label, enabled, is_enabled
FROM public.feature_flags WHERE module_key = 'workflows_v2_enabled';
