CREATE OR REPLACE FUNCTION tm_get_traceability_matrix(p_project_id UUID)
RETURNS TABLE (
  requirement_type TEXT,
  requirement_id UUID,
  requirement_title TEXT,
  requirement_status TEXT,
  total_test_cases BIGINT,
  passed_count BIGINT,
  failed_count BIGINT,
  blocked_count BIGINT,
  not_run_count BIGINT,
  coverage_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH linked_cases AS (
    SELECT 
      rl.requirement_type,
      rl.requirement_id,
      rl.test_case_id,
      (
        SELECT cs.current_status 
        FROM tm_cycle_scope cs
        WHERE cs.test_case_id = rl.test_case_id 
        ORDER BY cs.updated_at DESC NULLS LAST 
        LIMIT 1
      ) as last_status
    FROM tm_requirement_links rl
    JOIN tm_test_cases tc ON tc.id = rl.test_case_id
    WHERE tc.project_id = p_project_id
      AND rl.requirement_id IS NOT NULL
  ),
  req_stats AS (
    SELECT 
      lc.requirement_type,
      lc.requirement_id,
      COUNT(DISTINCT lc.test_case_id) as total_cases,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'passed') as passed,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'failed') as failed,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'blocked') as blocked,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status IS NULL OR lc.last_status = 'not_run') as not_run
    FROM linked_cases lc
    GROUP BY lc.requirement_type, lc.requirement_id
  )
  SELECT 
    rs.requirement_type,
    rs.requirement_id,
    CASE 
      WHEN rs.requirement_type = 'story' THEN s.title
      WHEN rs.requirement_type = 'epic' THEN e.name
      WHEN rs.requirement_type = 'feature' THEN f.name
      WHEN rs.requirement_type = 'business_request' THEN br.title
    END as requirement_title,
    CASE 
      WHEN rs.requirement_type = 'story' THEN s.status
      WHEN rs.requirement_type = 'epic' THEN e.status
      WHEN rs.requirement_type = 'feature' THEN f.status
      WHEN rs.requirement_type = 'business_request' THEN br.process_step
    END as requirement_status,
    rs.total_cases as total_test_cases,
    rs.passed as passed_count,
    rs.failed as failed_count,
    rs.blocked as blocked_count,
    rs.not_run as not_run_count,
    CASE WHEN rs.total_cases > 0 
      THEN ROUND((rs.passed::numeric / rs.total_cases) * 100, 1)
      ELSE 0 
    END as coverage_pct
  FROM req_stats rs
  LEFT JOIN stories s ON rs.requirement_type = 'story' AND rs.requirement_id = s.id
  LEFT JOIN epics e ON rs.requirement_type = 'epic' AND rs.requirement_id = e.id
  LEFT JOIN features f ON rs.requirement_type = 'feature' AND rs.requirement_id = f.id
  LEFT JOIN business_requests br ON rs.requirement_type = 'business_request' AND rs.requirement_id = br.id
  ORDER BY rs.requirement_type, requirement_title;
END;
$$;