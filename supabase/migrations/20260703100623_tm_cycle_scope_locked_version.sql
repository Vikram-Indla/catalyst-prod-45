-- CAT-TESTHUB-PROD-20260703-001 P1-S2 (VER-001)
-- The runner reads LIVE tm_test_steps for a case, so editing a case mid-cycle
-- silently rewrites what every in-progress/completed run "tested" — no serious
-- competitor allows this. tm_cycle_scope.locked_version already existed as a
-- code-level field (useTestCycles.ts useAddCasesToScope) but the column never
-- existed on the table, so it was never actually written.
--
-- Pin the test case's current version number at scope-add time. The runner
-- (P1-S2 app change) reads the matching tm_test_case_versions.snapshot row
-- when one exists for that version, and falls back to live steps only when
-- no snapshot was ever recorded for it (case untouched since scope-add —
-- honest degrade, not corruption).

ALTER TABLE tm_cycle_scope ADD COLUMN IF NOT EXISTS locked_version INTEGER;

COMMENT ON COLUMN tm_cycle_scope.locked_version IS 'tm_test_cases.version pinned at scope-add time; runner resolves steps via tm_test_case_versions for this version, never live tm_test_steps';

CREATE OR REPLACE FUNCTION tm_cycle_scope_populate_locked_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.locked_version IS NULL THEN
    SELECT version INTO NEW.locked_version FROM tm_test_cases WHERE id = NEW.test_case_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tm_cycle_scope_populate_locked_version ON tm_cycle_scope;
CREATE TRIGGER trg_tm_cycle_scope_populate_locked_version
  BEFORE INSERT ON tm_cycle_scope
  FOR EACH ROW EXECUTE FUNCTION tm_cycle_scope_populate_locked_version();

-- Backfill existing scope rows to their case's current version (best-effort;
-- these cases have not been edited since being added, so "current" and
-- "at-add-time" coincide today).
UPDATE tm_cycle_scope cs
SET locked_version = tc.version
FROM tm_test_cases tc
WHERE tc.id = cs.test_case_id
  AND cs.locked_version IS NULL;
