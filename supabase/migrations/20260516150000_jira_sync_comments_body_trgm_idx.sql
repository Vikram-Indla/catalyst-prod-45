-- Performance: add trigram index so ilike '%@name%' mention lookups on
-- jira_sync_comments.body use GIN instead of a full sequential scan.
-- pg_trgm is already enabled (part of the bootstrap extension list).
-- CONCURRENTLY means this does not lock the table during index build.
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_jira_sync_comments_body_trgm
ON jira_sync_comments
USING gin(body gin_trgm_ops);
