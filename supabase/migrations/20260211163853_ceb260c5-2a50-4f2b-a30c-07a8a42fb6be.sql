
-- Add release_id to th_test_cycles for release-level filtering
ALTER TABLE public.th_test_cycles 
ADD COLUMN release_id UUID REFERENCES public.releases(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_th_test_cycles_release_id ON public.th_test_cycles(release_id);

-- Update get_my_scope RPC to include release info
CREATE OR REPLACE FUNCTION public.get_my_scope(p_user_id UUID, p_project_id UUID DEFAULT NULL)
RETURNS TABLE(
  cycle_test_case_id UUID,
  test_case_id UUID,
  case_key TEXT,
  title TEXT,
  priority TEXT,
  execution_status TEXT,
  cycle_id UUID,
  cycle_name TEXT,
  release_id UUID,
  release_version TEXT,
  release_name TEXT,
  assigned_at TIMESTAMPTZ,
  failure_reason TEXT,
  notes TEXT,
  estimated_time INTEGER,
  cycle_end_date DATE
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
    c.release_id,
    r.version::text AS release_version,
    r.name::text AS release_name,
    ctc.created_at AS assigned_at,
    ctc.failure_reason::text,
    ctc.notes::text,
    0 AS estimated_time,
    c.end_date AS cycle_end_date
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON ctc.test_case_id = tc.id
  JOIN th_test_cycles c ON ctc.cycle_id = c.id
  LEFT JOIN releases r ON c.release_id = r.id
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
