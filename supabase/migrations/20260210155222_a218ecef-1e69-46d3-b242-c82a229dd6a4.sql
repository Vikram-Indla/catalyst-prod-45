
CREATE OR REPLACE FUNCTION public.get_cycle_failure_reasons(p_cycle_id uuid)
RETURNS TABLE(failure_reason text, count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(ctc.failure_reason::text, 'unspecified') AS failure_reason,
    COUNT(*) AS count
  FROM th_cycle_test_cases ctc
  WHERE ctc.cycle_id = p_cycle_id
    AND ctc.execution_status = 'failed'
  GROUP BY COALESCE(ctc.failure_reason::text, 'unspecified')
  ORDER BY count DESC;
$$;
