-- Q6. wh_config — does BAU even appear in the sync allowlist?
-- Looking for: included_projects / sync_projects / sync_project_config['BAU']
SELECT
  key,
  CASE
    WHEN value IS NULL THEN 'NULL'
    WHEN jsonb_typeof(value::jsonb) IN ('object','array')
      THEN LEFT(value::text, 1500)
    ELSE value::text
  END AS value_preview,
  updated_at
FROM public.wh_config
WHERE key IN (
  'sync_projects',
  'included_projects',
  'sync_issue_types',
  'sync_fix_versions',
  'sync_project_config',
  'hierarchy_levels',
  'status_mapping'
)
ORDER BY key;
