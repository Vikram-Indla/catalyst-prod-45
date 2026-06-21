-- ============================================================
-- Jira Sync Module — supporting tables and schema additions
-- 2026-06-21
-- ============================================================

-- ── 1. Webhook registrations ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.ph_jira_webhooks (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_webhook_id   text,
  url               text NOT NULL,
  events            text[] NOT NULL DEFAULT '{}',
  secret_hash       text,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive', 'error', 'pending')),
  last_triggered_at timestamptz,
  error_message     text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.ph_jira_webhooks IS
  'Stores Jira Cloud webhook registrations. Each row is one registered webhook endpoint.';

ALTER TABLE public.ph_jira_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage webhooks" ON public.ph_jira_webhooks;
CREATE POLICY "Admins manage webhooks" ON public.ph_jira_webhooks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- ── 2. Issue type mappings ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jira_type_mappings (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_type_name    text NOT NULL UNIQUE,
  catalyst_type     text,  -- NULL means 'ignore'
  action            text NOT NULL DEFAULT 'map'
                      CHECK (action IN ('map', 'ignore')),
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.jira_type_mappings IS
  'Maps Jira issue types not in the Catalyst 14-type registry to a canonical Catalyst type or ignore.';

ALTER TABLE public.jira_type_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage type mappings" ON public.jira_type_mappings;
CREATE POLICY "Admins manage type mappings" ON public.jira_type_mappings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Authenticated can read type mappings" ON public.jira_type_mappings;
CREATE POLICY "Authenticated can read type mappings" ON public.jira_type_mappings
  FOR SELECT TO authenticated USING (true);

-- ── 3. Backup metadata ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ph_catalyst_backups (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  size_bytes   bigint,
  tables       text[] NOT NULL DEFAULT '{}',
  error_msg    text,
  triggered_by uuid REFERENCES auth.users(id),
  started_at   timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

COMMENT ON TABLE public.ph_catalyst_backups IS
  'Tracks daily backup jobs. Storage path points to Supabase Storage bucket catalyst-backups.';

ALTER TABLE public.ph_catalyst_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage backups" ON public.ph_catalyst_backups;
CREATE POLICY "Admins manage backups" ON public.ph_catalyst_backups
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- ── 4. Extend ph_jira_projects ────────────────────────────
ALTER TABLE public.ph_jira_projects
  ADD COLUMN IF NOT EXISTS module_target text NOT NULL DEFAULT 'project'
    CHECK (module_target IN ('project', 'product')),
  ADD COLUMN IF NOT EXISTS sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_full_sync_at timestamptz;

COMMENT ON COLUMN public.ph_jira_projects.module_target IS
  'Routing target: project = project hub, product = product hub (business_requests). MDT is the only current product exception.';

-- Default MDT to product module (the only current exception)
UPDATE public.ph_jira_projects
  SET module_target = 'product'
  WHERE project_key = 'MDT'
    AND module_target = 'project';

-- ── 5. Sync settings in wh_config ─────────────────────────
-- Keys used by the Jira Sync admin page:
--   jira_auto_sync_enabled     boolean  (default true)
--   jira_sync_interval_minutes integer  (default 15)
--   jira_full_sync_time_utc    text     (default '02:00')
--   jira_webhooks_enabled      boolean  (default false — enable after registration)
--   jira_write_back_enabled    boolean  (default true)
--   jira_write_back_scope      text[]   (default ['status','assignee'])

INSERT INTO public.wh_config (key, value)
  VALUES
    ('jira_auto_sync_enabled',      'true'::jsonb),
    ('jira_sync_interval_minutes',  '15'::jsonb),
    ('jira_full_sync_time_utc',     '"02:00"'::jsonb),
    ('jira_webhooks_enabled',       'false'::jsonb),
    ('jira_write_back_enabled',     'true'::jsonb),
    ('jira_write_back_scope',       '["status","assignee"]'::jsonb)
  ON CONFLICT (key) DO NOTHING;

-- ── 6. Field delta tracking in wh_config ──────────────────
-- jira_field_decisions: jsonb object mapping Jira field key →
--   { action: 'keep_raw' | 'ignore' | 'promoted', label: string }
INSERT INTO public.wh_config (key, value)
  VALUES ('jira_field_decisions', '{}'::jsonb)
  ON CONFLICT (key) DO NOTHING;

-- ── 7. moddatetime triggers ───────────────────────────────
CREATE TRIGGER handle_ph_jira_webhooks_updated_at
  BEFORE UPDATE ON public.ph_jira_webhooks
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER handle_jira_type_mappings_updated_at
  BEFORE UPDATE ON public.jira_type_mappings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
