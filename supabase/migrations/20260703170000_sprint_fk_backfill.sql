-- CAT-SPRINTS-NATIVE-20260702-002 S0.2a: ph_issues.sprint_id FK backfill + vw_sprint_jira_progress repoint.
-- D-002: membership moves to sprint_id FK (sole read path going forward). sprint_release/sprint_name
-- columns stay populated untouched — S0.2b repoints the 21 blast-radius app-code readers.
-- D-014: on the 2 issues whose sprint_release array matches two different sprints (item moved sprints),
-- the last array element wins (most recent assignment).

BEGIN;

ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.ph_jira_sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ph_issues_sprint_id ON public.ph_issues(sprint_id);

DO $$
DECLARE
  expected_count bigint;
  matched_count bigint;
BEGIN
  SELECT count(DISTINCT e.id) INTO expected_count
  FROM (
    SELECT i2.id, i2.project_key, el.value->>'name' AS sname
    FROM public.ph_issues i2
    CROSS JOIN LATERAL jsonb_array_elements(i2.sprint_release) el(value)
    WHERE i2.sprint_release IS NOT NULL AND jsonb_typeof(i2.sprint_release) = 'array'
  ) e
  JOIN public.ph_jira_sprints s ON s.name = e.sname
  JOIN public.ph_projects p ON p.id = s.project_id AND p.key = e.project_key;

  UPDATE public.ph_issues i
  SET sprint_id = pick.sprint_id
  FROM (
    SELECT DISTINCT ON (e.id) e.id, s.id AS sprint_id
    FROM (
      SELECT i2.id, i2.project_key, el.value->>'name' AS sname, el.ord
      FROM public.ph_issues i2
      CROSS JOIN LATERAL jsonb_array_elements(i2.sprint_release) WITH ORDINALITY el(value, ord)
      WHERE i2.sprint_release IS NOT NULL AND jsonb_typeof(i2.sprint_release) = 'array'
    ) e
    JOIN public.ph_jira_sprints s ON s.name = e.sname
    JOIN public.ph_projects p ON p.id = s.project_id AND p.key = e.project_key
    ORDER BY e.id, e.ord DESC
  ) pick
  WHERE i.id = pick.id;

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count != expected_count THEN
    RAISE EXCEPTION 'sprint_id backfill mismatch: matched % rows, expected %', matched_count, expected_count;
  END IF;

  RAISE NOTICE 'sprint_id backfill: % of % ph_issues rows matched', matched_count, expected_count;
END $$;

-- Repoint vw_sprint_jira_progress: sprint_id FK instead of name+project_key match.
-- Output column contract identical to prior definition (verified live via pg_get_viewdef
-- before this migration was written) so useEntityProgress(SPRINT_CONFIG) consumers are untouched.
CREATE OR REPLACE VIEW public.vw_sprint_jira_progress AS
WITH sprint_stats AS (
  SELECT
    i.sprint_id,
    count(*) AS total_items,
    count(*) FILTER (WHERE lower(i.status_category) = 'done') AS done_items,
    count(*) FILTER (WHERE lower(i.status_category) IN ('in progress','in_progress')) AS in_progress_items,
    count(*) FILTER (WHERE lower(i.status_category) IN ('in review','in_review')) AS in_review_items,
    count(*) FILTER (WHERE lower(i.status_category) = 'blocked') AS blocked_items,
    count(*) FILTER (WHERE lower(i.status_category) IN ('to do','todo','to_do')) AS todo_items,
    count(DISTINCT i.assignee_account_id) FILTER (WHERE i.assignee_account_id IS NOT NULL) AS unique_assignees
  FROM public.ph_issues i
  WHERE i.sprint_id IS NOT NULL
  GROUP BY i.sprint_id
)
SELECT
  s.id AS sprint_id,
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
  COALESCE(st.total_items, 0) AS total_items,
  COALESCE(st.done_items, 0) AS done_items,
  COALESCE(st.in_progress_items, 0) AS in_progress_items,
  COALESCE(st.in_review_items, 0) AS in_review_items,
  COALESCE(st.blocked_items, 0) AS blocked_items,
  COALESCE(st.todo_items, 0) AS todo_items,
  CASE WHEN COALESCE(st.total_items,0) > 0
       THEN round(COALESCE(st.done_items,0)::numeric / st.total_items::numeric * 100, 2)
       ELSE 0::numeric END AS completion_percent,
  COALESCE(st.unique_assignees, 0) AS unique_assignees
FROM public.ph_jira_sprints s
LEFT JOIN sprint_stats st ON st.sprint_id = s.id;

COMMIT;
