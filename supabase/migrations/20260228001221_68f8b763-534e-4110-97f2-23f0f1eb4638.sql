
-- Table to store local hierarchy overrides on top of Jira-synced ph_issues
-- When a user drags an issue to a new parent, we record the override here.
-- The frontend merges these overrides with the Jira parent_key data.

CREATE TABLE public.ph_hierarchy_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_key TEXT NOT NULL,
  issue_key TEXT NOT NULL,
  new_parent_key TEXT, -- NULL means "move to root"
  original_parent_key TEXT, -- snapshot of original Jira parent_key for reference
  moved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_key, issue_key) -- one override per issue per project
);

-- Enable RLS
ALTER TABLE public.ph_hierarchy_overrides ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read overrides for their project
CREATE POLICY "Authenticated users can read hierarchy overrides"
  ON public.ph_hierarchy_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert overrides
CREATE POLICY "Authenticated users can insert hierarchy overrides"
  ON public.ph_hierarchy_overrides FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = moved_by);

-- Authenticated users can update their own or any override
CREATE POLICY "Authenticated users can update hierarchy overrides"
  ON public.ph_hierarchy_overrides FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete overrides (to reset to Jira default)
CREATE POLICY "Authenticated users can delete hierarchy overrides"
  ON public.ph_hierarchy_overrides FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Index for fast lookup
CREATE INDEX idx_ph_hierarchy_overrides_project ON public.ph_hierarchy_overrides(project_key);
CREATE INDEX idx_ph_hierarchy_overrides_issue ON public.ph_hierarchy_overrides(issue_key);
