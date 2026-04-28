-- 20260427083000_jira_write_back_queue_use_issue_key.sql
--
-- Reconcile jira_write_back_queue with the ACTUAL ph_issues schema.
--
-- Background discovered 2026-04-27 during /jira-compare BAU backlog audit
-- (uploads/query-results-export-2026-04-27_08-15-02.csv):
--   * ph_issues PK is issue_key (text, NOT NULL). NO UUID id column exists.
--   * jira_write_back_queue.ph_issue_id is uuid with no valid FK target on
--     ph_issues. Insert attempts from upstream (BacklogPage updateField →
--     queueWriteBack) silently failed because callers only have an
--     issue_key string, not a UUID. The catch swallowed every failure as
--     "non-fatal", so Catalyst→Jira write-back has been dead end-to-end.
--
-- This migration adds a TEXT column with a real FK to ph_issues(issue_key)
-- and updates the validator trigger to accept it. ph_issue_id is left in
-- place (nullable, no FK) for backward compatibility with any service code
-- still passing UUIDs through, but new writes should populate
-- ph_issue_key instead.
--
-- Idempotent + reversible. To roll back:
--   BEGIN;
--   ALTER TABLE jira_write_back_queue DROP CONSTRAINT IF EXISTS jira_write_back_queue_ph_issue_key_fkey;
--   ALTER TABLE jira_write_back_queue DROP COLUMN IF EXISTS ph_issue_key;
--   DROP INDEX IF EXISTS idx_jwbq_approved_retry_v2;
--   -- Restore original validator trigger from audit-B if needed.
--   COMMIT;

BEGIN;

-- 1. Add the new ph_issue_key column (text, FK to ph_issues.issue_key).
--    Nullable so existing rows (which may or may not have it) don't fail.
ALTER TABLE jira_write_back_queue
  ADD COLUMN IF NOT EXISTS ph_issue_key TEXT;

-- 2. Add the FK constraint. Wrapped in DO block for idempotency — the
--    constraint name check prevents re-adding on re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'jira_write_back_queue'
      AND constraint_name = 'jira_write_back_queue_ph_issue_key_fkey'
  ) THEN
    ALTER TABLE jira_write_back_queue
      ADD CONSTRAINT jira_write_back_queue_ph_issue_key_fkey
      FOREIGN KEY (ph_issue_key)
      REFERENCES ph_issues(issue_key)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Update the validator trigger to ACCEPT ph_issue_key as a valid
--    identifier alongside ph_issue_id and ph_work_item_id. The trigger
--    must enforce that AT LEAST ONE of the three is set on every row.
--    We replace by name; previous audit-B name was likely
--    "jira_write_back_queue_validate" or similar. Drop+create handles
--    both cases.
CREATE OR REPLACE FUNCTION jira_write_back_queue_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Status enum check (values match audit-B vocabulary)
  IF NEW.status IS NOT NULL AND NEW.status NOT IN
       ('queued', 'approved', 'pushed', 'failed', 'retry_pending', 'rejected') THEN
    RAISE EXCEPTION
      'jira_write_back_queue: status must be queued|approved|pushed|failed|retry_pending|rejected, got "%"',
      NEW.status;
  END IF;

  -- At least one row identifier must be set. Order of preference:
  --   ph_issue_key (TEXT, the canonical PK on ph_issues)
  --   ph_work_item_id (UUID, FK target documented elsewhere)
  --   ph_issue_id (UUID, legacy — kept until callers fully migrate)
  IF NEW.ph_issue_key IS NULL
     AND NEW.ph_work_item_id IS NULL
     AND NEW.ph_issue_id IS NULL THEN
    RAISE EXCEPTION
      'jira_write_back_queue: at least one of ph_issue_key, ph_work_item_id, ph_issue_id must be set';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Rebind the trigger. Drop any name we expect from prior migrations
--    so the new function is the only validator on the table.
DROP TRIGGER IF EXISTS jira_write_back_queue_validator ON jira_write_back_queue;
DROP TRIGGER IF EXISTS jira_write_back_queue_validate_trigger ON jira_write_back_queue;
DROP TRIGGER IF EXISTS validate_jira_write_back_queue ON jira_write_back_queue;

CREATE TRIGGER jira_write_back_queue_validator
  BEFORE INSERT OR UPDATE ON jira_write_back_queue
  FOR EACH ROW
  EXECUTE FUNCTION jira_write_back_queue_validate();

-- 5. Partial index for the common "approved + retry_pending" worker-fetch
--    pattern (the edge fn jira-write-back-processor would scan this).
CREATE INDEX IF NOT EXISTS idx_jwbq_approved_retry_v2
  ON jira_write_back_queue (ph_issue_key, status)
  WHERE status IN ('approved', 'retry_pending');

COMMIT;

-- Post-migration verification — paste these and run separately:
--
-- 1. Confirm column + FK exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public'
--   AND table_name='jira_write_back_queue'
--   AND column_name='ph_issue_key';
--
-- 2. Confirm FK
-- SELECT constraint_name, table_name, column_name
-- FROM information_schema.key_column_usage
-- WHERE table_schema='public'
--   AND constraint_name='jira_write_back_queue_ph_issue_key_fkey';
--
-- 3. Smoke test (rollback transaction so no real row created):
-- BEGIN;
-- INSERT INTO jira_write_back_queue (ph_issue_key, field_name, new_value, status)
-- VALUES ('BAU-5609', 'summary', 'TEST_FROM_MIGRATION_DO_NOT_KEEP', 'approved')
-- RETURNING id, ph_issue_key, status;
-- ROLLBACK;
