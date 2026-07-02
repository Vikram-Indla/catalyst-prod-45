-- Adds nullable epic color/status columns to ph_issues, denormalized on the
-- child row at sync time — same pattern already used for parent_key/parent_summary.
-- Population is a separate follow-up slice (see CAT-KANBAN-EPIC-COLOR-20260702-001);
-- these columns ship null until a sync function is updated to write them, and the
-- UI already renders gracefully (falls back to today's behavior) when null.
ALTER TABLE public.ph_issues
  ADD COLUMN IF NOT EXISTS epic_color text,
  ADD COLUMN IF NOT EXISTS epic_status text,
  ADD COLUMN IF NOT EXISTS epic_status_category text;
