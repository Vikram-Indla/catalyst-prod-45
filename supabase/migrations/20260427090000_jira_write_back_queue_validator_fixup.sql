-- 20260427090000_jira_write_back_queue_validator_fixup.sql
-- NOTE: jira_write_back_queue was dropped in 20260427000001.
-- All DDL on that table is a no-op; only safe function/trigger ops run.

-- (1) Update validator function (safe even if table is gone)
CREATE OR REPLACE FUNCTION validate_jira_write_back_queue_status()
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
      'jira_write_back_queue requires at least one of ph_issue_key, ph_issue_id, or ph_work_item_id';
  END IF;

  RETURN NEW;
END;
$$;

-- (2) Trigger cleanup + table DDL only if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jira_write_back_queue'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS jira_write_back_queue_validator ON jira_write_back_queue';
    EXECUTE 'ALTER TABLE jira_write_back_queue ADD COLUMN IF NOT EXISTS _reload_marker_3 BOOLEAN';
    EXECUTE 'ALTER TABLE jira_write_back_queue DROP COLUMN IF EXISTS _reload_marker_3';
  END IF;
END $$;

DROP FUNCTION IF EXISTS jira_write_back_queue_validate();

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
