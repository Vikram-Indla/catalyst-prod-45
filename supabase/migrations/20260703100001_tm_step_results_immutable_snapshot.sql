-- CAT-TESTHUB-PROD-20260703-001 P1-S1 (VER-002/A4 F4)
-- tm_step_results.test_step_id was ON DELETE CASCADE — deleting a step
-- (even soft, previously hard) destroyed every historical execution result
-- for it. This is the #1 architectural risk vs Xray/TestRail/Zephyr: a run
-- record must survive edits/deletes to the step it once tested.
--
-- Fix: denormalize action/expected text onto the result row at write time
-- (immutable snapshot), then relax the FK from CASCADE to SET NULL so a
-- step delete/edit can never delete or corrupt a result row again.

ALTER TABLE tm_step_results
  ADD COLUMN IF NOT EXISTS action_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS expected_snapshot TEXT;

COMMENT ON COLUMN tm_step_results.action_snapshot IS 'Step action text at time of execution — immutable, survives step edit/delete';
COMMENT ON COLUMN tm_step_results.expected_snapshot IS 'Step expected_result text at time of execution — immutable, survives step edit/delete';

-- Backfill existing rows from the live step text (best-effort; steps already
-- deleted before this migration have no source and stay null — visible gap,
-- not fabricated).
UPDATE tm_step_results sr
SET action_snapshot = ts.action,
    expected_snapshot = ts.expected_result
FROM tm_test_steps ts
WHERE ts.id = sr.test_step_id
  AND sr.action_snapshot IS NULL;

-- Auto-populate snapshots on every future insert so the client never has to
-- remember to send them.
CREATE OR REPLACE FUNCTION tm_step_results_populate_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_snapshot IS NULL OR NEW.expected_snapshot IS NULL THEN
    SELECT action, expected_result INTO NEW.action_snapshot, NEW.expected_snapshot
    FROM tm_test_steps WHERE id = NEW.test_step_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tm_step_results_populate_snapshot ON tm_step_results;
CREATE TRIGGER trg_tm_step_results_populate_snapshot
  BEFORE INSERT ON tm_step_results
  FOR EACH ROW EXECUTE FUNCTION tm_step_results_populate_snapshot();

-- Relax the FK: a step delete/edit must never touch execution history again.
-- test_step_id must be nullable for ON DELETE SET NULL to actually apply —
-- without this, Postgres blocks the delete with a 23502 not-null violation
-- instead (discovered via a live scratch-row probe during this slice).
ALTER TABLE tm_step_results ALTER COLUMN test_step_id DROP NOT NULL;
ALTER TABLE tm_step_results DROP CONSTRAINT IF EXISTS tm_step_results_test_step_id_fkey;
ALTER TABLE tm_step_results
  ADD CONSTRAINT tm_step_results_test_step_id_fkey
  FOREIGN KEY (test_step_id) REFERENCES tm_test_steps(id) ON DELETE SET NULL;

-- Soft-delete support for tm_test_steps (hard delete is what triggered the
-- CASCADE loss in the first place; useDeleteTestStep now sets this instead).
ALTER TABLE tm_test_steps ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
