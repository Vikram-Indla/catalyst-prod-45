-- 20260427090000_jira_write_back_queue_validator_fixup.sql
--
-- Fix-up #2 to migration 20260427083000_jira_write_back_queue_use_issue_key.sql.
--
-- Problem chain discovered on 2026-04-27:
--   1. Migration 20260427083000 added ph_issue_key column + FK to
--      jira_write_back_queue and tried to create a new validator trigger.
--   2. The DROP TRIGGER IF EXISTS guesses in that migration did NOT
--      include the actual existing trigger name. Audit-B's trigger
--      `validate_jira_write_back_queue_status` was therefore left in
--      place AND a second trigger `jira_write_back_queue_validator`
--      was added on top of it.
--   3. Both triggers now fire on every insert. The older stricter rule
--      wins: it requires (ph_issue_id OR ph_work_item_id) and rejects
--      ph_issue_key-only inserts with P0001.
--   4. Attempting to DROP FUNCTION jira_write_back_queue_validate() in
--      a previous fix-up failed with 2BP01 because the new trigger
--      depended on it.
--
-- Resolution this migration:
--   1. CREATE OR REPLACE the audit-B validator function in place so
--      ph_issue_key is a valid identifier alongside the legacy two.
--      No need to touch the trigger binding — it's already there.
--   2. Drop the redundant new trigger BEFORE the redundant function
--      to avoid the dependency conflict.
--   3. L26 cache-bust at the end (no-op DDL + double NOTIFY) — Lovable's
--      PostgREST has been observed to ignore bare NOTIFY pgrst.
--
-- Idempotent + reversible. Rollback would require restoring the original
-- audit-B function definition which was not committed to the repo.

BEGIN;

-- (1) Update the audit-B validator function in place
CREATE OR REPLACE FUNCTION validate_jira_write_back_queue_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Status enum check
  IF NEW.status IS NOT NULL AND NEW.status NOT IN
       ('queued', 'approved', 'pushed', 'failed', 'retry_pending', 'rejected') THEN
    RAISE EXCEPTION
      'jira_write_back_queue: status must be queued|approved|pushed|failed|retry_pending|rejected, got "%"',
      NEW.status;
  END IF;

  -- At least one row identifier must be set. Order of preference:
  --   ph_issue_key (TEXT, the canonical PK on ph_issues) — added 2026-04-27
  --   ph_work_item_id (UUID, FK target documented elsewhere)
  --   ph_issue_id (UUID, legacy — kept until callers fully migrate)
  IF NEW.ph_issue_key IS NULL
     AND NEW.ph_work_item_id IS NULL
     AND NEW.ph_issue_id IS NULL THEN
    RAISE EXCEPTION
      'jira_write_back_queue requires at least one of ph_issue_key, ph_issue_id, or ph_work_item_id';
  END IF;

  RETURN NEW;
END;
$$;

-- (2) Drop the redundant trigger AND its function (correct order matters
--     to avoid 2BP01 dependency conflict)
DROP TRIGGER IF EXISTS jira_write_back_queue_validator ON jira_write_back_queue;
DROP FUNCTION IF EXISTS jira_write_back_queue_validate();

-- (3) L26 cache-bust
ALTER TABLE jira_write_back_queue ADD COLUMN IF NOT EXISTS _reload_marker_3 BOOLEAN;
ALTER TABLE jira_write_back_queue DROP COLUMN IF EXISTS _reload_marker_3;
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

COMMIT;

-- Verification (run separately after the COMMIT):
-- BEGIN;
-- INSERT INTO jira_write_back_queue (ph_issue_key, field_name, new_value, status)
-- VALUES ('BAU-5609', 'summary', 'AUDIT_VERIFY_FINAL', 'approved')
-- RETURNING id, ph_issue_key, field_name, status, created_at;
-- ROLLBACK;
