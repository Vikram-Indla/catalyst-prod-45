-- CAT-STRATA-IMPL-20260712-001 · A3c · threshold-scheme governed revision (D-2)
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md §6, §8.2
-- D-2 (Vikram): dedicated revision RPCs, NOT one generic polymorphic RPC. Hence a second function
-- rather than parameterising strata_create_model_draft_version over a table name.
--
-- WHY A3c IS SAFE AHEAD OF A3b (probed 2026-07-16, not assumed):
--   strata_threshold_schemes has NO aggregate children. Its bands live in a `bands` jsonb column ON
--   the scheme row (verified: [{key,label,min_score,appearance}, …]), and the only FKs pointing at
--   it are strata_kpis.threshold_scheme_id and strata_scorecard_models.threshold_scheme_id — those
--   REFERENCE a scheme, they are not part of its definition. So the clone is parent-only: copy the
--   definition columns and stop. There is no relationship/fact-carrying problem here, which is
--   exactly what makes KPI revision (A3b, F-9) a different and harder shape.
--
-- Reuse, identical to A3a: strata_approve_record already supersedes the predecessor when the
-- approved record has supersedes_id set, and is NOT modified. SoD is inherited (created_by defaults
-- to auth.uid(), so a draft's author cannot approve it). trg_strata_threshold_schemes_slug dedupes
-- the slug, so the clone passes slug = NULL rather than copying a UNIQUE value.
--
-- The full definition is copied — bands, tolerance, confidence_threshold and escalation_rules.
-- Omitting any of them would silently produce a v2 that rates differently from v1 for reasons
-- nobody chose: bands decide every rating, and tolerance/confidence gate whether a value counts.

CREATE OR REPLACE FUNCTION public.strata_create_threshold_draft_version(
  p_scheme uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src  public.strata_threshold_schemes%ROWTYPE;
  v_new  uuid;
  v_open uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a threshold scheme version requires the strategy_office or admin role';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a change reason is required to create a new version';
  END IF;

  SELECT * INTO v_src FROM public.strata_threshold_schemes WHERE id = p_scheme;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'threshold scheme not found';
  END IF;

  IF v_src.status = 'draft' THEN
    RAISE EXCEPTION 'this threshold scheme is already a draft — edit it directly instead of creating a version';
  END IF;

  -- One open successor per predecessor: two drafts both carrying supersedes_id = p_scheme would
  -- supersede the same predecessor twice, the second silently overriding the first.
  SELECT id INTO v_open
    FROM public.strata_threshold_schemes
   WHERE supersedes_id = p_scheme AND status IN ('draft','pending_approval')
   LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'a draft version of this threshold scheme already exists (%) — finish or discard it first', v_open;
  END IF;

  INSERT INTO public.strata_threshold_schemes (
    organization_id, name, slug, description,
    bands, tolerance, confidence_threshold, escalation_rules,
    version, status, effective_from, effective_to, approved_by, approved_at,
    change_reason, supersedes_id
  ) VALUES (
    v_src.organization_id, v_src.name, NULL, v_src.description,
    v_src.bands, v_src.tolerance, v_src.confidence_threshold, v_src.escalation_rules,
    v_src.version + 1, 'draft', NULL, NULL, NULL, NULL,
    p_reason, p_scheme
  ) RETURNING id INTO v_new;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_threshold_schemes', v_new, 'RPC:create_threshold_draft_version', auth.uid(),
          format('v%s draft cloned from v%s (%s): %s',
                 v_src.version + 1, v_src.version, v_src.name, p_reason));

  RETURN v_new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_create_threshold_draft_version(uuid, text) TO authenticated;
