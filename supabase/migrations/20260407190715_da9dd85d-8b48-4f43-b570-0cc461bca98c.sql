-- Create sequence for execution numbers
CREATE SEQUENCE IF NOT EXISTS seq_execution_number START 1;

-- Set the sequence to start above the current max to avoid collisions
SELECT setval(
  'seq_execution_number',
  COALESCE((SELECT MAX(execution_number) FROM th_test_executions), 0) + 1
);

-- Trigger function: assign execution_number on INSERT if not already set
CREATE OR REPLACE FUNCTION fn_assign_execution_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.execution_number IS NULL THEN
    NEW.execution_number := nextval('seq_execution_number');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_execution_number ON th_test_executions;
CREATE TRIGGER trg_assign_execution_number
  BEFORE INSERT ON th_test_executions
  FOR EACH ROW EXECUTE FUNCTION fn_assign_execution_number();