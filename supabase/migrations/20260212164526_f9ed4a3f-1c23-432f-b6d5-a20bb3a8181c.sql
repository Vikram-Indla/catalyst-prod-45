
-- Add reporter columns to ph_issues
ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS reporter_account_id TEXT,
  ADD COLUMN IF NOT EXISTS reporter_display_name TEXT;

-- Index for reporter lookups
CREATE INDEX IF NOT EXISTS idx_ph_issues_reporter ON public.ph_issues (reporter_account_id);
