ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ph_issues_due_date
  ON public.ph_issues (due_date)
  WHERE due_date IS NOT NULL;