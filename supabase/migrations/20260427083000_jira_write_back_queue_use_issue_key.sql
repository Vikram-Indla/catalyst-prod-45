-- 20260427083000_jira_write_back_queue_use_issue_key.sql
-- NOTE: jira_write_back_queue was dropped in 20260427000001.
-- This migration is a no-op if the table doesn't exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jira_write_back_queue'
  ) THEN
    RAISE NOTICE 'jira_write_back_queue does not exist (dropped in cleanup), skipping.';
    RETURN;
  END IF;

  -- 1. Add ph_issue_key column
  EXECUTE 'ALTER TABLE jira_write_back_queue ADD COLUMN IF NOT EXISTS ph_issue_key TEXT';

  -- 2. FK constraint (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'jira_write_back_queue'
      AND constraint_name = 'jira_write_back_queue_ph_issue_key_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE jira_write_back_queue
      ADD CONSTRAINT jira_write_back_queue_ph_issue_key_fkey
      FOREIGN KEY (ph_issue_key) REFERENCES ph_issues(issue_key) ON DELETE CASCADE';
  END IF;

  -- 3. Index
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jwbq_approved_retry_v2
    ON jira_write_back_queue (ph_issue_key, status)
    WHERE status IN (''approved'', ''retry_pending'')';

END $$;

-- Validator function (safe to create even if table is gone)
CREATE OR REPLACE FUNCTION jira_write_back_queue_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT NULL AND NEW.status NOT IN
       ('queued', 'approved', 'pushed', 'failed', 'retry_pending', 'rejected') THEN
    RAISE EXCEPTION
      'jira_write_back_queue: status must be queued|approved|pushed|failed|retry_pending|rejected, got "%"',
      NEW.status;
  END IF;

  IF NEW.ph_issue_key IS NULL
     AND NEW.ph_work_item_id IS NULL
     AND NEW.ph_issue_id IS NULL THEN
    RAISE EXCEPTION
      'jira_write_back_queue: at least one of ph_issue_key, ph_work_item_id, ph_issue_id must be set';
  END IF;

  RETURN NEW;
END;
$$;

-- Rebind trigger only if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jira_write_back_queue'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS jira_write_back_queue_validator ON jira_write_back_queue';
    EXECUTE 'DROP TRIGGER IF EXISTS jira_write_back_queue_validate_trigger ON jira_write_back_queue';
    EXECUTE 'DROP TRIGGER IF EXISTS validate_jira_write_back_queue ON jira_write_back_queue';
    EXECUTE 'CREATE TRIGGER jira_write_back_queue_validator
      BEFORE INSERT OR UPDATE ON jira_write_back_queue
      FOR EACH ROW EXECUTE FUNCTION jira_write_back_queue_validate()';
  END IF;
END $$;
