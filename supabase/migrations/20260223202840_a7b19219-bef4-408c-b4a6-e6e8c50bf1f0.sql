
DROP VIEW IF EXISTS public.vw_wh_resource_360;

CREATE VIEW public.vw_wh_resource_360 AS
SELECT
  ri.rid               AS resource_id,
  ri.name              AS resource_name,
  COALESCE(p.email, '') AS resource_email,
  ri.role_name         AS job_role,
  ri.department_name   AS department,
  p.avatar_url         AS avatar_url,

  phi.issue_key        AS work_item_id,
  phi.issue_key        AS item_key,
  phi.summary          AS title,
  phi.issue_type       AS item_type,
  phi.status           AS status,
  COALESCE(phi.status_category, 'To Do') AS status_category,
  phi.priority         AS priority,
  'ProjectHub'         AS hub,
  phi.jira_created_at  AS item_created_at,

  phi.jira_created_at  AS assigned_at,
  'Assignee'           AS role_on_item,
  100                  AS allocation_percent,
  GREATEST(0, EXTRACT(DAY FROM now() - phi.jira_created_at)::int) AS age_days,

  phi.project_name     AS project_name,
  phi.project_key      AS project_key,

  COALESCE((phi.fix_versions->0->>'name'), phi.sprint_name) AS release_name,
  phi.effective_due_date AS release_end_date,
  NULL::text           AS release_status,

  phi.parent_key       AS parent_id,
  phi.parent_key       AS parent_key,
  phi.parent_summary   AS parent_title,
  NULL::text           AS parent_type,
  NULL::text           AS parent_status,
  NULL::text           AS parent_hub,

  phi.reporter_display_name AS assigner_name,

  '[]'::jsonb          AS status_transitions,
  GREATEST(0, EXTRACT(DAY FROM now() - phi.jira_created_at)::int) AS total_cycle_days

FROM resource_inventory ri
JOIN profiles p ON p.id = ri.profile_id
JOIN ph_issues phi ON phi.assignee_account_id = ri.jira_account_id
WHERE ri.is_active = true
  AND ri.jira_account_id IS NOT NULL;
