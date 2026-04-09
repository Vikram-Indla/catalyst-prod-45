CREATE OR REPLACE FUNCTION public.trg_sync_requirement_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id uuid;
  v_total int;
  v_passed int;
  v_failed_blocked int;
  v_new_req_status text;
BEGIN
  FOR v_req_id IN
    SELECT requirement_id
    FROM tm_requirement_tests
    WHERE test_case_id = NEW.test_case_id
  LOOP
    UPDATE tm_requirement_tests
    SET coverage_status = CASE NEW.result
      WHEN 'passed'  THEN 'Passed'
      WHEN 'failed'  THEN 'Failed'
      WHEN 'blocked' THEN 'Blocked'
      WHEN 'skipped' THEN 'Skipped'
      ELSE 'Not Run'
    END
    WHERE requirement_id = v_req_id
      AND test_case_id = NEW.test_case_id;

    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE latest_result = 'passed'),
      COUNT(*) FILTER (WHERE latest_result IN ('failed','blocked'))
    INTO v_total, v_passed, v_failed_blocked
    FROM (
      SELECT DISTINCT ON (rt.test_case_id)
        rt.test_case_id,
        e.result AS latest_result
      FROM tm_requirement_tests rt
      LEFT JOIN th_test_executions e
        ON e.test_case_id = rt.test_case_id
      WHERE rt.requirement_id = v_req_id
      ORDER BY rt.test_case_id, e.executed_at DESC NULLS LAST
    ) sub;

    IF v_total = 0 THEN
      CONTINUE;
    ELSIF v_passed = v_total THEN
      v_new_req_status := 'verified';
    ELSIF v_failed_blocked > 0 THEN
      v_new_req_status := 'in_progress';
    ELSE
      v_new_req_status := 'in_progress';
    END IF;

    UPDATE tm_requirements
    SET status = v_new_req_status
    WHERE id = v_req_id
      AND status NOT IN ('deprecated', 'approved');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_requirement_status
AFTER INSERT ON th_test_executions
FOR EACH ROW
EXECUTE FUNCTION trg_sync_requirement_status();