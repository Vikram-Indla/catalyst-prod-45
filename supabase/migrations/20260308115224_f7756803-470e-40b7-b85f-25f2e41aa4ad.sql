
ALTER TABLE public.ph_initiatives 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'catalyst',
ADD COLUMN IF NOT EXISTS jira_issue_key text DEFAULT NULL;
