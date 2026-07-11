-- ============================================================================
-- STRATA — Remove Schedule Gate from Strategic Theme / Objective / OKR scope
-- CAT-STRATA-GATE-SCOPE-20260710-001
--
-- Root cause: 20260705190000_strata_authoring_write_paths.sql additively
-- widened strata_gate_instances.subject_type to include 'element' (comment:
-- "Play -> Gate Schedule"), and strata_schedule_gate() accepted 'element'
-- without checking which element_type it resolved to. Since
-- strata_strategy_elements only ever holds element_type IN ('theme',
-- 'objective'), this silently made both Strategic Themes and Strategic
-- Objectives valid Value Gate targets — an investment-lifecycle concept that
-- only belongs to the VMO domain (initiative | project_card | benefit).
--
-- This migration:
--   1. Deletes the two pre-existing invalid gate_instances rows created
--      against Strategic Themes while reproducing/investigating this defect
--      (both by vikramataol@gmail.com, gate model "Investment Gates" / stage
--      "Idea" — reproduction artifacts, not real business records; see
--      session report for full detail before this migration was authored).
--   2. Reverts the subject_type CHECK to its original, correct domain:
--      initiative | project_card | benefit.
--   3. Hardens strata_schedule_gate() to reject 'element' and 'okr' subject
--      types with an explicit domain error, instead of relying solely on the
--      CHECK constraint (which would otherwise surface a generic constraint-
--      violation error to the caller).
-- ============================================================================

DELETE FROM public.strata_gate_instances
WHERE subject_type = 'element';

ALTER TABLE public.strata_gate_instances
  DROP CONSTRAINT IF EXISTS strata_gate_instances_subject_type_check;
ALTER TABLE public.strata_gate_instances
  ADD CONSTRAINT strata_gate_instances_subject_type_check
  CHECK (subject_type IN ('initiative','project_card','benefit'));

CREATE OR REPLACE FUNCTION public.strata_schedule_gate(
  p_gate_model uuid,
  p_stage uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_scheduled_for date DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'scheduling a gate requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_gate_models WHERE id = p_gate_model AND status = 'approved') THEN
    RAISE EXCEPTION 'gate model not found or not approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_gate_model_stages WHERE id = p_stage AND gate_model_id = p_gate_model) THEN
    RAISE EXCEPTION 'stage does not belong to the selected gate model';
  END IF;
  IF p_subject_type IN ('element', 'objective', 'okr') THEN
    RAISE EXCEPTION 'Value Gates cannot be scheduled against Strategic Themes, Strategic Objectives, or OKRs.';
  END IF;
  IF p_subject_type NOT IN ('initiative','project_card','benefit') THEN
    RAISE EXCEPTION 'subject type must be initiative | project_card | benefit';
  END IF;
  IF NOT public.strata_entity_exists(p_subject_type, p_subject_id) THEN
    RAISE EXCEPTION '% not found', p_subject_type;
  END IF;

  INSERT INTO public.strata_gate_instances
    (gate_model_id, stage_id, subject_type, subject_id, scheduled_for, status, created_by)
  VALUES (p_gate_model, p_stage, p_subject_type, p_subject_id, p_scheduled_for, 'open', auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_gate_instances', new_id, 'RPC:schedule_gate', auth.uid(),
          format('gate scheduled for %s "%s"%s', p_subject_type,
                 public.strata_entity_name(p_subject_type, p_subject_id),
                 COALESCE(' on ' || p_scheduled_for, '')));
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.strata_schedule_gate(uuid, uuid, text, uuid, date) IS
  'Schedules a Value Gate for the VMO domain (initiative | project_card | benefit) only. '
  'Strategic Themes, Strategic Objectives, and OKRs are explicitly rejected — CAT-STRATA-GATE-SCOPE-20260710-001.';
