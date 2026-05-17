-- Populate ph_projects from ph_issues data.
--
-- The All Projects page queries v_project_list which unions from:
--   1. projects   (manually created)
--   2. ph_projects (Jira-synced via jira-sync-projects or this migration)
--
-- jira-sync-projects requires a live Jira API call. This migration derives
-- the same rows from ph_issues data already in the database, so projects
-- become visible immediately without a live connection.
--
-- Constraints:
--   ph_projects.key is VARCHAR(6), so only project_keys <= 6 chars are inserted.
--   ph_projects.created_by is NOT NULL; uses the first user profile found.
--   ph_jira_projects.name is preferred when available; falls back to the key.
--
-- Safe to re-run: INSERT ... WHERE NOT EXISTS skips already-present keys.

DO $$
DECLARE
  system_user_id uuid;
BEGIN
  -- Resolve a real user UUID to satisfy the NOT NULL FK on created_by.
  SELECT id INTO system_user_id FROM public.profiles LIMIT 1;

  IF system_user_id IS NULL THEN
    RAISE NOTICE 'No profiles found — skipping ph_projects backfill. Run after first user signs in.';
    RETURN;
  END IF;

  INSERT INTO public.ph_projects (
    key,
    name,
    description,
    department,
    status,
    health,
    is_archived,
    created_by,
    created_at,
    updated_at
  )
  SELECT
    i.project_key                                                   AS key,
    COALESCE(pjp.name, initcap(replace(i.project_key, '-', ' '))) AS name,
    COALESCE(pjp.description, '')                                   AS description,
    'Technology'                                                    AS department,
    'active'                                                        AS status,
    'on_track'                                                      AS health,
    false                                                           AS is_archived,
    system_user_id                                                  AS created_by,
    now()                                                           AS created_at,
    now()                                                           AS updated_at
  FROM (
    -- One row per unique project_key found in synced issues (2026 data, non-deleted)
    SELECT DISTINCT project_key
    FROM public.ph_issues
    WHERE project_key IS NOT NULL
      AND char_length(project_key) <= 6          -- ph_projects.key is VARCHAR(6)
      AND deleted_at IS NULL
      AND jira_removed_at IS NULL
      AND (
        EXTRACT(YEAR FROM jira_created_at) >= 2026
        OR EXTRACT(YEAR FROM jira_updated_at) >= 2026
      )
  ) i
  LEFT JOIN public.ph_jira_projects pjp
    ON pjp.project_key = i.project_key
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ph_projects p WHERE p.key = i.project_key
  );

  RAISE NOTICE 'ph_projects backfill complete. % rows inserted.',
    (SELECT count(*) FROM public.ph_projects);
END;
$$;
