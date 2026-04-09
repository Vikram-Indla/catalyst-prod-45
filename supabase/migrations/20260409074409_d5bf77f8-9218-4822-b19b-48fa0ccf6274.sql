
DROP FUNCTION IF EXISTS public.get_defect_stats(uuid);

CREATE FUNCTION public.get_defect_stats(p_project_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total',       COUNT(*),
    'open',        COUNT(*) FILTER (WHERE status::text = 'open'),
    'in_progress', COUNT(*) FILTER (WHERE status::text = 'in_progress'),
    'resolved',    COUNT(*) FILTER (WHERE status::text = 'resolved'),
    'verified',    0,
    'closed',      COUNT(*) FILTER (WHERE status::text = 'closed'),
    'critical',    COUNT(*) FILTER (WHERE severity::text = 'critical'),
    'high',        COUNT(*) FILTER (WHERE severity::text = 'major'),
    'medium',      COUNT(*) FILTER (WHERE severity::text = 'minor'),
    'low',         COUNT(*) FILTER (WHERE severity::text = 'trivial'),
    'unassigned',  COUNT(*) FILTER (WHERE assignee_id IS NULL),
    'overdue',     0
  )
  FROM tm_defects
  WHERE project_id = p_project_id;
$$;
