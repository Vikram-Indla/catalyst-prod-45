-- ============================================================
-- Jira Integration Admin Module — Production Schema
-- 2026-06-24
--
-- Comprehensive sync management: mappings, filters, webhooks, refresh
-- ============================================================

-- ── 1. Per-Project Sync Filters ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jira_project_sync_filters (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_project_key        text NOT NULL REFERENCES public.ph_jira_projects(project_key) ON DELETE CASCADE,

  -- Date filtering
  date_mode               text NOT NULL DEFAULT 'all_time'
                            CHECK (date_mode IN ('all_time', 'fixed_range', 'relative_window', 'year_selection')),
  date_basis              text NOT NULL DEFAULT 'created'
                            CHECK (date_basis IN ('created', 'updated', 'resolved', 'due')),
  fixed_start_date        date,
  fixed_end_date          date,
  relative_window_value   integer,  -- for 'last N months/weeks/days'
  relative_window_unit    text CHECK (relative_window_unit IN ('day', 'week', 'month')),
  year_selection          integer[] DEFAULT '{}',  -- array of years like [2025, 2026]

  -- Issue type filtering
  include_issue_types     text[] DEFAULT '{}',  -- empty = all
  exclude_issue_types     text[] DEFAULT '{}',

  -- Status filtering
  include_statuses        text[] DEFAULT '{}',  -- empty = all
  exclude_statuses        text[] DEFAULT '{}',

  -- Generated JQL preview (read-only, regenerated on update)
  generated_jql_preview   text,

  -- Validation
  is_valid                boolean NOT NULL DEFAULT true,
  validation_errors       text[],  -- array of error messages if invalid

  -- Audit
  created_at              timestamptz DEFAULT now() NOT NULL,
  updated_at              timestamptz DEFAULT now() NOT NULL,
  created_by              uuid REFERENCES auth.users(id),
  updated_by              uuid REFERENCES auth.users(id),

  CONSTRAINT unique_project_filter UNIQUE(jira_project_key)
);

COMMENT ON TABLE public.jira_project_sync_filters IS
  'Per-Jira-project sync filters. Controls which issues are synced based on date range, issue type, status.';

ALTER TABLE public.jira_project_sync_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage project filters" ON public.jira_project_sync_filters;
CREATE POLICY "Admins manage project filters" ON public.jira_project_sync_filters
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Authenticated can read filters" ON public.jira_project_sync_filters;
CREATE POLICY "Authenticated can read filters" ON public.jira_project_sync_filters
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER handle_jira_project_sync_filters_updated_at
  BEFORE UPDATE ON public.jira_project_sync_filters
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── 2. Comprehensive Field Mappings ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.jira_sync_mappings (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Type mappings
  jira_issue_type         text UNIQUE,  -- 'Epic', 'Story', 'Task', etc.
  catalyst_work_item_type text,         -- maps to Catalyst canonical type
  target_table            text,         -- 'ph_issues', 'business_requests', etc.
  hierarchy_rule          text,         -- 'parent', 'standalone', 'child_of_epic', etc.
  type_mapping_status     text NOT NULL DEFAULT 'unmapped'
                            CHECK (type_mapping_status IN ('mapped', 'ignored', 'unmapped', 'error')),

  -- Status mappings
  jira_status_name        text,
  jira_status_id          text,
  jira_status_category    text,         -- 'to do', 'in progress', 'done'
  catalyst_status         text,         -- 'New', 'In Develop', 'Closed', etc.
  status_is_terminal      boolean DEFAULT false,
  status_mapping_status   text NOT NULL DEFAULT 'unmapped'
                            CHECK (status_mapping_status IN ('mapped', 'exact_match', 'auto_suggested', 'deviation', 'unmapped', 'no_equivalent')),

  -- Field mappings
  jira_field_key          text,
  jira_field_name         text,
  jira_field_type         text,         -- 'string', 'number', 'date', 'user', 'custom'
  catalyst_column         text,         -- column name in target table
  field_mapping_status    text NOT NULL DEFAULT 'raw'
                            CHECK (field_mapping_status IN ('mapped', 'raw_json_only', 'ignored', 'missing')),

  -- Deviation tracking
  has_deviation           boolean DEFAULT false,
  deviation_reason        text,         -- why it doesn't map perfectly
  action_required         text,         -- 'configure', 'ignore', 'manual_check'

  created_at              timestamptz DEFAULT now() NOT NULL,
  updated_at              timestamptz DEFAULT now() NOT NULL,
  created_by              uuid REFERENCES auth.users(id),
  updated_by              uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.jira_sync_mappings IS
  'Jira→Catalyst type, status, and field mappings. Three-part mapping: types (Jira type → Catalyst type → table), statuses (Jira status → Catalyst status), fields (Jira field → Catalyst column or raw_json).';

ALTER TABLE public.jira_sync_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage mappings" ON public.jira_sync_mappings;
CREATE POLICY "Admins manage mappings" ON public.jira_sync_mappings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Authenticated can read mappings" ON public.jira_sync_mappings;
CREATE POLICY "Authenticated can read mappings" ON public.jira_sync_mappings
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER handle_jira_sync_mappings_updated_at
  BEFORE UPDATE ON public.jira_sync_mappings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── 3. Webhook Control & Metrics ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jira_webhook_control (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Control state
  listening_enabled       boolean NOT NULL DEFAULT false,
  webhook_status          text NOT NULL DEFAULT 'inactive'
                            CHECK (webhook_status IN ('inactive', 'listening', 'error', 'paused')),

  -- Health metrics
  last_webhook_received   timestamptz,
  last_webhook_processed  timestamptz,
  webhook_skipped_count   bigint DEFAULT 0,
  webhook_failed_count    bigint DEFAULT 0,
  webhook_blocked_reason  text,        -- why webhook processing is blocked (if blocked)

  -- Processing blocked flags
  blocked_by_mapping      boolean DEFAULT false,  -- mappings incomplete
  blocked_by_project      boolean DEFAULT false,  -- project not enabled or mapped
  blocked_by_filter       boolean DEFAULT false,  -- project filter invalid

  last_status_check       timestamptz DEFAULT now(),

  created_at              timestamptz DEFAULT now() NOT NULL,
  updated_at              timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.jira_webhook_control IS
  'Global webhook listening state and health metrics. One row tracks all webhook activity.';

ALTER TABLE public.jira_webhook_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage webhook control" ON public.jira_webhook_control;
CREATE POLICY "Admins manage webhook control" ON public.jira_webhook_control
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Authenticated can read webhook status" ON public.jira_webhook_control;
CREATE POLICY "Authenticated can read webhook status" ON public.jira_webhook_control
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER handle_jira_webhook_control_updated_at
  BEFORE UPDATE ON public.jira_webhook_control
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── 4. MDT Contract — Permanent Mapping ───────────────────────────
-- Enforce that MDT always routes to Investor Journey product
CREATE OR REPLACE FUNCTION public.enforce_mdt_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.jira_project_key = 'MDT' THEN
    NEW.module_target := 'product';
    NEW.sync_enabled := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_mdt_product_routing
  BEFORE INSERT OR UPDATE ON public.ph_jira_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mdt_contract();

COMMENT ON FUNCTION public.enforce_mdt_contract() IS
  'Permanent contract: MDT project always routes to product module (Investor Journey). Cannot be overridden.';

-- ── 5. Refresh Data Audit Log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jira_refresh_data_audit (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Operation metadata
  operation_type          text NOT NULL CHECK (operation_type IN ('dry_run', 'confirmed_refresh')),
  status                  text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Scope
  all_projects            boolean NOT NULL DEFAULT false,
  project_keys            text[],  -- specific projects if not all

  -- Applied filters
  filters_applied         jsonb,   -- snapshot of filters at refresh time

  -- Results
  records_deleted         bigint DEFAULT 0,
  records_reloaded        bigint DEFAULT 0,
  errors_encountered      text[],

  -- Audit trail
  triggered_by            uuid NOT NULL REFERENCES auth.users(id),
  confirmation_phrase     text,  -- stored hash of confirmation for audit
  started_at              timestamptz DEFAULT now(),
  completed_at            timestamptz,

  created_at              timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.jira_refresh_data_audit IS
  'Audit log for all Refresh Data operations. Tracks what was deleted, reloaded, and who triggered it.';

ALTER TABLE public.jira_refresh_data_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read refresh audit" ON public.jira_refresh_data_audit;
CREATE POLICY "Admins read refresh audit" ON public.jira_refresh_data_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- ── 6. Initialize webhook control row ─────────────────────────────
INSERT INTO public.jira_webhook_control (listening_enabled, webhook_status)
  VALUES (false, 'inactive')
  ON CONFLICT DO NOTHING;

-- ── 7. Extend ph_jira_projects with schema-version check ──────────
-- Already added in prior migration; verify columns exist
ALTER TABLE public.ph_jira_projects
  ADD COLUMN IF NOT EXISTS sync_filter_id uuid REFERENCES public.jira_project_sync_filters(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ph_jira_projects.sync_filter_id IS
  'FK to jira_project_sync_filters for per-project date/type/status filtering.';

-- ── 8. Sync metadata for dry-run snapshots ─────────────────────────
CREATE TABLE IF NOT EXISTS public.jira_sync_dry_run_snapshots (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  jira_project_key        text NOT NULL REFERENCES public.ph_jira_projects(project_key) ON DELETE CASCADE,
  filters_snapshot        jsonb NOT NULL,  -- snapshot of filters used in dry run

  estimated_records_to_delete  bigint,
  estimated_records_to_reload  bigint,
  affected_issue_count    integer,

  created_at              timestamptz DEFAULT now() NOT NULL,
  created_by              uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.jira_sync_dry_run_snapshots IS
  'Snapshots from dry-run operations showing what would be deleted/reloaded before admin confirms.';

ALTER TABLE public.jira_sync_dry_run_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read dry-run snapshots" ON public.jira_sync_dry_run_snapshots;
CREATE POLICY "Admins read dry-run snapshots" ON public.jira_sync_dry_run_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );
