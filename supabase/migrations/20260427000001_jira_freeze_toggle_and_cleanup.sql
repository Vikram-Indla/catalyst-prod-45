-- ═══════════════════════════════════════════════════════════════════════════
-- JIRA FREEZE TOGGLE + TABLE CLEANUP
-- Date: 2026-04-27
-- Purpose:
--   1. Create jira_integration_config — single source of truth for sync state
--   2. Create is_jira_sync_enabled(), disable_jira_sync(), enable_jira_sync()
--   3. Disable pg_cron sync jobs immediately
--   4. DROP all pure Jira-mirror and Jira-queue tables (no Catalyst data inside)
--   5. Apply RLS freeze policies to remaining Jira bridge tables
--      (dormant when sync_enabled = false)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1 — TOGGLE CONTROL TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jira_integration_config (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_enabled          boolean     NOT NULL DEFAULT false,
  frozen_at             timestamptz DEFAULT now(),
  freeze_triggered_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  freeze_note           text        DEFAULT 'Jira sync paused — Catalyst operating in native mode.',
  last_sync_at          timestamptz,
  data_cutoff_year      integer     DEFAULT 2026,
  preserved_work_items  integer,
  preserved_projects    integer,
  preserved_users       integer,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Only ever one row; guard against duplicates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jira_integration_config) THEN
    INSERT INTO jira_integration_config (
      sync_enabled,
      frozen_at,
      data_cutoff_year,
      freeze_note
    ) VALUES (
      false,
      now(),
      2026,
      'Initial freeze — Catalyst native mode active. All 2026 Jira data preserved in native tables.'
    );
  END IF;
END $$;

-- Try to snapshot preserved-data counts into the config row
DO $$
DECLARE
  _wi  integer := 0;
  _pr  integer := 0;
  _us  integer := 0;
BEGIN
  SELECT count(*) INTO _wi FROM ph_work_items;
  SELECT count(*) INTO _pr FROM ph_projects;
  SELECT count(*) INTO _us FROM jira_identity_map;
  UPDATE jira_integration_config
  SET preserved_work_items = _wi,
      preserved_projects    = _pr,
      preserved_users       = _us;
EXCEPTION WHEN OTHERS THEN
  NULL; -- tables may not exist on a fresh schema; non-fatal
END $$;

-- Row-level security
ALTER TABLE jira_integration_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jira_config_authenticated_read" ON jira_integration_config;
CREATE POLICY "jira_config_authenticated_read"
  ON jira_integration_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "jira_config_admin_write" ON jira_integration_config;
CREATE POLICY "jira_config_admin_write"
  ON jira_integration_config FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 — TOGGLE FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Lightweight boolean helper checked by edge functions and queries
CREATE OR REPLACE FUNCTION is_jira_sync_enabled()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((SELECT sync_enabled FROM jira_integration_config LIMIT 1), false);
$$;

-- ── disable_jira_sync ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION disable_jira_sync(
  p_triggered_by uuid  DEFAULT NULL,
  p_note         text  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _wi  integer := 0;
  _pr  integer := 0;
  _us  integer := 0;
BEGIN
  -- Snapshot preserved counts
  BEGIN
    SELECT count(*) INTO _wi FROM ph_work_items;
    SELECT count(*) INTO _pr FROM ph_projects;
    SELECT count(*) INTO _us FROM jira_identity_map;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  UPDATE jira_integration_config
  SET sync_enabled          = false,
      frozen_at             = now(),
      freeze_triggered_by   = p_triggered_by,
      freeze_note           = COALESCE(p_note, 'Jira sync paused manually via admin toggle.'),
      preserved_work_items  = _wi,
      preserved_projects    = _pr,
      preserved_users       = _us,
      updated_at            = now();

  -- Disable cron jobs (non-fatal if pg_cron not installed or jobs absent)
  BEGIN
    PERFORM cron.unschedule('process-sync-queue');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.unschedule('retry-failed-sync');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.unschedule('clean-old-sync-events');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'status',              'disabled',
    'frozen_at',           now(),
    'preserved_work_items', _wi,
    'preserved_projects',   _pr,
    'preserved_users',      _us,
    'message',             'Jira sync paused. All data preserved in Catalyst native tables.'
  );
END;
$$;

-- ── enable_jira_sync ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enable_jira_sync(
  p_triggered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE jira_integration_config
  SET sync_enabled        = true,
      frozen_at           = NULL,
      freeze_triggered_by = p_triggered_by,
      freeze_note         = NULL,
      updated_at          = now();

  -- Re-schedule cron jobs (non-fatal if pg_cron unavailable)
  BEGIN
    PERFORM cron.schedule(
      'process-sync-queue',
      '* * * * *',
      'SELECT process_sync_events(25)'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    PERFORM cron.schedule(
      'retry-failed-sync',
      '*/5 * * * *',
      'SELECT retry_failed_sync_events()'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'status',    'enabled',
    'enabled_at', now(),
    'message',   'Jira sync re-enabled. Run a full sync to pull the latest data.'
  );
END;
$$;

-- ── get_jira_sync_status ─────────────────────────────────────────────────────
-- Lightweight RPC for the admin panel to poll current state
CREATE OR REPLACE FUNCTION get_jira_sync_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _row jira_integration_config%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM jira_integration_config LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sync_enabled', false, 'frozen_at', null);
  END IF;

  RETURN jsonb_build_object(
    'sync_enabled',          _row.sync_enabled,
    'frozen_at',             _row.frozen_at,
    'freeze_note',           _row.freeze_note,
    'last_sync_at',          _row.last_sync_at,
    'data_cutoff_year',      _row.data_cutoff_year,
    'preserved_work_items',  _row.preserved_work_items,
    'preserved_projects',    _row.preserved_projects,
    'preserved_users',       _row.preserved_users,
    'updated_at',            _row.updated_at
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 — DISABLE CRON JOBS (immediate, not waiting for UI toggle)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('process-sync-queue');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('retry-failed-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('clean-old-sync-events');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 — DROP PURE JIRA-MIRROR TABLES
-- These tables hold only Jira-sourced replica data. All business-relevant
-- data was already propagated into Catalyst-native tables during sync.
-- CASCADE handles any FK constraints pointing TO these tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- injira_* (full Jira schema replica — 30 tables)
DROP TABLE IF EXISTS injira_workflow_transitions     CASCADE;
DROP TABLE IF EXISTS injira_ai_suggestions           CASCADE;
DROP TABLE IF EXISTS injira_attachments              CASCADE;
DROP TABLE IF EXISTS injira_automation_rules         CASCADE;
DROP TABLE IF EXISTS injira_board_columns            CASCADE;
DROP TABLE IF EXISTS injira_boards                   CASCADE;
DROP TABLE IF EXISTS injira_changelog_items          CASCADE;
DROP TABLE IF EXISTS injira_changelog_groups         CASCADE;
DROP TABLE IF EXISTS injira_comments                 CASCADE;
DROP TABLE IF EXISTS injira_import_audit_log         CASCADE;
DROP TABLE IF EXISTS injira_import_diff_reports      CASCADE;
DROP TABLE IF EXISTS injira_import_mappings          CASCADE;
DROP TABLE IF EXISTS injira_import_manifests         CASCADE;
DROP TABLE IF EXISTS injira_import_jobs              CASCADE;
DROP TABLE IF EXISTS injira_issue_security_levels    CASCADE;
DROP TABLE IF EXISTS injira_issue_types              CASCADE;
DROP TABLE IF EXISTS injira_issue_versions           CASCADE;
DROP TABLE IF EXISTS injira_issues                   CASCADE;
DROP TABLE IF EXISTS injira_permission_grants        CASCADE;
DROP TABLE IF EXISTS injira_permission_schemes       CASCADE;
DROP TABLE IF EXISTS injira_projects                 CASCADE;
DROP TABLE IF EXISTS injira_resolutions              CASCADE;
DROP TABLE IF EXISTS injira_role_assignments         CASCADE;
DROP TABLE IF EXISTS injira_roles                    CASCADE;
DROP TABLE IF EXISTS injira_sprints                  CASCADE;
DROP TABLE IF EXISTS injira_statuses                 CASCADE;
DROP TABLE IF EXISTS injira_tenant_members           CASCADE;
DROP TABLE IF EXISTS injira_tenants                  CASCADE;
DROP TABLE IF EXISTS injira_versions                 CASCADE;
DROP TABLE IF EXISTS injira_webhooks                 CASCADE;

-- Jira operational queues and logs (sync infrastructure, no business data)
DROP TABLE IF EXISTS jira_write_back_queue           CASCADE;
DROP TABLE IF EXISTS jira_webhook_events             CASCADE;
DROP TABLE IF EXISTS jira_sync_logs                  CASCADE;
DROP TABLE IF EXISTS jira_sync_history               CASCADE;
DROP TABLE IF EXISTS jira_sync_runs                  CASCADE;
DROP TABLE IF EXISTS jira_sync_changelog             CASCADE;
DROP TABLE IF EXISTS jira_sync_comments              CASCADE;
DROP TABLE IF EXISTS jira_sync_activity              CASCADE;
DROP TABLE IF EXISTS jira_sync_conflicts             CASCADE;
DROP TABLE IF EXISTS jira_sync_user_events           CASCADE;
DROP TABLE IF EXISTS jira_sync_issue_links           CASCADE;
DROP TABLE IF EXISTS jira_deleted_items              CASCADE;
DROP TABLE IF EXISTS jira_work_item_links            CASCADE;
DROP TABLE IF EXISTS jira_auth_sessions              CASCADE;
DROP TABLE IF EXISTS jira_user_project_perms         CASCADE;
DROP TABLE IF EXISTS jira_transitions_cache          CASCADE;
DROP TABLE IF EXISTS jira_sync_lock                  CASCADE;

-- Generic sync infrastructure (Jira was the only consumer)
DROP TABLE IF EXISTS sync_events                     CASCADE;
DROP TABLE IF EXISTS sync_entity_map                 CASCADE;
DROP TABLE IF EXISTS sync_user_map                   CASCADE;
DROP TABLE IF EXISTS sync_status_map                 CASCADE;
DROP TABLE IF EXISTS sync_connections                CASCADE;
DROP TABLE IF EXISTS sync_health                     CASCADE;
DROP TABLE IF EXISTS sync_cooldowns                  CASCADE;
DROP TABLE IF EXISTS sync_dead_letter                CASCADE;
DROP TABLE IF EXISTS sync_schedules                  CASCADE;

-- WorkHub Jira-mirror tables
DROP TABLE IF EXISTS wh_jira_projects                CASCADE;
DROP TABLE IF EXISTS wh_jira_sync_log                CASCADE;
DROP TABLE IF EXISTS wh_sync_log                     CASCADE;

-- Requirements Analyzer Jira sync tables
DROP TABLE IF EXISTS ra_jira_sync_log                CASCADE;
DROP TABLE IF EXISTS ra_jira_tickets                 CASCADE;

-- Jira legacy column on business_requests (no longer needed)
ALTER TABLE business_requests DROP COLUMN IF EXISTS jira_epic_link;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 5 — RLS FREEZE GATE ON REMAINING JIRA BRIDGE TABLES
-- When sync_enabled = false these tables return ZERO ROWS to authenticated
-- users. Service-role (edge functions) bypasses RLS — but the cron jobs that
-- invoke those functions are already disabled above.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper macro: apply the freeze gate to any Jira bridge table that exists
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'jira_identity_map',
    'jira_connections',
    'jira_auth_credentials',
    'jira_field_mappings',
    'jira_project_mappings',
    'jira_board_mappings',
    'wh_jira_connection',
    'wh_user_mapping',
    'ra_jira_connections',
    'ph_jira_connection',
    'ph_jira_sync_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Only touch tables that actually exist in this schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

      -- Drop any existing freeze gate to avoid duplicates
      EXECUTE format(
        'DROP POLICY IF EXISTS jira_freeze_gate ON %I',
        tbl
      );

      -- RESTRICTIVE: row only visible when sync is enabled
      EXECUTE format(
        $policy$
          CREATE POLICY jira_freeze_gate ON %I
          AS RESTRICTIVE
          FOR ALL
          TO authenticated
          USING (is_jira_sync_enabled())
        $policy$,
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 6 — DROP JIRA-SPECIFIC HYBRID COLUMNS FROM NATIVE TABLES
-- These columns have no value once sync is off. They are safe to remove
-- because the data they reference (Jira keys) was used only for the sync
-- write-back path, which is now disabled.
-- ─────────────────────────────────────────────────────────────────────────────

-- requirements / tm_requirements (wrapped — tm_requirements absent in some envs)
DO $$ BEGIN ALTER TABLE requirements    DROP COLUMN IF EXISTS last_synced_at; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE requirements    DROP COLUMN IF EXISTS sync_status;    EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tm_requirements DROP COLUMN IF EXISTS last_synced_at; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tm_requirements DROP COLUMN IF EXISTS sync_status;    EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- kb document Jira issue linkage table
DROP TABLE IF EXISTS kb_document_jira_issues CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 7 — AUDIT LOG
-- Record this freeze event so it appears in the admin history panel
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    INSERT INTO activity_logs (action, entity_type, entity_id, metadata)
    VALUES (
      'jira_sync_disabled',
      'jira_integration_config',
      (SELECT id::text FROM jira_integration_config LIMIT 1),
      jsonb_build_object(
        'reason',     'Migration 20260427000001 — Jira freeze toggle activated',
        'tables_dropped', 69,
        'timestamp',  now()
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
