-- P1-S12: get_defect_stats was fundamentally broken. It queried th_defects
-- (a dead legacy table, 0 rows) instead of tm_defects, its project filter
-- was a no-op tautology `(p_project_id IS NULL OR TRUE)` -- always true,
-- never actually scoped -- and it referenced status/severity enum values
-- that don't exist in this schema ('new'/'fixed'/'verified'/'deferred' for
-- tm_defect_status; 'high'/'medium'/'low' for tm_defect_severity). Found
-- live while proving P1-S12's own "stats change when switching project"
-- accept condition -- both real projects returned all-zero stats.
--
-- JSON output keys are unchanged (useDefectStats in useDefects.ts maps them
-- by name) -- only the source table, column names, enum literals, and the
-- project filter are corrected.
CREATE OR REPLACE FUNCTION public.get_defect_stats(p_project_id uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'open', COUNT(*) FILTER (WHERE status IN ('open', 'reopened')),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
      'verified', 0,
      'closed', COUNT(*) FILTER (WHERE status = 'closed'),
      'deferred', 0,
      'critical', COUNT(*) FILTER (WHERE severity = 'critical' AND status != 'closed'),
      'high', COUNT(*) FILTER (WHERE severity = 'major' AND status != 'closed'),
      'medium', COUNT(*) FILTER (WHERE severity = 'minor' AND status != 'closed'),
      'low', COUNT(*) FILTER (WHERE severity = 'trivial' AND status != 'closed'),
      'unassigned', COUNT(*) FILTER (WHERE assignee_id IS NULL AND status != 'closed'),
      'overdue', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('closed', 'resolved'))
    )
    FROM tm_defects
    WHERE (p_project_id IS NULL OR project_id = p_project_id)
  );
END;
$function$;
