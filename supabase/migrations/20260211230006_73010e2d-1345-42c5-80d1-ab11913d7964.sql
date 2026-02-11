
-- Add theme_id to wh_issues, linked to wh_themes
-- This is a Catalyst-only field, never written back to Jira
ALTER TABLE public.wh_issues
  ADD COLUMN theme_id uuid REFERENCES public.wh_themes(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_wh_issues_theme_id ON public.wh_issues(theme_id);
