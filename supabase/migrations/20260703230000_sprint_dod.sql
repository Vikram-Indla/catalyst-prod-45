-- CAT-SPRINTS-NATIVE-20260702-002 slice S2.1a/b
-- Per-work-item-type Definition of Done for a sprint (D-004). One row per
-- (sprint, work_item_type) naming which status counts as "done" for that
-- type IN THIS SPRINT. No default seeding: per-type "done" statuses vary
-- (verified live — Story's terminal status is "In Production", not "Done";
-- some types have no status literally named "Done" at all), so a hardcoded
-- default would violate zero-assumption. A human picks the status explicitly
-- from that type's real live catalog (useWorkflowStatuses).

CREATE TABLE IF NOT EXISTS public.ph_sprint_dod (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id       uuid NOT NULL REFERENCES public.ph_jira_sprints(id) ON DELETE CASCADE,
  work_item_type  text NOT NULL,
  done_status     text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (sprint_id, work_item_type)
);

CREATE INDEX IF NOT EXISTS idx_ph_sprint_dod_sprint_id ON public.ph_sprint_dod(sprint_id);

DROP TRIGGER IF EXISTS trg_ph_sprint_dod_updated ON public.ph_sprint_dod;
CREATE TRIGGER trg_ph_sprint_dod_updated
  BEFORE UPDATE ON public.ph_sprint_dod
  FOR EACH ROW EXECUTE FUNCTION public.fn_ph_update_timestamp();

-- RLS mirrors ph_jira_sprints (anon read + authenticated read/write) — this
-- table has no independent sensitivity beyond the sprint it belongs to.
ALTER TABLE public.ph_sprint_dod ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon read sprint dod" ON public.ph_sprint_dod;
DROP POLICY IF EXISTS sprint_dod_read_all    ON public.ph_sprint_dod;
DROP POLICY IF EXISTS sprint_dod_write_all   ON public.ph_sprint_dod;

CREATE POLICY "Anon read sprint dod"
  ON public.ph_sprint_dod FOR SELECT TO anon USING (true);

CREATE POLICY sprint_dod_read_all
  ON public.ph_sprint_dod FOR SELECT TO authenticated USING (true);

CREATE POLICY sprint_dod_write_all
  ON public.ph_sprint_dod TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
