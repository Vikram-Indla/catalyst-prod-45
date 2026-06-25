-- Per-project Jira sync filter config (date window, issue types, statuses, fix versions)
-- + Catalyst module mapping. Feeds wh-jira-bulk-sync / wh-jira-sync via body.project_configs.
-- Storage choice: dedicated table (not ph_jira_projects.sync_config) for explicit per-env rows.

CREATE TABLE IF NOT EXISTS public.jira_project_sync_filters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment      text NOT NULL CHECK (environment IN ('staging','production','local')),
  project_key      text NOT NULL,
  -- Date window. Engine always floors to 2026 (P0 guard); lookback narrows within it.
  lookback_months  integer NOT NULL DEFAULT 3,
  date_basis       text NOT NULL DEFAULT 'updated' CHECK (date_basis IN ('created','updated')),
  -- Filters mapped to ProjectConfig.{issue_types,statuses,sprint_release}
  include_types    text[] NOT NULL DEFAULT '{}',
  include_statuses text[] NOT NULL DEFAULT '{}',
  sprint_release   text[] NOT NULL DEFAULT '{}',
  -- Catalyst module routing (e.g. MDT -> Investor Journey product)
  module_target    text,
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, project_key)
);

ALTER TABLE public.jira_project_sync_filters ENABLE ROW LEVEL SECURITY;

-- Non-PII config; AdminGuard gates the UI. Reads open to authenticated.
DROP POLICY IF EXISTS jira_sync_filters_select ON public.jira_project_sync_filters;
CREATE POLICY jira_sync_filters_select ON public.jira_project_sync_filters
  FOR SELECT TO authenticated USING (true);

-- Writes: admins only (canonical Catalyst admin check — never auth.jwt() role).
DROP POLICY IF EXISTS jira_sync_filters_write ON public.jira_project_sync_filters;
CREATE POLICY jira_sync_filters_write ON public.jira_project_sync_filters
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

-- Fixed mapping contract: MDT (Jira) always routes to Investor Journey (Catalyst product).
INSERT INTO public.jira_project_sync_filters (environment, project_key, module_target)
SELECT env, 'MDT', 'Investor Journey'
FROM (VALUES ('staging'), ('production')) AS e(env)
ON CONFLICT (environment, project_key)
DO UPDATE SET module_target = 'Investor Journey', updated_at = now();
