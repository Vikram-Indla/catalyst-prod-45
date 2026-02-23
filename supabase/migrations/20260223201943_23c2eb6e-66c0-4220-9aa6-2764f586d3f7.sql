
-- View: vw_wh_resource_360 — one row per work item assigned to a resource
CREATE OR REPLACE VIEW public.vw_wh_resource_360 AS
SELECT
  ri.rid               AS resource_id,
  ri.name              AS resource_name,
  COALESCE(p.email, '')  AS resource_email,
  ri.role_name         AS job_role,
  ri.department_name   AS department,
  p.avatar_url         AS avatar_url,

  -- Work item
  phi.issue_key        AS work_item_id,
  phi.issue_key        AS item_key,
  phi.summary          AS title,
  phi.issue_type       AS item_type,
  phi.status           AS status,
  phi.priority         AS priority,
  'ProjectHub'         AS hub,
  phi.jira_created_at  AS item_created_at,

  -- Assignment
  phi.jira_created_at  AS assigned_at,
  'Assignee'           AS role_on_item,
  100                  AS allocation_percent,
  GREATEST(0, EXTRACT(DAY FROM now() - phi.jira_created_at)::int) AS age_days,

  -- Project
  phi.project_name     AS project_name,
  phi.project_key      AS project_key,

  -- Release
  COALESCE(
    (phi.fix_versions->0->>'name'),
    phi.sprint_name
  )                    AS release_name,
  phi.effective_due_date AS release_end_date,
  NULL::text           AS release_status,

  -- Parent
  phi.parent_key       AS parent_id,
  phi.parent_key       AS parent_key,
  phi.parent_summary   AS parent_title,
  NULL::text           AS parent_type,
  NULL::text           AS parent_status,
  NULL::text           AS parent_hub,

  -- Assigner
  phi.reporter_display_name AS assigner_name,

  -- Transitions (extract from changelog if available, else empty)
  '[]'::jsonb          AS status_transitions,
  GREATEST(0, EXTRACT(DAY FROM now() - phi.jira_created_at)::int) AS total_cycle_days

FROM resource_inventory ri
JOIN profiles p ON p.id = ri.profile_id
JOIN ph_issues phi ON phi.assignee_account_id = ri.jira_account_id
WHERE ri.is_active = true
  AND ri.jira_account_id IS NOT NULL;

-- View: vw_wh_resource_360_summary — aggregated stats per resource
CREATE OR REPLACE VIEW public.vw_wh_resource_360_summary AS
SELECT
  ri.rid               AS resource_id,
  ri.name              AS name,
  COALESCE(p.email, '') AS email,
  ri.role_name         AS role,
  ri.department_name   AS department,
  p.avatar_url         AS avatar_url,
  COUNT(*)::int        AS total_items,
  COUNT(*) FILTER (WHERE phi.status_category = 'To Do')::int       AS todo_count,
  COUNT(*) FILTER (WHERE phi.status_category = 'In Progress')::int AS progress_count,
  COUNT(*) FILTER (WHERE phi.status_category = 'Done')::int        AS done_count,
  COUNT(DISTINCT phi.project_key)::int AS hub_count,
  COUNT(DISTINCT phi.project_key)::int AS project_count
FROM resource_inventory ri
JOIN profiles p ON p.id = ri.profile_id
JOIN ph_issues phi ON phi.assignee_account_id = ri.jira_account_id
WHERE ri.is_active = true
  AND ri.jira_account_id IS NOT NULL
GROUP BY ri.rid, ri.name, p.email, ri.role_name, ri.department_name, p.avatar_url;

-- Function: fn_resource_360_siblings — get sibling issues (same parent)
CREATE OR REPLACE FUNCTION public.fn_resource_360_siblings(p_work_item_id text)
RETURNS TABLE(
  id text,
  item_key text,
  title text,
  item_type text,
  status text,
  hub text,
  assigner_name text,
  age_days int
) LANGUAGE sql STABLE AS $$
  SELECT 
    phi.issue_key AS id,
    phi.issue_key AS item_key,
    phi.summary AS title,
    phi.issue_type AS item_type,
    phi.status AS status,
    'ProjectHub' AS hub,
    phi.reporter_display_name AS assigner_name,
    GREATEST(0, EXTRACT(DAY FROM now() - phi.jira_created_at)::int) AS age_days
  FROM ph_issues phi
  WHERE phi.parent_key = (
    SELECT parent_key FROM ph_issues WHERE issue_key = p_work_item_id LIMIT 1
  )
  AND phi.parent_key IS NOT NULL
  ORDER BY phi.jira_created_at DESC;
$$;
