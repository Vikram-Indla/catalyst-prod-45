-- 2026-06-26: add sprint_id FK column to project-scoped entity tables so
-- create modals can swap the Release picker for a Sprint picker. Sprint
-- entity = ph_jira_sprints. ON DELETE SET NULL keeps rows alive when a
-- sprint is hard-deleted. release_id stays in place (deprecated, not
-- dropped) so existing data isn't lost — modals stop writing to it.
-- stories already has sprint_id so it's skipped.

ALTER TABLE public.ph_work_items
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.ph_jira_sprints(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ph_work_items_sprint_id ON public.ph_work_items(sprint_id);

ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.ph_jira_sprints(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_features_sprint_id ON public.features(sprint_id);

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.ph_jira_sprints(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_sprint_id ON public.incidents(sprint_id);

NOTIFY pgrst, 'reload schema';
