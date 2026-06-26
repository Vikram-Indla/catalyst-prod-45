-- exp-003 fix: tm_get_requirement_test_cases + tm_get_traceability_matrix
-- Both functions referenced tm_test_executions which does not exist in this DB.
-- Also fixes wrong column references: tc.key → tc.case_key, tc.priority → joined priority name.
-- Replacement: tm_cycle_scope.current_status / updated_at instead of test_executions.

-- ─────────────────────────────────────────
-- 1. tm_get_requirement_test_cases
-- ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.tm_get_requirement_test_cases(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.tm_get_requirement_test_cases(
  p_requirement_type TEXT,
  p_requirement_id   UUID
)
RETURNS TABLE (
  link_id               UUID,
  test_case_id          UUID,
  test_case_key         TEXT,
  test_case_title       TEXT,
  test_case_status      TEXT,
  test_case_priority    TEXT,
  link_type             TEXT,
  coverage_status       TEXT,
  last_execution_status TEXT,
  last_execution_date   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.id                                    AS link_id,
    tc.id                                    AS test_case_id,
    tc.case_key::TEXT                        AS test_case_key,
    tc.title::TEXT                           AS test_case_title,
    tc.status::TEXT                          AS test_case_status,
    COALESCE(cp.name, 'Unset')::TEXT         AS test_case_priority,
    rl.link_type::TEXT                       AS link_type,
    rl.coverage_status::TEXT                 AS coverage_status,
    (
      SELECT cs.current_status::TEXT
      FROM   tm_cycle_scope cs
      WHERE  cs.test_case_id = tc.id
      ORDER  BY cs.updated_at DESC NULLS LAST
      LIMIT  1
    )                                        AS last_execution_status,
    (
      SELECT cs.updated_at
      FROM   tm_cycle_scope cs
      WHERE  cs.test_case_id = tc.id
      ORDER  BY cs.updated_at DESC NULLS LAST
      LIMIT  1
    )                                        AS last_execution_date
  FROM  tm_requirement_links rl
  JOIN  tm_test_cases        tc ON tc.id = rl.test_case_id
  LEFT JOIN tm_case_priorities cp ON cp.id = tc.priority_id
  WHERE rl.requirement_type = p_requirement_type
    AND rl.requirement_id   = p_requirement_id
  ORDER BY tc.case_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tm_get_requirement_test_cases(TEXT, UUID) TO authenticated;

-- ─────────────────────────────────────────
-- 2. tm_get_traceability_matrix
-- ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.tm_get_traceability_matrix(UUID);

CREATE OR REPLACE FUNCTION public.tm_get_traceability_matrix(p_project_id UUID)
RETURNS TABLE (
  requirement_type   TEXT,
  requirement_id     UUID,
  requirement_title  TEXT,
  requirement_status TEXT,
  total_test_cases   BIGINT,
  passed_count       BIGINT,
  failed_count       BIGINT,
  blocked_count      BIGINT,
  not_run_count      BIGINT,
  coverage_pct       NUMERIC
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
        FROM   tm_cycle_scope cs
        WHERE  cs.test_case_id = rl.test_case_id
        ORDER  BY cs.updated_at DESC NULLS LAST
        LIMIT  1
      ) AS last_status
    FROM  tm_requirement_links rl
    JOIN  tm_test_cases        tc ON tc.id = rl.test_case_id
    WHERE tc.project_id      = p_project_id
      AND rl.requirement_id IS NOT NULL
  ),
  req_stats AS (
    SELECT
      lc.requirement_type,
      lc.requirement_id,
      COUNT(DISTINCT lc.test_case_id)                                              AS total_cases,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'passed')    AS passed,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'failed')    AS failed,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status = 'blocked')   AS blocked,
      COUNT(DISTINCT lc.test_case_id) FILTER (WHERE lc.last_status IS NULL
                                               OR lc.last_status = 'not_run')     AS not_run
    FROM linked_cases lc
    GROUP BY lc.requirement_type, lc.requirement_id
  )
  SELECT
    rs.requirement_type::TEXT,
    rs.requirement_id,
    CASE
      WHEN rs.requirement_type = 'story'            THEN s.title
      WHEN rs.requirement_type = 'epic'             THEN e.name
      WHEN rs.requirement_type = 'feature'          THEN f.name
      WHEN rs.requirement_type = 'business_request' THEN br.title
    END                                                                             AS requirement_title,
    CASE
      WHEN rs.requirement_type = 'story'            THEN s.status::TEXT
      WHEN rs.requirement_type = 'epic'             THEN e.status::TEXT
      WHEN rs.requirement_type = 'feature'          THEN f.status::TEXT
      WHEN rs.requirement_type = 'business_request' THEN br.process_step::TEXT
    END                                                                             AS requirement_status,
    rs.total_cases  AS total_test_cases,
    rs.passed       AS passed_count,
    rs.failed       AS failed_count,
    rs.blocked      AS blocked_count,
    rs.not_run      AS not_run_count,
    CASE WHEN rs.total_cases > 0
      THEN ROUND((rs.passed::NUMERIC / rs.total_cases) * 100, 1)
      ELSE 0
    END                                                                             AS coverage_pct
  FROM req_stats rs
  LEFT JOIN stories           s  ON rs.requirement_type = 'story'            AND rs.requirement_id = s.id
  LEFT JOIN epics             e  ON rs.requirement_type = 'epic'             AND rs.requirement_id = e.id
  LEFT JOIN features          f  ON rs.requirement_type = 'feature'          AND rs.requirement_id = f.id
  LEFT JOIN business_requests br ON rs.requirement_type = 'business_request' AND rs.requirement_id = br.id
  ORDER BY rs.requirement_type, requirement_title;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tm_get_traceability_matrix(UUID) TO authenticated;
