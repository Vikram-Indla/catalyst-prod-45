-- 2026-06-26: ph_sprint_approvers mirrors ph_release_approvers so the
-- canonical ApproversCard works for sprints via the EntityConfig adapter.
-- Schema + policies are identical except for the FK (sprint_id -> ph_jira_sprints).

CREATE TABLE IF NOT EXISTS public.ph_sprint_approvers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id   uuid NOT NULL REFERENCES public.ph_jira_sprints(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  status      text NOT NULL DEFAULT 'pending'::text,
  description text,
  added_by    uuid,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_sprint_approvers_sprint_id ON public.ph_sprint_approvers(sprint_id);
CREATE INDEX IF NOT EXISTS idx_ph_sprint_approvers_user_id   ON public.ph_sprint_approvers(user_id);

ALTER TABLE public.ph_sprint_approvers
  DROP CONSTRAINT IF EXISTS ph_sprint_approvers_user_id_fkey;
ALTER TABLE public.ph_sprint_approvers
  ADD CONSTRAINT ph_sprint_approvers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_ph_sprint_approvers_updated ON public.ph_sprint_approvers;
CREATE TRIGGER trg_ph_sprint_approvers_updated
  BEFORE UPDATE ON public.ph_sprint_approvers
  FOR EACH ROW EXECUTE FUNCTION public.fn_ph_update_timestamp();

ALTER TABLE public.ph_sprint_approvers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ph_sprint_approvers_select ON public.ph_sprint_approvers;
DROP POLICY IF EXISTS ph_sprint_approvers_insert ON public.ph_sprint_approvers;
DROP POLICY IF EXISTS ph_sprint_approvers_update ON public.ph_sprint_approvers;
DROP POLICY IF EXISTS ph_sprint_approvers_delete ON public.ph_sprint_approvers;

CREATE POLICY ph_sprint_approvers_select ON public.ph_sprint_approvers FOR SELECT USING (true);
CREATE POLICY ph_sprint_approvers_insert ON public.ph_sprint_approvers FOR INSERT WITH CHECK (true);
CREATE POLICY ph_sprint_approvers_update ON public.ph_sprint_approvers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY ph_sprint_approvers_delete ON public.ph_sprint_approvers FOR DELETE USING (true);

NOTIFY pgrst, 'reload schema';
