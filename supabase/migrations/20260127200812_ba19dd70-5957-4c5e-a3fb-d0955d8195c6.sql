
-- Drop and recreate the planner_dashboard_team_workload view to show ALL approved users
DROP VIEW IF EXISTS planner_dashboard_team_workload;

CREATE VIEW planner_dashboard_team_workload AS
SELECT 
    p.id AS profile_id,
    p.full_name,
    p.avatar_url,
    p.email,
    count(t.id)::integer AS total_tasks,
    count(t.id)::integer AS assigned_tasks,
    count(t.id) FILTER (WHERE s.is_done = false)::integer AS active_tasks,
    count(t.id) FILTER (WHERE s.slug = 'progress')::integer AS in_progress_count,
    count(t.id) FILTER (WHERE s.is_done = true)::integer AS completed_tasks,
    count(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND s.is_done = false)::integer AS overdue_tasks,
    count(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND s.is_done = false)::integer AS overdue_count,
    CASE
        WHEN count(t.id) FILTER (WHERE s.is_done = false) > 10 THEN 'overloaded'
        WHEN count(t.id) FILTER (WHERE s.is_done = false) > 5 THEN 'busy'
        ELSE 'available'
    END AS workload_status
FROM profiles p
LEFT JOIN planner_tasks t ON t.assignee_id = p.id AND t.deleted_at IS NULL
LEFT JOIN planner_statuses s ON t.status_id = s.id
WHERE p.approval_status = 'APPROVED'
GROUP BY p.id, p.full_name, p.avatar_url, p.email
ORDER BY count(t.id) FILTER (WHERE s.is_done = false) DESC, p.full_name ASC;
