
-- ============================================================
-- MY TASKS BUSINESS RULES - Part 3: Update Views
-- ============================================================

-- Drop views with CASCADE
DROP VIEW IF EXISTS planner_my_tasks_summary CASCADE;
DROP VIEW IF EXISTS planner_my_tasks CASCADE;

-- Recreate planner_my_tasks view with involvement logic
CREATE VIEW planner_my_tasks WITH (security_invoker=on) AS
SELECT DISTINCT ON (t.id)
  t.id,
  t.task_key,
  t.title,
  t.description,
  t.status_id,
  t.priority,
  t.workstream_id,
  t.assignee_id,
  t.created_by,
  t.reporter_id,
  t.reviewer_id,
  t.due_date,
  t.start_date,
  t.time_estimate_minutes,
  t.time_logged_minutes,
  t.parent_task_id,
  t.sort_order,
  t.is_archived,
  t.created_at,
  t.updated_at,
  t.completed_at,
  t.key,
  t.position,
  t.deleted_at,
  t.is_starred,
  t.blocked,
  t.blocked_reason,
  t.progress,
  t.cover_url,
  
  -- Status info
  s.name AS status_name,
  s.slug AS status_slug,
  s.color AS status_color,
  s.is_done AS status_is_done,
  
  -- Workstream info
  w.name AS workstream_name,
  w.slug AS workstream_slug,
  w.color AS workstream_color,
  
  -- Assignee info
  p_assignee.full_name AS assignee_name,
  p_assignee.avatar_url AS assignee_avatar,
  
  -- Creator info
  p_creator.full_name AS creator_name,
  
  -- Reporter info
  p_reporter.full_name AS reporter_name,
  
  -- Reviewer info
  p_reviewer.full_name AS reviewer_name,
  
  -- Involvement type (priority order: assignee > reviewer > creator > reporter > watcher > mentioned)
  CASE 
    WHEN t.assignee_id = auth.uid() THEN 'assignee'
    WHEN t.reviewer_id = auth.uid() THEN 'reviewer'
    WHEN t.created_by = auth.uid() THEN 'creator'
    WHEN t.reporter_id = auth.uid() THEN 'reporter'
    WHEN watcher.user_id IS NOT NULL THEN 'watcher'
    WHEN mention.user_id IS NOT NULL THEN 'mentioned'
    ELSE 'assignee'
  END AS involvement_type,
  
  -- Involvement priority for sorting
  CASE 
    WHEN t.assignee_id = auth.uid() THEN 1
    WHEN t.reviewer_id = auth.uid() THEN 2
    WHEN t.created_by = auth.uid() THEN 3
    WHEN t.reporter_id = auth.uid() THEN 4
    WHEN watcher.user_id IS NOT NULL THEN 5
    WHEN mention.user_id IS NOT NULL THEN 6
    ELSE 1
  END AS involvement_priority,
  
  -- Time section for grouping
  CASE 
    WHEN t.completed_at IS NOT NULL THEN 'completed'
    WHEN t.due_date < CURRENT_DATE THEN 'overdue'
    WHEN t.due_date = CURRENT_DATE THEN 'today'
    WHEN t.due_date <= CURRENT_DATE + 7 THEN 'this_week'
    WHEN t.due_date IS NOT NULL THEN 'upcoming'
    ELSE 'someday'
  END AS time_section

FROM planner_tasks t
LEFT JOIN planner_statuses s ON s.id = t.status_id
LEFT JOIN planner_workstreams w ON w.id = t.workstream_id
LEFT JOIN profiles p_assignee ON p_assignee.id = t.assignee_id
LEFT JOIN profiles p_creator ON p_creator.id = t.created_by
LEFT JOIN profiles p_reporter ON p_reporter.id = t.reporter_id
LEFT JOIN profiles p_reviewer ON p_reviewer.id = t.reviewer_id
LEFT JOIN planner_task_watchers watcher ON watcher.task_id = t.id AND watcher.user_id = auth.uid()
LEFT JOIN planner_task_mentions mention ON mention.task_id = t.id AND mention.user_id = auth.uid()

WHERE t.deleted_at IS NULL
  AND t.is_archived IS NOT TRUE
  AND (
    t.assignee_id = auth.uid()
    OR t.created_by = auth.uid()
    OR t.reporter_id = auth.uid()
    OR t.reviewer_id = auth.uid()
    OR watcher.user_id IS NOT NULL
    OR mention.user_id IS NOT NULL
  )

ORDER BY 
  t.id,
  CASE 
    WHEN t.due_date < CURRENT_DATE THEN 0
    WHEN t.due_date = CURRENT_DATE THEN 1
    WHEN t.due_date <= CURRENT_DATE + 7 THEN 2
    ELSE 3
  END,
  CASE 
    WHEN t.assignee_id = auth.uid() THEN 1
    WHEN t.reviewer_id = auth.uid() THEN 2
    WHEN t.created_by = auth.uid() THEN 3
    WHEN t.reporter_id = auth.uid() THEN 4
    ELSE 5
  END,
  t.due_date ASC NULLS LAST,
  t.sort_order ASC;

-- Recreate planner_my_tasks_summary view
CREATE VIEW planner_my_tasks_summary WITH (security_invoker=on) AS
WITH user_tasks AS (
  SELECT 
    t.id,
    t.assignee_id,
    t.created_by,
    t.reporter_id,
    t.reviewer_id,
    t.due_date,
    t.completed_at,
    watcher.user_id IS NOT NULL AS is_watcher,
    mention.user_id IS NOT NULL AS is_mentioned,
    CASE 
      WHEN t.assignee_id = auth.uid() THEN 'assignee'
      WHEN t.reviewer_id = auth.uid() THEN 'reviewer'
      WHEN t.created_by = auth.uid() THEN 'creator'
      WHEN t.reporter_id = auth.uid() THEN 'reporter'
      ELSE 'other'
    END AS direct_involvement
  FROM planner_tasks t
  LEFT JOIN planner_task_watchers watcher ON watcher.task_id = t.id AND watcher.user_id = auth.uid()
  LEFT JOIN planner_task_mentions mention ON mention.task_id = t.id AND mention.user_id = auth.uid()
  WHERE t.deleted_at IS NULL
    AND t.is_archived IS NOT TRUE
    AND (
      t.assignee_id = auth.uid()
      OR t.created_by = auth.uid()
      OR t.reporter_id = auth.uid()
      OR t.reviewer_id = auth.uid()
      OR watcher.user_id IS NOT NULL
      OR mention.user_id IS NOT NULL
    )
)
SELECT
  auth.uid() AS user_id,
  COUNT(*) FILTER (WHERE completed_at IS NULL) AS total_tasks,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND due_date < CURRENT_DATE) AS overdue_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND due_date = CURRENT_DATE) AS today_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + 7) AS this_week_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND due_date > CURRENT_DATE + 7) AS upcoming_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND due_date IS NULL) AS someday_count,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND DATE(completed_at) = CURRENT_DATE) AS completed_today,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND direct_involvement = 'assignee') AS assigned_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND direct_involvement = 'creator') AS created_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND direct_involvement = 'reviewer') AS needs_review_count,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND is_watcher) AS watching_count
FROM user_tasks;
