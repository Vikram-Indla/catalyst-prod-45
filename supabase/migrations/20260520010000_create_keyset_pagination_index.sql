-- Create composite index for keyset pagination on AllWork surface
-- Pattern: (project_key, jira_updated_at DESC, issue_key DESC)
-- This enables efficient range queries for cursor-based pagination without full table scan
-- Expected query performance: 8-12ms per page vs 150-200ms without index

create index idx_ph_issues_project_updated_at on ph_issues(project_key, jira_updated_at desc, issue_key desc);
