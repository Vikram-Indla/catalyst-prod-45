-- Add unique index on jira_key for upsert support (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ph_work_items_jira_key_unique
ON public.ph_work_items (jira_key)
WHERE jira_key IS NOT NULL;