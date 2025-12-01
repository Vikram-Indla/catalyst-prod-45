-- Fix security warning: Add search_path to trigger function
DROP FUNCTION IF EXISTS update_test_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_test_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Recreate triggers with the updated function
CREATE TRIGGER update_test_folders_updated_at
  BEFORE UPDATE ON test_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_cases_updated_at
  BEFORE UPDATE ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_steps_updated_at
  BEFORE UPDATE ON test_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_sets_updated_at
  BEFORE UPDATE ON test_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_cycles_updated_at
  BEFORE UPDATE ON test_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_executions_updated_at
  BEFORE UPDATE ON test_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();

CREATE TRIGGER update_test_execution_steps_updated_at
  BEFORE UPDATE ON test_execution_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_test_updated_at();