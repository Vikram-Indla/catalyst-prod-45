CREATE OR REPLACE FUNCTION public.get_project_ai_context(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_project JSONB;
  v_status_counts JSONB;
  v_overdue JSONB;
  v_blocked JSONB;
  v_velocity_current NUMERIC;
  v_velocity_previous NUMERIC;
  v_workload JSONB;
  v_total INTEGER;
  v_done INTEGER;
  v_remaining INTEGER;
BEGIN
  SELECT jsonb_build_object(
    'name', p.name,
    'project_key', p.key,
    'status', p.status
  ) INTO v_project
  FROM projects p
  WHERE p.id = p_project_id;

  IF v_project IS NULL THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;

  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
  INTO v_status_counts
  FROM (
    SELECT status, COUNT(*)::INTEGER as cnt
    FROM work_items
    WHERE project_id = p_project_id
    GROUP BY status
  ) s;

  SELECT COUNT(*)::INTEGER INTO v_total
  FROM work_items WHERE project_id = p_project_id;

  SELECT COUNT(*)::INTEGER INTO v_done
  FROM work_items
  WHERE project_id = p_project_id
    AND LOWER(status) IN ('done', 'cancelled', 'closed', 'resolved');

  v_remaining := v_total - v_done;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'item_key', wi.item_key,
    'title', wi.title,
    'due_date', wi.due_date,
    'priority', wi.priority,
    'assignee', COALESCE(pr.full_name, 'Unassigned'),
    'days_overdue', (CURRENT_DATE - wi.due_date::date)
  )), '[]'::jsonb)
  INTO v_overdue
  FROM work_items wi
  LEFT JOIN profiles pr ON pr.id = wi.assignee_id
  WHERE wi.project_id = p_project_id
    AND wi.due_date IS NOT NULL
    AND wi.due_date::date < CURRENT_DATE
    AND LOWER(wi.status) NOT IN ('done', 'cancelled', 'closed', 'resolved');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'item_key', wi.item_key,
    'title', wi.title,
    'priority', wi.priority,
    'assignee', COALESCE(pr.full_name, 'Unassigned')
  )), '[]'::jsonb)
  INTO v_blocked
  FROM work_items wi
  LEFT JOIN profiles pr ON pr.id = wi.assignee_id
  WHERE wi.project_id = p_project_id
    AND LOWER(wi.status) = 'blocked';

  SELECT COUNT(*)::NUMERIC / 2
  INTO v_velocity_current
  FROM work_items
  WHERE project_id = p_project_id
    AND LOWER(status) IN ('done', 'closed', 'resolved')
    AND resolved_at >= (CURRENT_DATE - INTERVAL '14 days');

  SELECT COUNT(*)::NUMERIC / 2
  INTO v_velocity_previous
  FROM work_items
  WHERE project_id = p_project_id
    AND LOWER(status) IN ('done', 'closed', 'resolved')
    AND resolved_at >= (CURRENT_DATE - INTERVAL '28 days')
    AND resolved_at < (CURRENT_DATE - INTERVAL '14 days');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', w.full_name,
    'active_items', w.cnt
  ) ORDER BY w.cnt DESC), '[]'::jsonb)
  INTO v_workload
  FROM (
    SELECT pr.full_name, COUNT(*)::INTEGER as cnt
    FROM work_items wi
    JOIN profiles pr ON pr.id = wi.assignee_id
    WHERE wi.project_id = p_project_id
      AND LOWER(wi.status) NOT IN ('done', 'cancelled', 'closed', 'resolved')
    GROUP BY pr.full_name
  ) w;

  result := jsonb_build_object(
    'project', v_project,
    'total_items', v_total,
    'done_items', v_done,
    'remaining_items', v_remaining,
    'completion_percent', CASE WHEN v_total > 0 THEN ROUND((v_done::NUMERIC / v_total) * 100) ELSE 0 END,
    'status_counts', v_status_counts,
    'overdue_items', v_overdue,
    'overdue_count', jsonb_array_length(v_overdue),
    'blocked_items', v_blocked,
    'blocked_count', jsonb_array_length(v_blocked),
    'velocity_current', ROUND(COALESCE(v_velocity_current, 0), 1),
    'velocity_previous', ROUND(COALESCE(v_velocity_previous, 0), 1),
    'workload', v_workload
  );

  RETURN result;
END;
$$;