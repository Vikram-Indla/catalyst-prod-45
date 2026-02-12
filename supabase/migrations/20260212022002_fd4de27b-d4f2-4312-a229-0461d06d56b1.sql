
-- Fix: use stable deterministic ID for unmapped users  
DROP VIEW IF EXISTS vw_ph_resource_utilization CASCADE;

CREATE OR REPLACE VIEW vw_ph_resource_utilization AS
WITH assignee_stats AS (
  SELECT
    i.assignee_account_id,
    i.assignee_display_name,
    COUNT(*) AS total_items,
    COUNT(*) FILTER (WHERE i.status_category NOT IN ('Done') AND i.status != 'Cancelled') AS active_items,
    COUNT(*) FILTER (WHERE i.status_category = 'Done') AS completed_items,
    COUNT(*) FILTER (WHERE i.status_category = 'In Progress') AS in_progress_items,
    COUNT(*) FILTER (WHERE i.status = 'Blocked') AS blocked_items,
    COALESCE(SUM(i.story_points) FILTER (WHERE i.status_category NOT IN ('Done') AND i.status != 'Cancelled'), 0) AS total_estimated_hours,
    COALESCE(SUM(i.story_points) FILTER (WHERE i.status_category = 'Done'), 0) AS total_actual_hours,
    COUNT(DISTINCT i.fix_versions) FILTER (WHERE i.fix_versions IS NOT NULL AND i.fix_versions != '[]') AS release_count,
    COUNT(DISTINCT i.theme_id) FILTER (WHERE i.theme_id IS NOT NULL) AS theme_count,
    MIN(i.due_date) FILTER (WHERE i.status_category NOT IN ('Done') AND i.status != 'Cancelled' AND i.due_date >= CURRENT_DATE) AS next_due_date
  FROM ph_issues i
  WHERE i.assignee_account_id IS NOT NULL
  GROUP BY i.assignee_account_id, i.assignee_display_name
)
SELECT
  COALESCE(m.catalyst_profile_id, uuid_generate_v5(uuid_ns_url(), s.assignee_account_id)) AS id,
  m.catalyst_profile_id AS user_id,
  s.assignee_account_id AS jira_account_id,
  COALESCE(p.full_name, m.jira_display_name, s.assignee_display_name) AS name,
  COALESCE(p.email, m.jira_email) AS email,
  COALESCE(ri.role_name, 'Team Member') AS role,
  COALESCE(ri.department_name, 'Unassigned') AS department,
  COALESCE(p.avatar_url, m.jira_avatar_url) AS avatar_url,
  CASE (abs(hashtext(COALESCE(p.full_name, s.assignee_display_name, ''))) % 8)
    WHEN 0 THEN '#2563eb'
    WHEN 1 THEN '#0d9488'
    WHEN 2 THEN '#7c3aed'
    WHEN 3 THEN '#d97706'
    WHEN 4 THEN '#ef4444'
    WHEN 5 THEN '#16a34a'
    WHEN 6 THEN '#be185d'
    WHEN 7 THEN '#92400e'
    ELSE '#2563eb'
  END AS color,
  NULL::text[] AS skills,
  40.0 AS capacity_hours_per_week,
  true AS is_active,
  s.total_items,
  s.active_items,
  s.completed_items,
  s.in_progress_items,
  s.blocked_items,
  s.total_estimated_hours,
  s.total_actual_hours,
  CASE WHEN s.total_items > 0 
    THEN ROUND(s.completed_items::numeric / s.total_items * 100, 1)
    ELSE 0 
  END AS utilization_percent,
  s.release_count,
  s.theme_count,
  s.next_due_date
FROM assignee_stats s
LEFT JOIN ph_user_mapping m ON m.jira_account_id = s.assignee_account_id AND m.is_mapped = true
LEFT JOIN profiles p ON p.id = m.catalyst_profile_id
LEFT JOIN resource_inventory ri ON ri.profile_id = m.catalyst_profile_id AND ri.is_active = true
ORDER BY s.total_items DESC;
