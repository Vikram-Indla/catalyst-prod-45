-- CAT-SPRINTS-NATIVE-20260702-002 slice S1.4
-- Optional single-release link on a sprint. One sprint links to at most one
-- release (approved by Vikram 2026-07-02 — no many-to-many needed). Do NOT
-- confuse with the legacy `release_sprints` junction table (2026-06-28), which
-- references the old `releases`/`sprints` tables from the pre-ph_* SAFe
-- iterations system — unrelated, untouched, out of scope.

ALTER TABLE public.ph_jira_sprints
  ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.ph_releases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ph_jira_sprints_release_id ON public.ph_jira_sprints(release_id);

NOTIFY pgrst, 'reload schema';
