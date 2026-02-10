
DROP FUNCTION IF EXISTS get_top_failing_tests(INTEGER);
CREATE OR REPLACE FUNCTION get_top_failing_tests(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT,
  failure_count BIGINT,
  last_failed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.case_key::TEXT,
    tc.title::TEXT,
    tc.priority::TEXT,
    COUNT(*)::BIGINT,
    MAX(ctc.executed_at)
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON tc.id = ctc.test_case_id
  WHERE ctc.execution_status = 'failed'
  GROUP BY tc.id, tc.case_key, tc.title, tc.priority
  ORDER BY COUNT(*) DESC, MAX(ctc.executed_at) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
