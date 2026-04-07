-- F-07: Cycle Status Guard
-- Prevents INSERTs into th_test_executions when the parent cycle
-- is not in 'active' status. Covers draft, paused, completed, archived.

CREATE OR REPLACE FUNCTION fn_guard_execution_on_active_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT current_status
    INTO v_status
    FROM tm_cycle_scope
   WHERE id = NEW.cycle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Cannot add execution: cycle_id % not found in tm_cycle_scope.',
      NEW.cycle_id;
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION
      'Cannot add executions to a cycle in ''%'' status. Cycle must be active.',
      v_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_execution_on_active_cycle
  ON th_test_executions;

CREATE TRIGGER trg_guard_execution_on_active_cycle
  BEFORE INSERT
  ON th_test_executions
  FOR EACH ROW
  EXECUTE FUNCTION fn_guard_execution_on_active_cycle();