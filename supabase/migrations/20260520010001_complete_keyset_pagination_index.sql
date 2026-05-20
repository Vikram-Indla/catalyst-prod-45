-- Complete the keyset pagination composite index with issue_key tie-breaker
-- Drop incomplete index and recreate with full (project_key, jira_updated_at DESC, issue_key DESC)

drop index if exists idx_ph_issues_project_updated_at;

create index idx_ph_issues_project_updated_at on ph_issues(project_key, jira_updated_at desc, issue_key desc);
