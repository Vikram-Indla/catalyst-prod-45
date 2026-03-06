
-- Drop the ra_jira_connections table entirely
DROP TABLE IF EXISTS ra_jira_connections;

-- Add priority and status columns to ra_jira_tickets
ALTER TABLE ra_jira_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE ra_jira_tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'To Do';
