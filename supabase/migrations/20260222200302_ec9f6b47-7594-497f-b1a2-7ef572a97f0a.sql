
-- Add jira_account_id to resource_inventory for linking to ph_issues
ALTER TABLE public.resource_inventory ADD COLUMN IF NOT EXISTS jira_account_id TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_resource_inventory_jira_account_id ON public.resource_inventory(jira_account_id);

-- Populate jira_account_id by matching display names from ph_issues
UPDATE public.resource_inventory ri
SET jira_account_id = sub.assignee_account_id
FROM (
  SELECT DISTINCT ON (assignee_display_name) assignee_display_name, assignee_account_id
  FROM public.ph_issues
  WHERE assignee_account_id IS NOT NULL AND assignee_display_name IS NOT NULL
  ORDER BY assignee_display_name, jira_updated_at DESC
) sub
WHERE ri.name = sub.assignee_display_name
  AND ri.jira_account_id IS NULL;
