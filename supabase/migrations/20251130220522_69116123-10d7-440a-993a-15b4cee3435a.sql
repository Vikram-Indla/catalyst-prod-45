-- Add sync_settings column to jira_connections table
ALTER TABLE public.jira_connections
ADD COLUMN IF NOT EXISTS sync_settings jsonb DEFAULT '{
  "auto_sync_enabled": false,
  "sync_interval_minutes": 15,
  "sync_direction": "bidirectional",
  "conflict_resolution": "jira_wins",
  "sync_attachments": true,
  "sync_comments": true,
  "sync_work_logs": false
}'::jsonb;