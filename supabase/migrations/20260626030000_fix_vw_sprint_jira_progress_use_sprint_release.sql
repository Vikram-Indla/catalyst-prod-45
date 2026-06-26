-- 2026-06-26: rewrite vw_sprint_jira_progress to read sprint linkage from
-- ph_issues.sprint_release JSONB (canonical Jira payload that persists
-- across syncs) instead of ph_issues.sprint_name (text column that
-- jira-sync wipes on every cycle — proven 2026-06-26: backfill of 710
-- rows reverted to 2 within minutes).

CREATE OR REPLACE VIEW public.vw_sprint_jira_progress
WITH (security_invoker = true) AS
WITH expanded AS (
  SELECT
    i.id                                 AS issue_id,
    i.status_category,
    i.assignee_account_id,
    i.project_key,
    el->>'name'                          AS sprint_name
  FROM public.ph_issues i
  CROSS JOIN LATERAL jsonb_array_elements(i.sprint_release) el
  WHERE i.sprint_release IS NOT NULL
    AND jsonb_typeof(i.sprint_release) = 'array'
    AND jsonb_array_length(i.sprint_release) > 0
    AND el->>'name' IS NOT NULL
    AND el->>'name' <> ''
),
sprint_stats AS (
  SELECT
    sprint_name,
    project_key,
    COUNT(*)                                                                        AS total_items,
    COUNT(*) FILTER (WHERE lower(status_category) = 'done')                         AS done_items,
    COUNT(*) FILTER (WHERE lower(status_category) IN ('in progress','in_progress')) AS in_progress_items,
    COUNT(*) FILTER (WHERE lower(status_category) IN ('in review','in_review'))     AS in_review_items,
    COUNT(*) FILTER (WHERE lower(status_category) = 'blocked')                      AS blocked_items,
    COUNT(*) FILTER (WHERE lower(status_category) IN ('to do','todo','to_do'))      AS todo_items,
    COUNT(DISTINCT assignee_account_id) FILTER (WHERE assignee_account_id IS NOT NULL) AS unique_assignees
  FROM expanded
  GROUP BY sprint_name, project_key
)
SELECT
  s.id                            AS sprint_id,
  s.id,
  s.project_id,
  s.name,
  s.title,
  s.description,
  s.status,
  s.start_date,
  s.target_date,
  s.actual_date,
  s.owner_user_id,
  s.color,
  COALESCE(st.total_items,       0) AS total_items,
  COALESCE(st.done_items,        0) AS done_items,
  COALESCE(st.in_progress_items, 0) AS in_progress_items,
  COALESCE(st.in_review_items,   0) AS in_review_items,
  COALESCE(st.blocked_items,     0) AS blocked_items,
  COALESCE(st.todo_items,        0) AS todo_items,
  CASE
    WHEN COALESCE(st.total_items, 0) > 0
      THEN ROUND( (COALESCE(st.done_items, 0)::numeric / st.total_items) * 100, 2 )
    ELSE 0
  END                              AS completion_percent,
  COALESCE(st.unique_assignees, 0) AS unique_assignees
FROM public.ph_jira_sprints s
LEFT JOIN public.ph_projects p ON p.id = s.project_id
LEFT JOIN sprint_stats st
  ON st.sprint_name = s.name
 AND (p.key IS NULL OR st.project_key = p.key);

GRANT SELECT ON public.vw_sprint_jira_progress TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
