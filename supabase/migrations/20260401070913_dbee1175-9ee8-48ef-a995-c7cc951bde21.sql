
-- ── ph_work_items: 4 new columns ──────────────────
ALTER TABLE ph_work_items
  ADD COLUMN IF NOT EXISTS jira_key text,
  ADD COLUMN IF NOT EXISTS jira_sync_status text DEFAULT 'local_only',
  ADD COLUMN IF NOT EXISTS jira_sync_error text,
  ADD COLUMN IF NOT EXISTS jira_pushed_at timestamptz;

ALTER TABLE ph_work_items
  ADD CONSTRAINT ph_work_items_jira_sync_status_check
  CHECK (jira_sync_status IN (
    'local_only','queued','approval_pending',
    'pushed','synced','failed','conflict'
  ));

CREATE INDEX IF NOT EXISTS idx_ph_wi_jira_key
  ON ph_work_items(jira_key) WHERE jira_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ph_wi_jira_sync_status
  ON ph_work_items(jira_sync_status)
  WHERE jira_sync_status != 'synced';

-- ── jira_write_back_queue: 8 new columns ──────────
ALTER TABLE jira_write_back_queue
  ADD COLUMN IF NOT EXISTS ph_work_item_id uuid
    REFERENCES ph_work_items(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS operation varchar(20) DEFAULT 'update',
  ADD COLUMN IF NOT EXISTS operation_payload jsonb,
  ADD COLUMN IF NOT EXISTS jira_response_key text,
  ADD COLUMN IF NOT EXISTS jira_response_id text,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS push_attempted_at timestamptz;

ALTER TABLE jira_write_back_queue
  ADD CONSTRAINT wbq_operation_check
  CHECK (operation IN (
    'create','update','delete','transition'
  ));

CREATE INDEX IF NOT EXISTS idx_wbq_status_created
  ON jira_write_back_queue(push_status, created_at ASC)
  WHERE push_status IN ('approved','queued');

CREATE INDEX IF NOT EXISTS idx_wbq_work_item
  ON jira_write_back_queue(ph_work_item_id)
  WHERE ph_work_item_id IS NOT NULL;

-- ── profiles: Jira user mapping ───────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS jira_account_id text,
  ADD COLUMN IF NOT EXISTS jira_display_name text;

-- ── jira_sync_lock (new table) ────────────────────
CREATE TABLE IF NOT EXISTS jira_sync_lock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_issue_key text NOT NULL UNIQUE,
  locked_by_queue_id uuid
    REFERENCES jira_write_back_queue(id)
    ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  unlock_after timestamptz NOT NULL
    DEFAULT now() + interval '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_sync_lock_expiry
  ON jira_sync_lock(jira_issue_key, unlock_after);

ALTER TABLE jira_sync_lock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages sync lock"
  ON jira_sync_lock FOR ALL TO service_role USING (true);

CREATE POLICY "Auth users read sync lock"
  ON jira_sync_lock FOR SELECT TO authenticated USING (true);

-- ── jira_deleted_items (new table) ───────────────
CREATE TABLE IF NOT EXISTS jira_deleted_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalyst_item_id uuid NOT NULL,
  catalyst_item_key text NOT NULL,
  jira_key text,
  jira_issue_id text,
  project_id uuid REFERENCES ph_projects(id)
    ON DELETE SET NULL,
  item_type text NOT NULL,
  item_snapshot jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  jira_transition_status text,
  jira_transition_error text,
  is_recoverable boolean DEFAULT true,
  recovered_at timestamptz,
  recovered_by uuid
);

CREATE INDEX IF NOT EXISTS idx_jira_del_project
  ON jira_deleted_items(project_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_jira_del_jira_key
  ON jira_deleted_items(jira_key)
  WHERE jira_key IS NOT NULL;

ALTER TABLE jira_deleted_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view deleted items"
  ON jira_deleted_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages deleted items"
  ON jira_deleted_items FOR ALL TO service_role
  USING (true);

-- ── jira_transitions_cache (new table) ───────────
CREATE TABLE IF NOT EXISTS jira_transitions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_project_key text NOT NULL,
  jira_issue_type text NOT NULL,
  transition_id text NOT NULL,
  transition_name text NOT NULL,
  to_status text NOT NULL,
  to_status_category text NOT NULL,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz
    DEFAULT now() + interval '24 hours',
  UNIQUE(jira_project_key, jira_issue_type, transition_name)
);

ALTER TABLE jira_transitions_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All auth read transitions cache"
  ON jira_transitions_cache FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages transitions cache"
  ON jira_transitions_cache FOR ALL TO service_role
  USING (true);
