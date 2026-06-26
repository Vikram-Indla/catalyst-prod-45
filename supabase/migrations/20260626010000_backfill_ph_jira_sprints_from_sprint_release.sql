-- 2026-06-26: Backfill ph_jira_sprints from existing sprint data hidden
-- inside ph_issues.sprint_release JSONB.
--
-- Detection rule: sprint_release entries with non-empty `id` are real
-- Jira sprints; entries with empty `id` are fix-version (release) entries.
-- See ph_issues sample rows 2026-06-26 — confirmed pattern.
--
-- Idempotent: NOT EXISTS guard on jira_sprint_id keeps repeat runs safe.
-- Also backfills ph_issues.sprint_name from the most recent sprint
-- (highest releaseDate) so the work navigator can filter by sprint.
--
-- Skips ph_issues rows with source='jira_parent_ref' to avoid the
-- existing validate_ph_issues_source() trigger (which only allows
-- 'catalyst'/'jira'); those rows are reference-only and never carry
-- sprint linkage anyway.

-- ─── 1. Insert sprints ──────────────────────────────────────────────────────

INSERT INTO public.ph_jira_sprints (
  name, title, project_id, target_date, release_date, status, jira_sprint_id
)
SELECT DISTINCT ON (el->>'id')
  el->>'name'                                AS name,
  el->>'name'                                AS title,
  p.id                                       AS project_id,
  NULLIF(el->>'releaseDate','')::date        AS target_date,
  NULLIF(el->>'releaseDate','')::date        AS release_date,
  CASE
    WHEN NULLIF(el->>'releaseDate','')::date < CURRENT_DATE THEN 'released'
    ELSE 'planning'
  END                                        AS status,
  el->>'id'                                  AS jira_sprint_id
FROM public.ph_issues i
JOIN public.ph_projects p ON p.key = i.project_key
CROSS JOIN LATERAL jsonb_array_elements(i.sprint_release) el
WHERE i.sprint_release IS NOT NULL
  AND jsonb_typeof(i.sprint_release) = 'array'
  AND el->>'id'   IS NOT NULL AND el->>'id'   <> ''
  AND NULLIF(el->>'releaseDate','') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ph_jira_sprints s
    WHERE s.jira_sprint_id = el->>'id'
  );

-- ─── 2. Backfill ph_issues.sprint_name ──────────────────────────────────────

UPDATE public.ph_issues i
SET sprint_name = sub.name
FROM (
  SELECT DISTINCT ON (i2.id)
    i2.id              AS issue_id,
    el->>'name'        AS name
  FROM public.ph_issues i2
  CROSS JOIN LATERAL jsonb_array_elements(i2.sprint_release) el
  WHERE i2.sprint_release IS NOT NULL
    AND jsonb_typeof(i2.sprint_release) = 'array'
    AND el->>'id' IS NOT NULL AND el->>'id' <> ''
    AND (i2.sprint_name IS NULL OR i2.sprint_name = '')
    AND i2.source IN ('catalyst','jira')
  ORDER BY i2.id, NULLIF(el->>'releaseDate','')::date DESC NULLS LAST
) sub
WHERE i.id = sub.issue_id;
