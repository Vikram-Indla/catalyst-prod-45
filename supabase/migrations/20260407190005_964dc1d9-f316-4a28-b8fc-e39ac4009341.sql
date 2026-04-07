-- Step 1: Add locked_version column
ALTER TABLE tm_cycle_scope
  ADD COLUMN IF NOT EXISTS locked_version INTEGER;

-- Step 2: Backfill existing rows
UPDATE tm_cycle_scope cs
SET locked_version = tc.version
FROM tm_test_cases tc
WHERE cs.test_case_id = tc.id;

-- Step 3: Trigger to auto-lock version on INSERT
CREATE OR REPLACE FUNCTION fn_lock_scope_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.locked_version IS NULL THEN
    SELECT version INTO NEW.locked_version
    FROM tm_test_cases
    WHERE id = NEW.test_case_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_scope_version ON tm_cycle_scope;
CREATE TRIGGER trg_lock_scope_version
  BEFORE INSERT ON tm_cycle_scope
  FOR EACH ROW EXECUTE FUNCTION fn_lock_scope_version();