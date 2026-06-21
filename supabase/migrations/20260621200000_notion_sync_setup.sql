-- ════════════════════════════════════════════════════════════════════════════
-- Notion Sync Setup
-- 2026-06-21 | Owner: Vikram
--
-- 1. Adds notion_page_id, notion_link, notion_last_synced_at to business_requests
--    notion_page_id is the upsert primary key (Notion's internal UUID)
--    notion_link    is the human-readable public URL shown in the admin UI
--
-- 2. Creates notion_sync_config table (one row per workspace)
--    Stores integration token, database_id, webhook_secret, schedule, status.
--
-- 3. Adds notion_comment_id to ph_comments for dedup of webhook-delivered comments
--
-- Idempotent: all ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. business_requests additions ──────────────────────────────────────────

ALTER TABLE business_requests
  ADD COLUMN IF NOT EXISTS notion_page_id       TEXT,
  ADD COLUMN IF NOT EXISTS notion_link          TEXT,
  ADD COLUMN IF NOT EXISTS notion_last_synced_at TIMESTAMPTZ;

-- Unique index: one BR per Notion page
CREATE UNIQUE INDEX IF NOT EXISTS idx_br_notion_page_id
  ON business_requests (notion_page_id)
  WHERE notion_page_id IS NOT NULL;

COMMENT ON COLUMN business_requests.notion_page_id
  IS 'Notion page UUID — primary key for upsert. Set on first sync, never changes.';
COMMENT ON COLUMN business_requests.notion_link
  IS 'Public Notion page URL shown in the admin UI and BR detail view.';
COMMENT ON COLUMN business_requests.notion_last_synced_at
  IS 'Timestamp of the last successful sync from Notion for this record.';

-- ── 2. notion_sync_config ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notion_sync_config (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name    TEXT        NOT NULL DEFAULT 'Notion workspace',
  integration_token TEXT        NOT NULL,
  database_id       TEXT        NOT NULL,
  database_title    TEXT,
  webhook_secret    TEXT,
  sync_enabled      BOOLEAN     NOT NULL DEFAULT true,
  sync_frequency    TEXT        NOT NULL DEFAULT 'daily',  -- 'daily' | 'hourly'
  last_sync_at      TIMESTAMPTZ,
  last_sync_status  TEXT,       -- 'ok' | 'error' | 'running'
  last_sync_count   INTEGER,
  last_sync_error   TEXT,
  field_mapping     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notion_sync_config
  IS 'One row per connected Notion workspace. Stores token, database, webhook secret, and sync state.';
COMMENT ON COLUMN notion_sync_config.field_mapping
  IS 'JSON map of Notion property name → business_requests column. E.g. {"Feature Name":"title","Theme":"theme"}';
COMMENT ON COLUMN notion_sync_config.database_id
  IS 'Notion database UUID (32-char hex, no dashes). Used to query Notion API.';

-- ── 3. ph_comments: notion_comment_id for dedup ──────────────────────────────

ALTER TABLE ph_comments
  ADD COLUMN IF NOT EXISTS source             TEXT    DEFAULT 'catalyst',
  ADD COLUMN IF NOT EXISTS notion_comment_id  TEXT,
  ADD COLUMN IF NOT EXISTS notion_page_id     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ph_comments_notion_comment_id
  ON ph_comments (notion_comment_id)
  WHERE notion_comment_id IS NOT NULL;

COMMENT ON COLUMN ph_comments.source
  IS 'Comment origin: "catalyst" | "notion" | "jira"';
COMMENT ON COLUMN ph_comments.notion_comment_id
  IS 'Notion comment UUID — used for dedup on webhook delivery.';
COMMENT ON COLUMN ph_comments.notion_page_id
  IS 'Notion page this comment belongs to — links back to business_requests.notion_page_id.';

-- ── 4. RLS for notion_sync_config ────────────────────────────────────────────

ALTER TABLE notion_sync_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write config (token is sensitive)
CREATE POLICY IF NOT EXISTS "notion_config_select_admin"
  ON notion_sync_config FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY IF NOT EXISTS "notion_config_insert_admin"
  ON notion_sync_config FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY IF NOT EXISTS "notion_config_update_admin"
  ON notion_sync_config FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

-- Service role can read config (for edge functions using service key)
-- (service role bypasses RLS by default — no explicit policy needed)

-- ── 5. Sync log table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notion_sync_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id     UUID        REFERENCES notion_sync_config(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'running',  -- 'running' | 'ok' | 'error'
  records_synced INTEGER,
  records_skipped INTEGER,
  error_message TEXT,
  triggered_by  TEXT        DEFAULT 'cron'  -- 'cron' | 'manual'
);

ALTER TABLE notion_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "notion_log_select_admin"
  ON notion_sync_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

COMMENT ON TABLE notion_sync_log
  IS 'Audit log of every Notion sync run — shown in the admin Sync Log tab.';
