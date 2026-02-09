
ALTER TABLE public.wh_jira_connection ADD COLUMN IF NOT EXISTS total_issue_count integer DEFAULT 0;
ALTER TABLE public.wh_jira_connection ADD COLUMN IF NOT EXISTS total_version_count integer DEFAULT 0;
