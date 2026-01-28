-- Grant UPDATE permission on sequence (needed for nextval)
GRANT UPDATE ON SEQUENCE planner_task_key_seq TO authenticated;
GRANT UPDATE ON SEQUENCE planner_task_key_seq TO anon;

-- Make the function SECURITY DEFINER to run with owner privileges
DROP FUNCTION IF EXISTS generate_planner_task_key();

CREATE OR REPLACE FUNCTION generate_planner_task_key()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('planner_task_key_seq');
  RETURN 'PLN-' || next_val;
END;
$$ LANGUAGE plpgsql;

-- Grant execute on the new function
GRANT EXECUTE ON FUNCTION generate_planner_task_key() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_planner_task_key() TO anon;