-- CAT-SPRINTS-NATIVE-20260702-002 slice Phase 3 Slice 4a
-- Approval-timeliness prerequisite (D-008): there is no timestamp anywhere
-- recording when a sprint entered a given status (e.g. awaiting_approval),
-- so approval-timeliness cannot be computed. work_item_transitions can't be
-- reused — its work_item_id FK hard-references ph_issues, not
-- ph_jira_sprints. This is a dedicated table + trigger, mirroring
-- record_native_work_item_transition() (20260703093000_native_transition_
-- trigger.sql, S0.1b) as closely as possible.

CREATE TABLE IF NOT EXISTS public.ph_sprint_status_transitions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id             uuid NOT NULL REFERENCES public.ph_jira_sprints(id) ON DELETE CASCADE,
  from_status           text,
  to_status             text NOT NULL,
  transitioned_by       text,
  transitioned_by_avatar text,
  transitioned_at       timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ph_sprint_status_transitions_lookup_idx
  ON public.ph_sprint_status_transitions (sprint_id, transitioned_at);

ALTER TABLE public.ph_sprint_status_transitions ENABLE ROW LEVEL SECURITY;

-- Team-shared read (status audit trail, same reasoning as sprint_insight_
-- cache's D-022 sharing decision). No client write policies — writes are
-- trigger-only via SECURITY DEFINER, same posture as S0.1b.
CREATE POLICY ph_sprint_status_transitions_select_authenticated
  ON public.ph_sprint_status_transitions
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.record_sprint_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  actor_avatar text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name, avatar_url INTO actor_name, actor_avatar
  FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.ph_sprint_status_transitions (
    sprint_id, from_status, to_status, transitioned_by, transitioned_by_avatar, transitioned_at
  ) VALUES (
    NEW.id, OLD.status, NEW.status, COALESCE(actor_name, 'Unknown'), actor_avatar, now()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_record_sprint_status_transition
  AFTER UPDATE OF status ON public.ph_jira_sprints
  FOR EACH ROW EXECUTE FUNCTION public.record_sprint_status_transition();
