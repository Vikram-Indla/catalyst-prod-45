
-- Single function returning all distinct filter options for work items page
CREATE OR REPLACE FUNCTION fn_ph_work_item_filters()
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'issue_types', (SELECT coalesce(jsonb_agg(DISTINCT issue_type ORDER BY issue_type), '[]'::jsonb) FROM ph_issues),
    'statuses', (SELECT coalesce(jsonb_agg(DISTINCT status ORDER BY status), '[]'::jsonb) FROM ph_issues),
    'project_keys', (SELECT coalesce(jsonb_agg(DISTINCT project_key ORDER BY project_key), '[]'::jsonb) FROM ph_issues),
    'fix_versions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', v->>'name', 'releaseDate', v->>'releaseDate') ORDER BY v->>'releaseDate' DESC NULLS LAST, v->>'name'), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (v->>'name') v
        FROM ph_issues i, jsonb_array_elements(i.fix_versions) AS v
        WHERE i.fix_versions IS NOT NULL AND jsonb_array_length(i.fix_versions) > 0 AND v->>'name' IS NOT NULL
        ORDER BY v->>'name', v->>'releaseDate' DESC NULLS LAST
      ) sub
    )
  );
$$;
