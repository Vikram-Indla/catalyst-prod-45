-- Grant sequence permissions to authenticated and anon roles
GRANT USAGE, SELECT ON SEQUENCE planner_task_key_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE planner_task_key_seq TO anon;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_planner_task_key() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_planner_task_key() TO anon;