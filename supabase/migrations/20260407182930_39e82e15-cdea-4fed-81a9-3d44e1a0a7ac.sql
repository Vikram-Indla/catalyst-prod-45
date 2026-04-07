
-- Drop the UUID overload that has parameter defaults
DROP FUNCTION IF EXISTS public.get_defect_stats(UUID);

-- Recreate overload 1: no arguments, returns table
CREATE OR REPLACE FUNCTION public.get_defect_stats()
RETURNS TABLE(
  total_defects BIGINT,
  open_defects BIGINT,
  in_progress_defects BIGINT,
  fixed_defects BIGINT,
  verified_defects BIGINT,
  closed_defects BIGINT,
  critical_defects BIGINT,
  high_defects BIGINT,
  medium_defects BIGINT,
  low_defects BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.status::text IN ('open'))::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.status::text = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.status::text = 'resolved')::BIGINT,
    0::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.status::text = 'closed')::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.severity::text = 'critical' AND tm_defects.status::text NOT IN ('closed'))::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.severity::text = 'major' AND tm_defects.status::text NOT IN ('closed'))::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.severity::text = 'minor' AND tm_defects.status::text NOT IN ('closed'))::BIGINT,
    COUNT(*) FILTER (WHERE tm_defects.severity::text = 'trivial' AND tm_defects.status::text NOT IN ('closed'))::BIGINT
  FROM tm_defects;
END;
$$;

-- Recreate overload 2: with p_project_id, returns JSON
CREATE OR REPLACE FUNCTION public.get_defect_stats(p_project_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'open', COUNT(*) FILTER (WHERE status::text IN ('open')),
      'in_progress', COUNT(*) FILTER (WHERE status::text = 'in_progress'),
      'resolved', COUNT(*) FILTER (WHERE status::text = 'resolved'),
      'verified', 0,
      'closed', COUNT(*) FILTER (WHERE status::text = 'closed'),
      'deferred', 0,
      'critical', COUNT(*) FILTER (WHERE severity::text = 'critical' AND status::text NOT IN ('closed')),
      'high', COUNT(*) FILTER (WHERE severity::text = 'major' AND status::text NOT IN ('closed')),
      'medium', COUNT(*) FILTER (WHERE severity::text = 'minor' AND status::text NOT IN ('closed')),
      'low', COUNT(*) FILTER (WHERE severity::text = 'trivial' AND status::text NOT IN ('closed')),
      'unassigned', COUNT(*) FILTER (WHERE assignee_id IS NULL AND status::text NOT IN ('closed')),
      'overdue', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status::text NOT IN ('closed', 'resolved'))
    )
    FROM tm_defects
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
  );
END;
$$;
