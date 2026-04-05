
-- Add Jira sync columns to tm_defects
ALTER TABLE public.tm_defects
  ADD COLUMN IF NOT EXISTS jira_key VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_source BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jira_project_key VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_status VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_status_category VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_assignee_name VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_reporter_name VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_resolution VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS jira_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS jira_parent_key VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_story_points NUMERIC,
  ADD COLUMN IF NOT EXISTS jira_sprint_name VARCHAR,
  ADD COLUMN IF NOT EXISTS jira_components TEXT[],
  ADD COLUMN IF NOT EXISTS jira_fix_versions JSONB;

-- Unique index on jira_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_defects_jira_key
  ON public.tm_defects (jira_key) WHERE jira_key IS NOT NULL;

-- Helper function
CREATE OR REPLACE FUNCTION public.next_defect_key()
RETURNS VARCHAR
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'DEF-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(defect_key FROM 5) AS INTEGER)), 0) + 1)::TEXT, 4, '0')
  FROM public.tm_defects;
$$;
