-- Add GIN index on ph_issues.fix_versions for fast containment queries
CREATE INDEX IF NOT EXISTS idx_ph_issues_fix_versions_gin ON public.ph_issues USING GIN (fix_versions);
