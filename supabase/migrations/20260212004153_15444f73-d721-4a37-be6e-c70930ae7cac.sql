
-- Server-side function to aggregate release stats from ph_issues fix_versions
-- Replaces the slow client-side batched approach

CREATE OR REPLACE FUNCTION fn_ph_release_summary()
RETURNS TABLE (
  version_name text,
  release_date text,
  total_items bigint,
  done_items bigint,
  in_progress_items bigint,
  in_review_items bigint,
  blocked_items bigint,
  todo_items bigint,
  completion_percent integer,
  projects text[],
  assignees jsonb
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH exploded AS (
    SELECT
      v->>'name' AS version_name,
      v->>'releaseDate' AS release_date,
      i.project_key,
      lower(i.status) AS status_lower,
      lower(i.status_category) AS cat_lower,
      i.assignee_account_id,
      i.assignee_display_name
    FROM ph_issues i,
         jsonb_array_elements(i.fix_versions) AS v
    WHERE i.fix_versions IS NOT NULL
      AND jsonb_array_length(i.fix_versions) > 0
      AND v->>'name' IS NOT NULL
  ),
  agg AS (
    SELECT
      e.version_name,
      max(e.release_date) AS release_date,
      count(*) AS total_items,
      count(*) FILTER (WHERE e.cat_lower = 'done') AS done_items,
      count(*) FILTER (WHERE e.cat_lower != 'done' AND e.status_lower != 'blocked'
        AND e.status_lower NOT IN ('in review','technical validation','ready for qa','ready for uat')
        AND (e.cat_lower = 'in progress' OR e.status_lower IN ('in progress','in development','in beta'))
      ) AS in_progress_items,
      count(*) FILTER (WHERE e.cat_lower != 'done' AND e.status_lower != 'blocked'
        AND e.status_lower IN ('in review','technical validation','ready for qa','ready for uat')
      ) AS in_review_items,
      count(*) FILTER (WHERE e.cat_lower != 'done' AND e.status_lower = 'blocked') AS blocked_items,
      count(*) FILTER (WHERE e.cat_lower != 'done' AND e.status_lower != 'blocked'
        AND e.status_lower NOT IN ('in review','technical validation','ready for qa','ready for uat')
        AND e.cat_lower != 'in progress'
        AND e.status_lower NOT IN ('in progress','in development','in beta')
      ) AS todo_items,
      array_agg(DISTINCT e.project_key ORDER BY e.project_key) AS projects
    FROM exploded e
    GROUP BY e.version_name
  ),
  assignee_agg AS (
    SELECT
      e.version_name,
      jsonb_agg(DISTINCT jsonb_build_object(
        'accountId', e.assignee_account_id,
        'displayName', e.assignee_display_name,
        'avatarUrl', COALESCE(p.avatar_url, um.jira_avatar_url),
        'roleName', ri.role_name
      )) AS assignees
    FROM exploded e
    LEFT JOIN ph_user_mapping um ON um.jira_account_id = e.assignee_account_id
    LEFT JOIN profiles p ON p.id = um.catalyst_profile_id
    LEFT JOIN resource_inventory ri ON ri.profile_id = um.catalyst_profile_id
    WHERE e.assignee_account_id IS NOT NULL
    GROUP BY e.version_name
  )
  SELECT
    a.version_name,
    a.release_date,
    a.total_items,
    a.done_items,
    a.in_progress_items,
    a.in_review_items,
    a.blocked_items,
    a.todo_items,
    CASE WHEN a.total_items > 0 THEN (a.done_items * 100 / a.total_items)::integer ELSE 0 END AS completion_percent,
    a.projects,
    COALESCE(aa.assignees, '[]'::jsonb) AS assignees
  FROM agg a
  LEFT JOIN assignee_agg aa ON aa.version_name = a.version_name
  ORDER BY a.release_date DESC NULLS LAST, a.version_name;
$$;
