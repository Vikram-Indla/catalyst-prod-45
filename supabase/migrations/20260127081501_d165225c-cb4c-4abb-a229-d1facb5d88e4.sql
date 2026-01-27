-- ═══════════════════════════════════════════════════════════════════════════════
-- PLANNER V9 - DASHBOARD & BOARDS DATABASE VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- VIEW 1: planner_dashboard_metrics
-- Aggregated KPIs for metric cards
CREATE OR REPLACE VIEW planner_dashboard_metrics AS
SELECT
  COUNT(*)::INTEGER AS total_tasks,
  COUNT(*) FILTER (
    WHERE pt.due_date < CURRENT_DATE 
    AND ps.is_completed_status = false
  )::INTEGER AS overdue_count,
  COUNT(*) FILTER (WHERE pt.blocked = true)::INTEGER AS blocked_count,
  COUNT(*) FILTER (
    WHERE ps.is_completed_status = true 
    AND pt.updated_at >= date_trunc('week', CURRENT_DATE)
  )::INTEGER AS completed_this_week,
  COUNT(*) FILTER (WHERE pt.priority = 'critical')::INTEGER AS critical_count,
  COUNT(*) FILTER (WHERE pt.priority = 'high')::INTEGER AS high_count,
  COUNT(*) FILTER (WHERE pt.priority = 'medium')::INTEGER AS medium_count,
  COUNT(*) FILTER (WHERE pt.priority = 'low')::INTEGER AS low_count
FROM planner_tasks pt
LEFT JOIN planner_statuses ps ON pt.status_id = ps.id
WHERE pt.deleted_at IS NULL;

-- VIEW 2: planner_dashboard_status_distribution
-- Task counts by status for donut chart
CREATE OR REPLACE VIEW planner_dashboard_status_distribution AS
SELECT
  ps.id AS status_id,
  ps.name AS status_name,
  ps.slug AS status_slug,
  ps.color AS status_color,
  ps.position,
  COUNT(pt.id)::INTEGER AS task_count,
  ROUND(
    (COUNT(pt.id)::NUMERIC / NULLIF((SELECT COUNT(*) FROM planner_tasks WHERE deleted_at IS NULL), 0)) * 100,
    1
  ) AS percentage
FROM planner_statuses ps
LEFT JOIN planner_tasks pt ON pt.status_id = ps.id AND pt.deleted_at IS NULL
GROUP BY ps.id, ps.name, ps.slug, ps.color, ps.position
ORDER BY ps.position;

-- VIEW 3: planner_dashboard_workstream_health
-- Completion percentage per workstream with health status
CREATE OR REPLACE VIEW planner_dashboard_workstream_health AS
SELECT
  w.id AS workstream_id,
  w.name AS workstream_name,
  w.slug AS workstream_slug,
  w.color AS workstream_color,
  COUNT(pt.id)::INTEGER AS total_tasks,
  COUNT(pt.id) FILTER (WHERE ps.is_completed_status = true)::INTEGER AS completed_tasks,
  COUNT(pt.id) FILTER (
    WHERE pt.due_date < CURRENT_DATE 
    AND ps.is_completed_status = false
  )::INTEGER AS overdue_tasks,
  CASE 
    WHEN COUNT(pt.id) = 0 THEN 0
    ELSE ROUND(
      (COUNT(pt.id) FILTER (WHERE ps.is_completed_status = true)::NUMERIC / COUNT(pt.id)) * 100
    )
  END AS completion_percentage,
  CASE
    WHEN COUNT(pt.id) FILTER (
      WHERE pt.due_date < CURRENT_DATE 
      AND ps.is_completed_status = false
    ) >= 3 THEN 'critical'
    WHEN COUNT(pt.id) FILTER (
      WHERE pt.due_date < CURRENT_DATE 
      AND ps.is_completed_status = false
    ) >= 1 THEN 'at-risk'
    ELSE 'on-track'
  END AS health_status
FROM planner_workstreams w
LEFT JOIN planner_tasks pt ON pt.workstream_id = w.id AND pt.deleted_at IS NULL
LEFT JOIN planner_statuses ps ON pt.status_id = ps.id
WHERE w.is_active = true
GROUP BY w.id, w.name, w.slug, w.color
ORDER BY completion_percentage DESC;

-- VIEW 4: planner_dashboard_upcoming_deadlines
-- Tasks due in next 7 days with due status
CREATE OR REPLACE VIEW planner_dashboard_upcoming_deadlines AS
SELECT
  pt.id,
  pt.key,
  pt.title,
  pt.due_date,
  pt.priority,
  ps.name AS status_name,
  ps.slug AS status_slug,
  ps.color AS status_color,
  w.name AS workstream_name,
  w.slug AS workstream_slug,
  w.color AS workstream_color,
  p.full_name AS assignee_name,
  p.avatar_url AS assignee_avatar,
  CASE
    WHEN pt.due_date < CURRENT_DATE THEN 'overdue'
    WHEN pt.due_date = CURRENT_DATE THEN 'today'
    WHEN pt.due_date = CURRENT_DATE + 1 THEN 'tomorrow'
    ELSE 'upcoming'
  END AS due_status,
  pt.due_date - CURRENT_DATE AS days_until_due
FROM planner_tasks pt
JOIN planner_statuses ps ON pt.status_id = ps.id
LEFT JOIN planner_workstreams w ON pt.workstream_id = w.id
LEFT JOIN profiles p ON pt.assignee_id = p.id
WHERE ps.is_completed_status = false
  AND pt.due_date IS NOT NULL
  AND pt.due_date <= CURRENT_DATE + 7
  AND pt.deleted_at IS NULL
ORDER BY pt.due_date, pt.priority DESC;

-- VIEW 5: planner_dashboard_team_workload
-- Task count per assignee with workload status
CREATE OR REPLACE VIEW planner_dashboard_team_workload AS
SELECT
  p.id AS profile_id,
  p.full_name,
  p.avatar_url,
  COUNT(pt.id)::INTEGER AS assigned_tasks,
  COUNT(pt.id) FILTER (WHERE ps.slug = 'progress')::INTEGER AS in_progress_count,
  COUNT(pt.id) FILTER (
    WHERE pt.due_date < CURRENT_DATE 
    AND ps.is_completed_status = false
  )::INTEGER AS overdue_count,
  CASE
    WHEN COUNT(pt.id) > 20 THEN 'overloaded'
    WHEN COUNT(pt.id) > 10 THEN 'busy'
    ELSE 'available'
  END AS workload_status
FROM profiles p
LEFT JOIN planner_tasks pt ON pt.assignee_id = p.id AND pt.deleted_at IS NULL
LEFT JOIN planner_statuses ps ON pt.status_id = ps.id
WHERE (ps.is_completed_status = false OR pt.id IS NULL)
GROUP BY p.id, p.full_name, p.avatar_url
HAVING COUNT(pt.id) > 0
ORDER BY assigned_tasks DESC;

-- VIEW 6: planner_board_columns
-- Column configuration with task counts
CREATE OR REPLACE VIEW planner_board_columns AS
SELECT
  ps.id,
  ps.name,
  ps.slug,
  ps.color,
  ps.position,
  ps.is_completed_status,
  COUNT(pt.id)::INTEGER AS task_count
FROM planner_statuses ps
LEFT JOIN planner_tasks pt ON pt.status_id = ps.id AND pt.deleted_at IS NULL
GROUP BY ps.id, ps.name, ps.slug, ps.color, ps.position, ps.is_completed_status
ORDER BY ps.position;

-- VIEW 7: planner_board_tasks
-- Tasks with all related data for Kanban cards
CREATE OR REPLACE VIEW planner_board_tasks AS
SELECT
  pt.id,
  pt.key,
  pt.title,
  pt.description,
  pt.priority,
  pt.due_date,
  pt.progress,
  pt.position,
  pt.blocked,
  pt.blocked_reason,
  pt.created_at,
  pt.updated_at,
  ps.id AS status_id,
  ps.name AS status_name,
  ps.slug AS status_slug,
  ps.color AS status_color,
  ps.position AS status_position,
  ps.is_completed_status,
  w.id AS workstream_id,
  w.name AS workstream_name,
  w.slug AS workstream_slug,
  w.color AS workstream_color,
  p.id AS assignee_id,
  p.full_name AS assignee_name,
  p.avatar_url AS assignee_avatar,
  CASE
    WHEN pt.due_date < CURRENT_DATE AND ps.is_completed_status = false THEN 'overdue'
    WHEN pt.due_date = CURRENT_DATE THEN 'today'
    WHEN pt.due_date = CURRENT_DATE + 1 THEN 'tomorrow'
    WHEN pt.due_date IS NOT NULL THEN 'upcoming'
    ELSE NULL
  END AS due_status,
  CASE
    WHEN pt.due_date IS NOT NULL THEN pt.due_date - CURRENT_DATE
    ELSE NULL
  END AS days_until_due
FROM planner_tasks pt
JOIN planner_statuses ps ON pt.status_id = ps.id
LEFT JOIN planner_workstreams w ON pt.workstream_id = w.id
LEFT JOIN profiles p ON pt.assignee_id = p.id
WHERE pt.deleted_at IS NULL
ORDER BY ps.position, pt.position, pt.created_at DESC;

-- FUNCTION: get_unassigned_task_count
CREATE OR REPLACE FUNCTION get_unassigned_task_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM planner_tasks pt
  JOIN planner_statuses ps ON pt.status_id = ps.id
  WHERE pt.assignee_id IS NULL
    AND ps.is_completed_status = false
    AND pt.deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;