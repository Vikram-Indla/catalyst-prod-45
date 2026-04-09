CREATE OR REPLACE FUNCTION get_requirement_tests(p_requirement_id UUID)
RETURNS TABLE (
  link_id UUID,
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT,
  latest_status TEXT,
  last_executed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id as link_id,
    tc.id as test_case_id,
    tc.case_key::TEXT,
    tc.title::TEXT,
    cp.name::TEXT as priority,
    (
      SELECT e.result::TEXT
      FROM th_test_executions e
      WHERE e.test_case_id = tc.id
      ORDER BY e.executed_at DESC NULLS LAST
      LIMIT 1
    ) as latest_status,
    (
      SELECT e.executed_at
      FROM th_test_executions e
      WHERE e.test_case_id = tc.id
      ORDER BY e.executed_at DESC NULLS LAST
      LIMIT 1
    ) as last_executed
  FROM tm_requirement_tests rt
  JOIN tm_test_cases tc ON tc.id = rt.test_case_id
  LEFT JOIN tm_case_priorities cp ON cp.id = tc.priority_id
  WHERE rt.requirement_id = p_requirement_id
  AND tc.deleted_at IS NULL
  ORDER BY tc.case_key;
END;
$$ LANGUAGE plpgsql;
