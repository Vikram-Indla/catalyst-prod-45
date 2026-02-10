
-- Fix type mismatches in cycle pass rates
DROP FUNCTION IF EXISTS get_cycle_pass_rates(INTEGER);
CREATE OR REPLACE FUNCTION get_cycle_pass_rates(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  cycle_id UUID,
  cycle_key VARCHAR,
  cycle_name VARCHAR,
  status VARCHAR,
  created_at TIMESTAMPTZ,
  total_cases BIGINT,
  executed BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.cycle_key,
    c.name,
    c.status,
    c.created_at,
    c.total_cases::BIGINT,
    (c.total_cases - c.not_run_count)::BIGINT,
    CASE 
      WHEN (c.total_cases - c.not_run_count) > 0 
      THEN ROUND(c.passed_count::NUMERIC * 100 / (c.total_cases - c.not_run_count), 1)
      ELSE 0
    END
  FROM th_test_cycles c
  WHERE c.total_cases > 0
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Fix top failing tests (case_key/title/priority may be varchar)
DROP FUNCTION IF EXISTS get_top_failing_tests(INTEGER);
CREATE OR REPLACE FUNCTION get_top_failing_tests(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  test_case_id UUID,
  case_key VARCHAR,
  title VARCHAR,
  priority VARCHAR,
  failure_count BIGINT,
  last_failed TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.case_key,
    tc.title,
    tc.priority,
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
