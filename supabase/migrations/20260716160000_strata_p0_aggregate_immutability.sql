-- CAT-STRATA-IMPL-20260712-001 · P0-A · approved-model aggregate immutability
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md §12
-- D-1 (Vikram): approved-model aggregate immutability is P0. Protect the COMPLETE approved
-- aggregate in RPCs AND at DB/RLS — the UI is not a security boundary.
-- E-4 (Vikram): for approved parents, reject child UPDATE and DELETE at BOTH RPC and DB/RLS.
--
-- THE DEFECT THIS CLOSES (probed 2026-07-16, not inherited):
--   strata_scorecard_models' own UPDATE/DELETE policies gate on status='draft', but its CHILDREN
--   did not. strata_scorecard_model_perspectives_write and strata_model_measures_write were
--   role-only (strata_has_role(['strategy_office'])) and never joined the parent's status, so an
--   APPROVED model's weights and measures could be rewritten in place. Both approved models on
--   staging have post-approval child writes; both locked snapshots stamp a model version whose
--   children moved underneath it (blueprint §3).
--
-- WHY BOTH LAYERS ARE REQUIRED (each covers a path the other cannot):
--   * perspective weights have NO RPC — domain/index.ts:159 setModelPerspectiveWeights does a raw
--     .update() as `authenticated`. RLS is the ONLY enforcement point for that path.
--   * strata_set_model_measures is SECURITY DEFINER, so it runs as the table owner and BYPASSES
--     RLS. The in-RPC guard is the ONLY enforcement point for that path.
--   Neither layer is redundant. Removing either re-opens the hole for one of the two writers.
--
-- PRECEDENT (§12.1): strata_gate_model_stages_write is the one correctly-gated child aggregate,
-- and its aggregate is clean in the audit. Its draft-join SHAPE is copied here. Its authorization
-- predicate is NOT: it uses (created_by = auth.uid() OR strata_is_admin()), whereas these two
-- children are authored by strategy_office. Copying it verbatim would silently change who may
-- author measures — a regression. The draft join is added; the existing role check is preserved.
--
-- SCOPE — strata_element_kpis is deliberately NOT gated here (F-8, blueprint §12.2 correction):
--   §12.2 lists element_kpis for this fix, but that contradicts §3.7 ("relationship ≠ definition";
--   post-approval linking is legitimate and intended) and E-7 ("no independent link-status state
--   machine"). strata_link_element_kpi REQUIRES kpi_status='approved' (strategic KPIs may also
--   link while draft/pending), so gating element_kpis writes on a DRAFT parent would invert the
--   rule and break every KPI link in the product. element_kpis is not a child of the scorecard
--   model aggregate at all. It receives E-4 audit coverage and the DEF-010 relaxation instead.
--
-- Rollback: restore the two role-only policies and drop the RPC guard. Doing so re-opens the P0
-- hole and requires an explicit ruling (blueprint §7).

-- ── 1. RLS · strata_scorecard_model_perspectives ─────────────────────────────
-- Covers INSERT/UPDATE/DELETE: USING gates UPDATE+DELETE, WITH CHECK gates INSERT+UPDATE.
DROP POLICY IF EXISTS strata_scorecard_model_perspectives_write ON public.strata_scorecard_model_perspectives;
CREATE POLICY strata_scorecard_model_perspectives_write ON public.strata_scorecard_model_perspectives
  FOR ALL
  USING (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_perspectives.model_id
         AND m.status = 'draft'
    )
  )
  WITH CHECK (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_perspectives.model_id
         AND m.status = 'draft'
    )
  );

-- ── 2. RLS · strata_scorecard_model_measures ─────────────────────────────────
-- The prior policy had USING only (with_check NULL). Both are stated explicitly here.
DROP POLICY IF EXISTS strata_model_measures_write ON public.strata_scorecard_model_measures;
CREATE POLICY strata_model_measures_write ON public.strata_scorecard_model_measures
  FOR ALL
  USING (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_measures.model_id
         AND m.status = 'draft'
    )
  )
  WITH CHECK (
    public.strata_has_role(ARRAY['strategy_office'])
    AND EXISTS (
      SELECT 1 FROM public.strata_scorecard_models m
       WHERE m.id = strata_scorecard_model_measures.model_id
         AND m.status = 'draft'
    )
  );

-- ── 3. RPC guard · strata_set_model_measures ─────────────────────────────────
-- SECURITY DEFINER bypasses the policy above, so the guard is stated in the function body.
-- Body is otherwise byte-identical to 20260716150000 (replace-set + structure check + audit).
CREATE OR REPLACE FUNCTION public.strata_set_model_measures(p_model uuid, p_measures jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bad uuid;
  v_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'authoring scorecard measures requires the strategy_office or admin role';
  END IF;

  SELECT status INTO v_status FROM public.strata_scorecard_models WHERE id = p_model;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- D-1: the approved aggregate is immutable. Changing it means a new draft version.
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'scorecard model is % — approved definitions are immutable; create a new draft version to change its measures', v_status
      USING ERRCODE = 'check_violation';
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
