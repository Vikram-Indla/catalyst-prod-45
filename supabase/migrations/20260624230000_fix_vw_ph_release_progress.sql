-- vw_ph_release_progress — aggregate work-item counts per release.
--
-- Link path discovered 2026-06-24:
--   ph_issues.sprint_release :: jsonb [{ id, name, releaseDate }]
--   ph_releases.title (or .name) MATCHES sprint_release[i].name
--
-- status_category distinct values seen in data: 'todo', 'To Do', 'Done',
-- 'In Progress'. Match case-insensitively.

DROP VIEW IF EXISTS public.vw_ph_release_progress CASCADE;

CREATE VIEW public.vw_ph_release_progress AS
WITH issue_release_link AS (
  SELECT
    i.id                  AS issue_id,
    i.status_category,
    i.assignee_account_id,
    i.project_key,
    i.sprint_name,
    el->>'name'           AS release_name
  FROM public.ph_issues i
  CROSS JOIN LATERAL jsonb_array_elements(i.sprint_release) el
  WHERE i.sprint_release IS NOT NULL
    AND jsonb_typeof(i.sprint_release) = 'array'
    AND jsonb_array_length(i.sprint_release) > 0
),
release_stats AS (
  SELECT
    release_name,
    COUNT(*)                                                                           AS total_items,
    COUNT(*) FILTER (WHERE lower(status_category) = 'done')                            AS done_items,
    COUNT(*) FILTER (WHERE lower(status_category) IN ('in progress','in_progress'))    AS in_progress_items,
    COUNT(*) FILTER (WHERE lower(status_category) IN ('in review','in_review'))        AS in_review_items,
    COUNT(*) FILTER (WHERE lower(status_category) = 'blocked')                         AS blocked_items,
    COUNT(*) FILTER (WHERE lower(status_category) IN ('to do','todo','to_do'))         AS todo_items,
    COUNT(DISTINCT assignee_account_id) FILTER (WHERE assignee_account_id IS NOT NULL) AS unique_assignees,
    COUNT(DISTINCT project_key)                                                        AS project_count,
    ARRAY_AGG(DISTINCT sprint_name) FILTER (WHERE sprint_name IS NOT NULL AND sprint_name <> '') AS sprint_names
  FROM issue_release_link
  GROUP BY release_name
)
SELECT
  r.id,
  r.project_id,
  r.name,
  r.title,
  r.description,
  r.status,
  r.start_date,
  r.target_date,
  r.actual_date,
  r.owner_user_id,
  r.color,
  COALESCE(s.total_items,       0) AS total_items,
  COALESCE(s.done_items,        0) AS done_items,
  COALESCE(s.in_progress_items, 0) AS in_progress_items,
  COALESCE(s.in_review_items,   0) AS in_review_items,
  COALESCE(s.blocked_items,     0) AS blocked_items,
  COALESCE(s.todo_items,        0) AS todo_items,
  CASE
    WHEN COALESCE(s.total_items, 0) > 0
      THEN ROUND( (COALESCE(s.done_items, 0)::numeric / s.total_items) * 100, 2 )
    ELSE 0
  END AS completion_percent,
  COALESCE(s.unique_assignees, 0) AS unique_assignees,
  COALESCE(s.project_count,    0) AS project_count,
  NULL::timestamptz               AS earliest_due,
  NULL::timestamptz               AS latest_due,
  COALESCE(s.sprint_names, ARRAY[]::text[]) AS sprint_names
FROM public.ph_releases r
LEFT JOIN release_stats s
  ON s.release_name = COALESCE(r.title, r.name);

GRANT SELECT ON public.vw_ph_release_progress TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
