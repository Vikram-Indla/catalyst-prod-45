-- CAT-STRATA-IMPL-20260712-001 · P0-B / A3a · scorecard-model governed revision (D-2)
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md §6, §8.2
-- D-2 (Vikram): dedicated revision RPCs — NOT one generic polymorphic RPC, NOT a mandatory
-- change-request workflow. Clone the complete governed aggregate, increment version, set
-- supersedes_id, reset approval fields, copy children, record actor/reason, LEAVE THE PREDECESSOR
-- UNCHANGED. Reuse strata_approve_record's approval + supersession boundary.
-- D-3: editing an approved definition means a new draft version, not "retire and recreate".
-- F-4 (Vikram): lands back-to-back with P0-A — A2 froze approved children, so until this exists an
-- approved model cannot be changed at all (both staging models are approved). This restores the
-- path, via versioning rather than in-place mutation.
--
-- WHAT IS REUSED, NOT REBUILT (probed 2026-07-16 — the supersession half already works):
--   * strata_approve_record ALREADY sets the predecessor to status='superseded' + effective_to=now()
--     when the approved record has supersedes_id set (foundation_config_engine.sql:413-418). It is
--     the ONLY reader of supersedes_id, and the column exists on 9+ tables but was NEVER WRITTEN.
--     This RPC is that missing writer. strata_approve_record is NOT modified.
--   * strata_approve_record's SoD ("the creator cannot approve their own record") is inherited for
--     free: created_by defaults to auth.uid(), so the author of a draft version cannot approve it.
--     That is intended — a revision is approved by a DIFFERENT strategy_office member.
--   * effective_from = COALESCE(effective_from, now()) in strata_approve_record already honours a
--     pre-set effective date, so mid-period prospective adoption needs nothing here.
--   * trg_strata_scorecard_models_slug (BEFORE INSERT -> strata_generate_slug) dedupes the slug to
--     '<base>-2', '-3', … The clone therefore passes slug = NULL and lets the trigger own it. Do NOT
--     copy the source slug: slug is UNIQUE, and the slug contract freezes it on creation.
--
-- p_reason is REQUIRED. D-2 says the revision "records actor/reason"; a governed version whose
-- reason is NULL records nothing and leaves an unexplained change in the lineage.

CREATE OR REPLACE FUNCTION public.strata_create_model_draft_version(
  p_model  uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src  public.strata_scorecard_models%ROWTYPE;
  v_new  uuid;
  v_open uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a scorecard model version requires the strategy_office or admin role';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a change reason is required to create a new version';
  END IF;

  SELECT * INTO v_src FROM public.strata_scorecard_models WHERE id = p_model;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'scorecard model not found';
  END IF;

  -- A draft is already editable in place; cloning one would fork the lineage for no reason.
  IF v_src.status = 'draft' THEN
    RAISE EXCEPTION 'this model is already a draft — edit it directly instead of creating a version';
  END IF;

  -- One open successor per predecessor. Two concurrent drafts would both carry supersedes_id =
  -- p_model, and approving both would supersede the same predecessor twice, leaving whichever
  -- approved second silently overriding the first.
  SELECT id INTO v_open
    FROM public.strata_scorecard_models
   WHERE supersedes_id = p_model AND status IN ('draft','pending_approval')
   LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'a draft version of this model already exists (%) — finish or discard it first', v_open;
  END IF;

  -- The clone. created_by is deliberately omitted so its auth.uid() default applies (SoD, above).
  -- Approval fields are reset — a draft has never been approved and must not claim otherwise.
  INSERT INTO public.strata_scorecard_models (
    organization_id, name, slug, description, owner_scope_type, rollup_method,
    threshold_scheme_id, period_granularity, version, status,
    effective_from, effective_to, approved_by, approved_at, change_reason, supersedes_id
  ) VALUES (
    v_src.organization_id, v_src.name, NULL, v_src.description, v_src.owner_scope_type,
    v_src.rollup_method, v_src.threshold_scheme_id, v_src.period_granularity,
    v_src.version + 1, 'draft',
    NULL, NULL, NULL, NULL, p_reason, p_model
  ) RETURNING id INTO v_new;

  -- The COMPLETE aggregate (D-1): perspectives + weights + order, then measures with their
  -- weights, requiredness, aggregation and target policy. The threshold association travels on
  -- the parent row (threshold_scheme_id, copied above).
  INSERT INTO public.strata_scorecard_model_perspectives (model_id, perspective_id, weight, order_index)
  SELECT v_new, perspective_id, weight, order_index
    FROM public.strata_scorecard_model_perspectives
   WHERE model_id = p_model;

  INSERT INTO public.strata_scorecard_model_measures (
    model_id, perspective_id, kpi_id, weight, order_index, required, aggregation_method, target_policy)
  SELECT v_new, perspective_id, kpi_id, weight, order_index, required, aggregation_method, target_policy
    FROM public.strata_scorecard_model_measures
   WHERE model_id = p_model;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_scorecard_models', v_new, 'RPC:create_model_draft_version', auth.uid(),
          format('v%s draft cloned from v%s (%s): %s',
                 v_src.version + 1, v_src.version, v_src.name, p_reason));

  RETURN v_new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_create_model_draft_version(uuid, text) TO authenticated;
