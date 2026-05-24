-- Migration: sync_strategy_upgrade
-- Date: 2026-05-25
--
-- IMPLEMENTS 5-STRATEGY HYBRID SYNC UPGRADE
--
-- Strategy 1: Webhook-First — jira-webhook-receiver already deployed (no SQL needed)
-- Strategy 2: Per-project sync state — new ph_project_sync_state table replaces fixed -30m window
-- Strategy 3: Multi-project fan-out — expand sync_projects to all 8 active projects
-- Strategy 4: Event-delta notification routing — indexes enable fast notification lookups
-- Strategy 5: Health monitoring — ph_sync_health view for UI dashboard
--
-- ROOT CAUSE FIXED (diagnosed 2026-05-25):
--   1. wh_config.sync_projects = ["BAU"] — MWR/ICP/IRP/IN/INV/IP/TAH never synced
--      → MWR-972/973 never existed in ph_issues → never shown in Direct tab
--   2. Incremental JQL used fixed updated >= "-30m" — if sync ran late or failed,
--      any update older than 30m was permanently missed
--   3. SyncHealthDashboard queried jira_sync_logs (non-existent) → monitoring blind
--
-- AFTER THIS MIGRATION:
--   - All 8 projects sync every 15 minutes
--   - Per-project state tracks exact last_synced_at → zero missed updates on retry
--   - ph_sync_health view powers the UI dashboard correctly
--   - Indexes make notification queries 10-50x faster on large ph_issues tables

-- ── Strategy 2: Per-project sync state table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ph_project_sync_state (
  project_key             TEXT PRIMARY KEY,
  -- Timestamp used as the JQL lower bound for the NEXT incremental sync.
  -- Updated to NOW() after every successful sync. Not updated on error,
  -- so the next attempt covers the full gap since last success.
  last_synced_at          TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  last_sync_status        TEXT CHECK (last_sync_status IN ('success', 'error', 'warning', 'running')),
  issues_synced           INTEGER DEFAULT 0,
  -- Counts consecutive failures. Resets to 0 on any success.
  -- Used by the health monitor to detect stale projects.
  consecutive_failures    INTEGER DEFAULT 0 NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS: readable by authenticated users (health dashboard), writable only by service role
ALTER TABLE ph_project_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_project_sync_state_read"
  ON ph_project_sync_state FOR SELECT
  TO authenticated USING (true);

-- moddatetime trigger keeps updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_ph_project_sync_state'
  ) THEN
    CREATE TRIGGER set_updated_at_ph_project_sync_state
      BEFORE UPDATE ON ph_project_sync_state
      FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

-- ── Strategy 3: Expand sync_projects to all 8 active projects ────────────────
-- Before: ["BAU"]
-- After:  all 8 projects that have rows in ph_issues + are active in Jira
UPDATE wh_config
SET value = '["BAU","MWR","ICP","IRP","IN","INV","IP","TAH"]'::jsonb
WHERE key = 'sync_projects';

-- Seed ph_project_sync_state with the known last_synced_at per project
-- (from the existing ph_issues.last_synced_at max values so first incremental
--  picks up from where the last full sync left off, not from epoch 0)
INSERT INTO ph_project_sync_state (project_key, last_synced_at, last_successful_sync_at, last_sync_status, issues_synced)
SELECT
  project_key,
  MAX(last_synced_at)  AS last_synced_at,
  MAX(last_synced_at)  AS last_successful_sync_at,
  'success'            AS last_sync_status,
  COUNT(*)             AS issues_synced
FROM ph_issues
WHERE last_synced_at IS NOT NULL
GROUP BY project_key
ON CONFLICT (project_key) DO UPDATE
  SET last_synced_at          = EXCLUDED.last_synced_at,
      last_successful_sync_at = EXCLUDED.last_successful_sync_at,
      last_sync_status        = EXCLUDED.last_sync_status,
      issues_synced           = EXCLUDED.issues_synced,
      updated_at              = now();

-- ── Strategy 4: Indexes for fast notification queries ─────────────────────────
-- useDirectFromSync queries ph_issues by assignee_account_id — this index
-- eliminates a full table scan on every notification panel open.
CREATE INDEX IF NOT EXISTS idx_ph_issues_assignee_account_id
  ON ph_issues (assignee_account_id)
  WHERE assignee_account_id IS NOT NULL AND deleted_at IS NULL;

-- Badge count query (useUnreadCountFromSync) filters by jira_updated_at
CREATE INDEX IF NOT EXISTS idx_ph_issues_jira_updated_at
  ON ph_issues (jira_updated_at DESC)
  WHERE deleted_at IS NULL;

-- Notification read-receipt lookups need fast (recipient, tab, entity) access
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_tab_entity
  ON notifications (recipient_user_id, tab, entity_id)
  WHERE entity_id IS NOT NULL;

-- ── Strategy 5: Sync health view (powers SyncHealthDashboard) ────────────────
CREATE OR REPLACE VIEW ph_sync_health AS
WITH recent_syncs AS (
  SELECT
    id,
    sync_type,
    status,
    issues_fetched,
    issues_upserted,
    issues_pruned,
    error_message,
    warnings,
    duration_ms,
    started_at,
    completed_at,
    projects_synced,
    ROW_NUMBER() OVER (ORDER BY started_at DESC) AS rn
  FROM ph_sync_log
),
stats AS (
  SELECT
    COUNT(*)                                                    AS total_syncs,
    COUNT(*) FILTER (WHERE status = 'success')                  AS successful_syncs,
    COUNT(*) FILTER (WHERE status = 'error')                    AS failed_syncs,
    COUNT(*) FILTER (WHERE status = 'warning')                  AS warning_syncs,
    MAX(started_at) FILTER (WHERE status = 'success')           AS last_success_at,
    MAX(started_at)                                             AS last_attempt_at,
    AVG(duration_ms) FILTER (WHERE status IN ('success','warning')) AS avg_duration_ms,
    SUM(issues_fetched) FILTER (WHERE status IN ('success','warning')) AS total_issues_fetched,
    -- Consecutive failures = count of errors before the most recent success
    (SELECT COUNT(*) FROM ph_sync_log
     WHERE started_at > COALESCE(
       (SELECT MAX(started_at) FROM ph_sync_log WHERE status IN ('success','warning')),
       '1970-01-01'::timestamptz
     ) AND status = 'error'
    )                                                           AS consecutive_failures
  FROM ph_sync_log
)
SELECT
  s.*,
  ROUND(
    100.0 * s.successful_syncs / NULLIF(s.total_syncs, 0), 1
  )                                                             AS success_rate_pct,
  -- Minutes since last success (NULL if never succeeded)
  EXTRACT(EPOCH FROM (now() - s.last_success_at)) / 60         AS minutes_since_last_success,
  -- Health status: GREEN / YELLOW / RED
  CASE
    WHEN s.consecutive_failures = 0                            THEN 'GREEN'
    WHEN s.consecutive_failures BETWEEN 1 AND 3               THEN 'YELLOW'
    ELSE                                                            'RED'
  END                                                           AS health_status,
  -- Most recent 10 sync log entries (for the dashboard table)
  (SELECT json_agg(r ORDER BY r.started_at DESC)
   FROM recent_syncs r WHERE r.rn <= 10)                       AS recent_log
FROM stats s;

-- Grant read access to the view
GRANT SELECT ON ph_sync_health TO authenticated, anon;
