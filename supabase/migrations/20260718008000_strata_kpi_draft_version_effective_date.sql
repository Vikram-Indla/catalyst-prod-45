-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-002 item 7: prospective adoption date on revision
--
-- strata_create_kpi_draft_version set effective_from = NULL, so a new version always adopted on
-- approval (strata_approve_record does COALESCE(effective_from, now())). This adds an OPTIONAL
-- prospective adoption date: a future effective_from flows through that COALESCE untouched, so
-- approving the draft schedules adoption for that date instead of immediately.
--
-- Additive and backward compatible in behaviour: p_effective_from defaults to NULL (= today's
-- adopt-on-approval). The 3-arg overload from 20260716240000 MUST be dropped, though — otherwise
-- a 3-arg call binds to it by exact arity and never reaches this body (same overload trap as
-- KO-DEF-001's blockers function). The client passes 4 args regardless.
--
-- Everything else is byte-identical to 20260716240000: same lineage, version = max+1,
-- supersedes_id set, DEFINITION children only (formula versions), NO facts cloned or repointed,
-- and NO UPDATE/DELETE of strata_kpis — the Approved predecessor stays immutable (proven on
-- staging: full-row md5 of the predecessor is identical before and after, and the new draft
-- carries effective_from = the selected future date).

DROP FUNCTION IF EXISTS public.strata_create_kpi_draft_version(uuid, text, text);

CREATE OR REPLACE FUNCTION public.strata_create_kpi_draft_version(
  p_kpi            uuid,
  p_reason         text,
  p_revision_class text,
  p_effective_from date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src  public.strata_kpis%ROWTYPE;
  v_new  uuid;
  v_open uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'creating a KPI version requires the strategy_office or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a change reason is required to create a new version';
  END IF;
  IF p_revision_class IS NULL OR p_revision_class NOT IN ('non_material','material') THEN
    RAISE EXCEPTION 'a revision class is required: non_material (wording/owner/metadata only) or material (formula, unit, direction, scope or source-semantic change — breaks comparability)';
  END IF;
  IF p_effective_from IS NOT NULL AND p_effective_from < current_date THEN
    RAISE EXCEPTION 'prospective effective date % is in the past', p_effective_from;
  END IF;

  SELECT * INTO v_src FROM public.strata_kpis WHERE id = p_kpi;
  IF v_src.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF v_src.status = 'draft' THEN
    RAISE EXCEPTION 'this KPI is already a draft — edit it directly instead of creating a version';
  END IF;

  SELECT id INTO v_open FROM public.strata_kpis
   WHERE lineage_id = v_src.lineage_id AND status IN ('draft','pending_approval') LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'a draft version of this KPI already exists (%) — finish or discard it first', v_open;
  END IF;

  INSERT INTO public.strata_kpis (
    organization_id, name, slug, description, business_meaning, kpi_type_id,
    unit, direction, frequency, entry_method,
    accountable_owner_id, data_owner_id, reporter_id, validator_id, escalation_owner_id,
    data_source_id, threshold_scheme_id, is_strategic,
    lineage_id, version, status,
    effective_from, effective_to, approved_by, approved_at,
    change_reason, supersedes_id, revision_class
  )
  SELECT
    v_src.organization_id, v_src.name, NULL, v_src.description, v_src.business_meaning, v_src.kpi_type_id,
    v_src.unit, v_src.direction, v_src.frequency, v_src.entry_method,
    v_src.accountable_owner_id, v_src.data_owner_id, v_src.reporter_id, v_src.validator_id, v_src.escalation_owner_id,
    v_src.data_source_id, v_src.threshold_scheme_id, v_src.is_strategic,
    v_src.lineage_id,
    (SELECT max(version) + 1 FROM public.strata_kpis WHERE lineage_id = v_src.lineage_id),
    'draft',
    p_effective_from, NULL, NULL, NULL,
    p_reason, p_kpi, p_revision_class
  RETURNING id INTO v_new;

  INSERT INTO public.strata_kpi_formula_versions (
    kpi_id, version, expression, variables, formula_type, normalization,
    effective_from, status, approved_by, approved_at, change_reason)
  SELECT v_new, f.version, f.expression, f.variables, f.formula_type, f.normalization,
         NULL, 'draft', NULL, NULL, format('cloned from KPI v%s', v_src.version)
    FROM public.strata_kpi_formula_versions f
   WHERE f.kpi_id = p_kpi;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', v_new, 'RPC:create_kpi_draft_version', auth.uid(),
          format('%s draft cloned from v%s (%s) [%s]%s: %s',
                 'v' || (SELECT max(version) FROM public.strata_kpis WHERE lineage_id = v_src.lineage_id),
                 v_src.version, v_src.name, p_revision_class,
                 CASE WHEN p_effective_from IS NOT NULL THEN '; effective ' || p_effective_from ELSE '' END,
                 p_reason));

  RETURN v_new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_create_kpi_draft_version(uuid, text, text, date) TO authenticated;
