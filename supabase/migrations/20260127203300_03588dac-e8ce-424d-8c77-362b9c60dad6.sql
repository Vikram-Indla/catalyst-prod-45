-- ============================================================
-- PLANNER TASK LIST VIEW (V9 Spec)
-- Full task list view with computed fields
-- ============================================================

CREATE OR REPLACE VIEW planner_task_list AS
SELECT
  t.id,
  NULL::text AS task_key,
  t.title,
  t.description,
  t.status_id,
  s.name as status_name,
  s.slug as status_slug,
  s.color as status_color,
  COALESCE(s.is_completed_status, false) as status_is_done,
  t.priority,
  t.workstream_id,
  w.name as workstream_name,
  w.slug as workstream_slug,
  w.color as workstream_color,
  t.assignee_id,
  p.full_name as assignee_name,
  p.avatar_url as assignee_avatar,
  t.due_date,
  t.start_date,
  t.progress,
  t.blocked,
  t.blocked_reason,
  NULL::integer AS time_estimate_minutes,
  NULL::integer AS time_logged_minutes,
  t.created_at,
  t.updated_at,
  t.created_by,
  creator.full_name as creator_name,
  NULL::integer AS sort_order,
  -- Computed fields
  CASE 
    WHEN t.due_date < CURRENT_DATE AND COALESCE(s.is_completed_status, false) = false THEN true 
    ELSE false 
  END as is_overdue,
  CASE 
    WHEN t.due_date = CURRENT_DATE THEN true 
    ELSE false 
  END as is_due_today,
  CASE 
    WHEN t.due_date IS NOT NULL AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days' THEN true
    ELSE false
  END as is_due_soon
FROM planner_tasks t
LEFT JOIN planner_statuses s ON t.status_id = s.id
LEFT JOIN planner_workstreams w ON t.workstream_id = w.id
LEFT JOIN profiles p ON t.assignee_id = p.id
LEFT JOIN profiles creator ON t.created_by = creator.id
WHERE t.deleted_at IS NULL
ORDER BY 
  CASE t.priority 
    WHEN 'critical' THEN 0 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END,
  t.due_date ASC NULLS LAST,
  t.created_at DESC;

-- ============================================================
-- PLANNER TASK LIST STATS FUNCTION
-- Returns quick stats for the task list header
-- ============================================================

CREATE OR REPLACE FUNCTION planner_task_list_stats(
  p_workstream_id UUID DEFAULT NULL,
  p_assignee_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_count BIGINT,
  overdue_count BIGINT,
  in_progress_count BIGINT,
  done_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (
      WHERE t.due_date < CURRENT_DATE 
      AND COALESCE(s.is_completed_status, false) = false
    )::BIGINT as overdue_count,
    COUNT(*) FILTER (
      WHERE s.slug = 'progress'
    )::BIGINT as in_progress_count,
    COUNT(*) FILTER (
      WHERE COALESCE(s.is_completed_status, false) = true
    )::BIGINT as done_count
  FROM planner_tasks t
  LEFT JOIN planner_statuses s ON t.status_id = s.id
  WHERE t.deleted_at IS NULL
    AND (p_workstream_id IS NULL OR t.workstream_id = p_workstream_id)
    AND (p_assignee_id IS NULL OR t.assignee_id = p_assignee_id);
END;
$$ LANGUAGE plpgsql STABLE;