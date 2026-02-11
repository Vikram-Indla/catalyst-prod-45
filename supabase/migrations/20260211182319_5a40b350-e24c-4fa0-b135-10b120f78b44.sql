
-- Add get_defect_metrics RPC for G24 diagnostic compliance
CREATE OR REPLACE FUNCTION public.get_defect_metrics(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COALESCE(COUNT(*), 0),
    'open', COALESCE(COUNT(*) FILTER (WHERE d.workflow_status NOT IN ('closed', 'resolved', 'verified')), 0),
    'closed', COALESCE(COUNT(*) FILTER (WHERE d.workflow_status IN ('closed', 'resolved', 'verified')), 0),
    'critical', COALESCE(COUNT(*) FILTER (WHERE d.severity = 'critical'), 0),
    'high', COALESCE(COUNT(*) FILTER (WHERE d.severity = 'high'), 0),
    'medium', COALESCE(COUNT(*) FILTER (WHERE d.severity = 'medium'), 0),
    'low', COALESCE(COUNT(*) FILTER (WHERE d.severity = 'low'), 0),
    'new_this_period', COALESCE(COUNT(*) FILTER (WHERE d.created_at >= COALESCE(p_start_date, now() - interval '30 days')), 0),
    'closed_this_period', COALESCE(COUNT(*) FILTER (WHERE d.resolved_at >= COALESCE(p_start_date, now() - interval '30 days') AND d.workflow_status IN ('closed', 'resolved', 'verified')), 0)
  ) INTO result
  FROM defects d
  WHERE (p_start_date IS NULL OR d.created_at >= p_start_date)
     OR d.workflow_status NOT IN ('closed', 'resolved', 'verified');

  RETURN COALESCE(result, '{"total":0,"open":0,"closed":0,"critical":0,"high":0,"medium":0,"low":0,"new_this_period":0,"closed_this_period":0}'::jsonb);
END;
$$;
