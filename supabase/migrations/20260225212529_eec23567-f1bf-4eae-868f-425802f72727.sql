
-- Drop and recreate the view to include contributor (reporter) items for non-developer roles
CREATE OR REPLACE VIEW vw_wh_resource_360 AS
-- Assignee-based items (existing logic — applies to ALL roles)
SELECT ri.rid AS resource_id,
    ri.name AS resource_name,
    COALESCE(p.email, '') AS resource_email,
    ri.role_name AS job_role,
    ri.department_name AS department,
    p.avatar_url,
    phi.issue_key AS work_item_id,
    phi.issue_key AS item_key,
    phi.summary AS title,
    phi.issue_type AS item_type,
    phi.status,
    COALESCE(phi.status_category, 'To Do') AS status_category,
    phi.priority,
    'ProjectHub'::text AS hub,
    phi.jira_created_at AS item_created_at,
    phi.jira_created_at AS assigned_at,
    'Assignee'::text AS role_on_item,
    100 AS allocation_percent,
    GREATEST(0, EXTRACT(day FROM (now() - phi.jira_created_at))::integer) AS age_days,
    phi.project_name,
    phi.project_key,
    COALESCE((phi.fix_versions -> 0 ->> 'name'), phi.sprint_name) AS release_name,
    phi.effective_due_date AS release_end_date,
    NULL::text AS release_status,
    phi.parent_key AS parent_id,
    phi.parent_key,
    phi.parent_summary AS parent_title,
    NULL::text AS parent_type,
    NULL::text AS parent_status,
    NULL::text AS parent_hub,
    phi.reporter_display_name AS assigner_name,
    '[]'::jsonb AS status_transitions,
    GREATEST(0, EXTRACT(day FROM (now() - phi.jira_created_at))::integer) AS total_cycle_days
FROM resource_inventory ri
JOIN profiles p ON p.id = ri.profile_id
JOIN ph_issues phi ON phi.assignee_account_id = ri.jira_account_id
WHERE ri.is_active = true AND ri.jira_account_id IS NOT NULL

UNION ALL

-- Contributor-based items (reporter) — only for non-developer roles
SELECT ri.rid AS resource_id,
    ri.name AS resource_name,
    COALESCE(p.email, '') AS resource_email,
    ri.role_name AS job_role,
    ri.department_name AS department,
    p.avatar_url,
    phi.issue_key AS work_item_id,
    phi.issue_key AS item_key,
    phi.summary AS title,
    phi.issue_type AS item_type,
    phi.status,
    COALESCE(phi.status_category, 'To Do') AS status_category,
    phi.priority,
    'ProjectHub'::text AS hub,
    phi.jira_created_at AS item_created_at,
    phi.jira_created_at AS assigned_at,
    'Contributor'::text AS role_on_item,
    0 AS allocation_percent,
    GREATEST(0, EXTRACT(day FROM (now() - phi.jira_created_at))::integer) AS age_days,
    phi.project_name,
    phi.project_key,
    COALESCE((phi.fix_versions -> 0 ->> 'name'), phi.sprint_name) AS release_name,
    phi.effective_due_date AS release_end_date,
    NULL::text AS release_status,
    phi.parent_key AS parent_id,
    phi.parent_key,
    phi.parent_summary AS parent_title,
    NULL::text AS parent_type,
    NULL::text AS parent_status,
    NULL::text AS parent_hub,
    phi.assignee_display_name AS assigner_name,
    '[]'::jsonb AS status_transitions,
    GREATEST(0, EXTRACT(day FROM (now() - phi.jira_created_at))::integer) AS total_cycle_days
FROM resource_inventory ri
JOIN profiles p ON p.id = ri.profile_id
JOIN ph_issues phi ON phi.reporter_account_id = ri.jira_account_id
WHERE ri.is_active = true 
  AND ri.jira_account_id IS NOT NULL
  -- Exclude developer roles — they only see assigned items
  AND LOWER(ri.role_name) NOT IN (
    '.net developer', '.net lead', 'backend architect', 'backend developer',
    'data engineer', 'database engineer', 'devops', 'infrastructure engineer',
    'mobile developer', 'n&s engineer', 'react developer', 'react lead',
    'service engineer', 'support engineer'
  )
  -- Exclude items where the person is ALSO the assignee (avoid duplicates)
  AND phi.assignee_account_id IS DISTINCT FROM ri.jira_account_id;
