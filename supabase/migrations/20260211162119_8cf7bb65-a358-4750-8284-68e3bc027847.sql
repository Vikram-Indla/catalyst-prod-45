
DROP FUNCTION IF EXISTS get_my_scope(uuid);

CREATE FUNCTION get_my_scope(p_user_id uuid)
RETURNS TABLE(
  cycle_test_case_id uuid,
  test_case_id uuid,
  case_key text,
  title text,
  priority text,
  execution_status text,
  cycle_id uuid,
  cycle_name text,
  release_id uuid,
  release_version text,
  release_name text,
  assigned_at timestamptz,
  failure_reason text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ctc.id AS cycle_test_case_id,
    ctc.test_case_id,
    tc.case_key::text,
    tc.title::text,
    tc.priority::text,
    ctc.execution_status::text,
    c.id AS cycle_id,
    c.name::text AS cycle_name,
    NULL::uuid AS release_id,
    NULL::text AS release_version,
    NULL::text AS release_name,
    ctc.created_at AS assigned_at,
    ctc.failure_reason::text,
    ctc.notes::text
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON ctc.test_case_id = tc.id
  JOIN th_test_cycles c ON ctc.cycle_id = c.id
  WHERE ctc.assigned_to = p_user_id
    AND c.status IN ('active', 'in_progress')
  ORDER BY
    CASE tc.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    tc.case_key;
END;
$$;
