-- CAT-STRATA-SCDEF-20260717-001 — SC-DEF-001 (P1)
--
-- Problem: a brand-new scorecard-model DRAFT could not be created from anywhere. The only
-- writer of strata_scorecard_models outside seed migrations is
-- strata_create_model_draft_version (20260716170000), which CLONES an existing row
-- (`SELECT * INTO v_src ... WHERE id = p_model; IF v_src.id IS NULL THEN RAISE`). That verb
-- is revision-by-design (D-2/D-3) and cannot bootstrap a first model — so an org with no
-- seeded model had no reachable path at all, and the Scorecards page's own comment pointed
-- at a "Model Builder" that does not exist.
--
-- This adds the missing NET-NEW verb. It does NOT replace or alter
-- strata_create_model_draft_version: revision of an approved model stays exactly as it is
-- (D-3 — editing an approved definition means a new draft version, never in-place mutation).
--
-- Governance parity with the revision RPC:
--   * same role guard (strategy_office | admin via strata_has_role);
--   * created_by defaults to auth.uid(), so strata_approve_record's SoD applies for free —
--     the author of a draft cannot approve it;
--   * status starts at 'draft', version 1, approval fields NULL — a new model has never been
--     approved and must not claim otherwise;
--   * supersedes_id is NULL: this row supersedes nothing. Setting it would fabricate legacy
--     provenance for a model that has no predecessor (explicitly forbidden by the brief).
--   * slug is passed NULL so trg_strata_scorecard_models_slug owns it (slug frozen on create).
--
-- Audit: deliberately NOT hand-written. strata_scorecard_models already carries the generic
-- trg_strata_scorecard_models_audit (AFTER INSERT -> strata_audit(), attached by
-- 20260705100100_strata_strategy_scorecard.sql), which records actor + full `after` payload.
-- Hand-writing a second row is the double-write corrected by SR-DEF-002 and is not repeated
-- here. (The pre-existing manual INSERT inside strata_create_model_draft_version is left
-- alone — out of scope for this pack.)
--
-- Enum values are validated up front for friendly errors; the table CHECKs remain the
-- source of truth.

CREATE OR REPLACE FUNCTION public.strata_create_scorecard_model(
  p_name              text,
  p_owner_scope_type  text,
  p_rollup_method     text,
  p_period_granularity text,
  p_description       text DEFAULT NULL,
  p_threshold_scheme  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a scorecard model requires the strategy_office or admin role';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'model name is required';
  END IF;
  IF p_owner_scope_type IS NULL OR p_owner_scope_type NOT IN
     ('enterprise','sector','function','portfolio','initiative','custom') THEN
    RAISE EXCEPTION 'owner scope must be enterprise | sector | function | portfolio | initiative | custom';
  END IF;
  IF p_rollup_method IS NULL OR p_rollup_method NOT IN ('weighted_average','sum','min','custom') THEN
    RAISE EXCEPTION 'rollup method must be weighted_average | sum | min | custom';
  END IF;
  IF p_period_granularity IS NULL OR p_period_granularity NOT IN ('month','quarter','half','year') THEN
    RAISE EXCEPTION 'period granularity must be month | quarter | half | year';
  END IF;
  IF p_threshold_scheme IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.strata_threshold_schemes WHERE id = p_threshold_scheme) THEN
    RAISE EXCEPTION 'threshold scheme not found';
  END IF;

  INSERT INTO public.strata_scorecard_models (
    name, slug, description, owner_scope_type, rollup_method,
    threshold_scheme_id, period_granularity, version, status,
    effective_from, effective_to, approved_by, approved_at, change_reason, supersedes_id
  ) VALUES (
    btrim(p_name), NULL, p_description, p_owner_scope_type, p_rollup_method,
    p_threshold_scheme, p_period_granularity, 1, 'draft',
    NULL, NULL, NULL, NULL, NULL, NULL
  ) RETURNING id INTO v_new;

  RETURN v_new;
END;
$function$;

COMMENT ON FUNCTION public.strata_create_scorecard_model(text, text, text, text, text, uuid) IS
  'Creates a NET-NEW scorecard model at version 1, status draft (SC-DEF-001). Perspectives and KPI measures are then authored via strata_set_model_perspective_weights / strata_set_model_measures, which require status=draft. Revision of an existing model remains strata_create_model_draft_version (D-2/D-3) — this verb never touches an existing row. Audited once by trg_strata_scorecard_models_audit.';

GRANT EXECUTE ON FUNCTION public.strata_create_scorecard_model(text, text, text, text, text, uuid) TO authenticated;
