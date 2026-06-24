-- Releases Management — Jira version sync support + live progress
-- 2026-06-23
--
-- 1. ph_releases.jira_version_id: idempotency key for Jira Project Versions sync.
--    Jira issues link to versions via ph_issues.sprint_release JSONB [{id,name,releaseDate}],
--    NOT via a release_id FK. jira_version_id stores the Jira version id ("12236") so
--    progress can be matched back to ph_issues.sprint_release[].id.
-- 2. vw_release_jira_progress: live progress per Jira version id, computed from
--    ph_issues.sprint_release JSONB. The legacy vw_ph_release_progress joins
--    ph_work_items.release_id which is empty for Jira-synced data.

ALTER TABLE public.ph_releases
  ADD COLUMN IF NOT EXISTS jira_version_id text;

-- Jira versions may have no release date; do not fabricate one (zero-assumption rule).
ALTER TABLE public.ph_releases ALTER COLUMN target_date DROP NOT NULL;

-- Full (non-partial) unique index so supabase-js upsert onConflict works.
-- NULLs are distinct by default, so manually-created releases (null jira_version_id) remain allowed.
DROP INDEX IF EXISTS public.ph_releases_project_jira_version_uniq;
CREATE UNIQUE INDEX ph_releases_project_jira_version_uniq
  ON public.ph_releases (project_id, jira_version_id);

CREATE OR REPLACE VIEW public.vw_release_jira_progress AS
WITH exploded AS (
  SELECT
    i.project_key,
    (v ->> 'id')   AS version_id,
    i.status_category
  FROM public.ph_issues i,
       LATERAL jsonb_array_elements(i.sprint_release) v
  WHERE jsonb_typeof(i.sprint_release) = 'array'
    AND (v ->> 'id') IS NOT NULL
)
SELECT
  version_id,
  project_key,
  count(*)::int                                                           AS total,
  count(*) FILTER (WHERE status_category = 'Done')::int                   AS done,
  count(*) FILTER (WHERE status_category = 'In Progress')::int            AS in_progress,
  count(*) FILTER (
    WHERE status_category IS DISTINCT FROM 'Done'
      AND status_category IS DISTINCT FROM 'In Progress'
  )::int                                                                  AS todo,
  CASE WHEN count(*) > 0
       THEN round(100.0 * count(*) FILTER (WHERE status_category = 'Done') / count(*))::int
       ELSE 0 END                                                         AS done_percent,
  CASE WHEN count(*) > 0
       THEN round(100.0 * count(*) FILTER (WHERE status_category = 'In Progress') / count(*))::int
       ELSE 0 END                                                         AS in_progress_percent
FROM exploded
GROUP BY version_id, project_key;

GRANT SELECT ON public.vw_release_jira_progress TO anon, authenticated;
