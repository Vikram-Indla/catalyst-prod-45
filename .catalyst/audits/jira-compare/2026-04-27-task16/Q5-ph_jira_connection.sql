-- Q5. ph_jira_connection — auth + connected state
-- Looking for: status='connected', non-stale tested_at, sane site_url + scope.
SELECT
  id,
  status,
  site_url,
  auth_email,
  auth_method,
  CASE WHEN auth_token_encrypted IS NULL OR auth_token_encrypted = '' THEN 'EMPTY'
       ELSE 'present (len=' || length(auth_token_encrypted) || ')' END AS token_state,
  CASE WHEN oauth_refresh_token_encrypted IS NULL OR oauth_refresh_token_encrypted = '' THEN 'EMPTY'
       ELSE 'present (len=' || length(oauth_refresh_token_encrypted) || ')' END AS refresh_token_state,
  jira_server_version,
  permissions_level,
  project_count,
  total_issue_count,
  total_version_count,
  created_at,
  updated_at,
  last_tested_at,
  last_test_result,
  LEFT(accessible_projects::text, 2000) AS accessible_projects_preview
FROM public.ph_jira_connection
LIMIT 5;
