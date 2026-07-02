-- CAT-SPRINTS-NATIVE-20260702-002 S0.4: soft-purge the dead Jira-imported sprints.
-- 25 of the 26 legacy rows are Jira imports (jira_sprint_id NOT NULL), all
-- terminal (completed [pre-S0.3 'released'] / archived), zero in-flight. The
-- 26th ("Sprint 0.11", archived, jira_sprint_id NULL) is a Catalyst-created
-- test sprint — NOT a Jira import, so the discriminator correctly excludes it
-- (D-019; revises LOOP-006's "100% Jira imports" by one). Soft delete only —
-- hard DELETE is banned: it would CASCADE ph_sprint_approvers and SET NULL the
-- sprint_id references on stories/features/incidents/tm_* (history corruption).
-- Reversal: SET deleted_at = NULL.

BEGIN;

DO $$
DECLARE
  purged_count bigint;
BEGIN
  UPDATE public.ph_jira_sprints
  SET deleted_at = now()
  WHERE deleted_at IS NULL
    AND status IN ('completed', 'archived')
    AND jira_sprint_id IS NOT NULL;

  GET DIAGNOSTICS purged_count = ROW_COUNT;

  IF purged_count != 25 THEN
    RAISE EXCEPTION 'sprint purge expected 25 rows, matched %', purged_count;
  END IF;

  RAISE NOTICE 'soft-purged % dead Jira sprints', purged_count;
END $$;

-- Purged sprints must drop out of every read path: the list hook filters
-- deleted_at client-side; the progress view filters here.
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
LEFT JOIN sprint_stats st ON st.sprint_id = s.id
WHERE s.deleted_at IS NULL;

COMMIT;
