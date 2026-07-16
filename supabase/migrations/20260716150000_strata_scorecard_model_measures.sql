-- CAT-STRATA-IMPL-20260712-001 · model measure-level authoring (anchor 05)
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_F_MEASURES.md
-- M-D0 (Vikram): a measure is a KPI ASSIGNMENT, not a master object.
-- M-D1 (Vikram): REUSE the existing aggregation vocabulary — no second dictionary.
-- M-D2 (Vikram): split — this is table + RPC + reader only; the anchor-05 builder UI is its own slice.
--
-- A measure is an ASSIGNMENT of an existing KPI to a (model, perspective). Identity lives in
-- strata_kpis and is referenced by kpi_id — this table stores ONLY the assignment's own facts
-- (weight, order, requiredness, aggregation, target policy). It deliberately carries NO name,
-- formula, unit, owner or source column: duplicating those would create two competing measurement
-- dictionaries. There is no strata_measures master table and there must never be one.
--
-- Scope boundary: strata_scorecard_lines is the INSTANCE-level result structure (scoped by
-- instance_id; permits kpi|objective|benefit). It is untouched. Reusable measures are authored at
-- MODEL level here; lines remain what a generated/live scorecard materialises.
--
-- aggregation_method REUSES strata_scorecard_models.rollup_method's existing CHECK vocabulary
-- verbatim (weighted_average|sum|min|custom) per M-D1. Extending it later means extending BOTH
-- tables in one migration — never this one alone.
--
-- Shape/RLS mirror the sibling strata_scorecard_model_perspectives exactly:
--   UNIQUE(model_id, perspective_id[, kpi_id]) · SELECT => current_user_is_approved()
--   ALL => strata_has_role(['strategy_office'])
--
-- Integrity note: measure weights totalling 100 per perspective is a SUBMIT-time gate (anchor 05:
-- "cannot submit until integrity checks pass"), not a save-time one — the same posture as
-- strata_set_model_perspective_weights. Blocking saves would make a work-in-progress draft
-- unsavable. The RPC validates STRUCTURE (perspective belongs to the model); the integrity band and
-- the submit gate own the arithmetic.

CREATE TABLE IF NOT EXISTS public.strata_scorecard_model_measures (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id           uuid NOT NULL REFERENCES public.strata_scorecard_models(id) ON DELETE CASCADE,
  perspective_id     uuid NOT NULL REFERENCES public.strata_perspectives(id),
  kpi_id             uuid NOT NULL REFERENCES public.strata_kpis(id),
  weight             numeric NOT NULL DEFAULT 0,
  order_index        integer NOT NULL DEFAULT 0,
  required           boolean NOT NULL DEFAULT false,
  aggregation_method text NOT NULL DEFAULT 'weighted_average'
                     CHECK (aggregation_method IN ('weighted_average','sum','min','custom')),
  target_policy      text NOT NULL DEFAULT 'default'
                     CHECK (target_policy IN ('default','local')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strata_model_measures_unique UNIQUE (model_id, perspective_id, kpi_id)
);

CREATE INDEX IF NOT EXISTS strata_model_measures_model_persp_idx
  ON public.strata_scorecard_model_measures (model_id, perspective_id, order_index);

ALTER TABLE public.strata_scorecard_model_measures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strata_model_measures_select ON public.strata_scorecard_model_measures;
CREATE POLICY strata_model_measures_select ON public.strata_scorecard_model_measures
  FOR SELECT USING (public.current_user_is_approved());

DROP POLICY IF EXISTS strata_model_measures_write ON public.strata_scorecard_model_measures;
CREATE POLICY strata_model_measures_write ON public.strata_scorecard_model_measures
  FOR ALL USING (public.strata_has_role(ARRAY['strategy_office']));

-- Replace-set authoring, mirroring strata_set_model_perspective_weights' posture.
-- Rejects a perspective that is not on the model — a FK cannot express that.
CREATE OR REPLACE FUNCTION public.strata_set_model_measures(p_model uuid, p_measures jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bad uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'authoring scorecard measures requires the strategy_office or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_scorecard_models WHERE id = p_model) THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- every measure's perspective must belong to this model
  SELECT (m->>'perspective_id')::uuid INTO bad
    FROM jsonb_array_elements(coalesce(p_measures, '[]'::jsonb)) m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.strata_scorecard_model_perspectives mp
      WHERE mp.model_id = p_model AND mp.perspective_id = (m->>'perspective_id')::uuid)
   LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'perspective % is not on this scorecard model — add the perspective first', bad;
  END IF;

  DELETE FROM public.strata_scorecard_model_measures WHERE model_id = p_model;

  INSERT INTO public.strata_scorecard_model_measures
    (model_id, perspective_id, kpi_id, weight, order_index, required, aggregation_method, target_policy)
  SELECT p_model,
         (m->>'perspective_id')::uuid,
         (m->>'kpi_id')::uuid,
         coalesce((m->>'weight')::numeric, 0),
         coalesce((m->>'order_index')::int, 0),
         coalesce((m->>'required')::boolean, false),
         coalesce(m->>'aggregation_method', 'weighted_average'),
         coalesce(m->>'target_policy', 'default')
    FROM jsonb_array_elements(coalesce(p_measures, '[]'::jsonb)) m;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_scorecard_models', p_model, 'RPC:set_model_measures', auth.uid(),
          jsonb_array_length(coalesce(p_measures,'[]'::jsonb))::text || ' measure assignment(s) set');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_set_model_measures(uuid, jsonb) TO authenticated;
