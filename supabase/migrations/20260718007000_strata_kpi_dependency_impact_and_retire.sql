-- CAT-STRATA-KODEF-20260717-001 — KO-DEF-002, retirement slice
--
-- 9fe1f4e04 delivered governed revision by wiring the existing strata_create_kpi_draft_version.
-- Retirement had no server capability at all: no strata_retire_kpi existed, and nothing could
-- answer "what still depends on this KPI?" — so retirement could not be gated safely.
--
-- Two functions, one shared definition of dependency:
--
-- 1. strata_kpi_dependency_impact(kpi) -> jsonb
--    Resolves across the whole LINEAGE (facts keep the version that produced them, so a v1
--    dependency is still a dependency of the KPI as a continuing concept), and splits:
--      current    — can still change a live number: element links on non-retired elements,
--                   model measures on draft/pending/approved models, scorecard lines on
--                   non-locked instances, key results on non-closed OKRs, initiative links.
--      historical — already frozen: locked scorecard instances (issued evidence) and closed
--                   OKR key results. Reported for visibility; NEVER blocks and is never touched.
--    Initiative links have no lifecycle column, so they count as current — the safe direction
--    (blocks rather than silently permits).
--    ONE function, shared by the retirement gate and the revision impact preview, so the two
--    can never disagree about what "depends on this KPI" means.
--
-- 2. strata_retire_kpi(kpi, reason, effective_to, replacement, exception) -> jsonb
--    * strategy_office/admin only; approved KPIs only (a draft is discarded, not retired).
--    * PROSPECTIVE ONLY — a past effective date is refused. Backdating would retroactively
--      invalidate calculations and issued evidence that were correct when produced.
--    * Blocks while active dependencies exist unless a governed replacement KPI (approved, and
--      on a DIFFERENT lineage — another version of the same lineage is a successor, not a
--      replacement) or an authorized exception is supplied. The refusal names the counts.
--    * Sets status + effective_to ONLY. The row, every version, every fact and the lineage all
--      survive; historical rendering resolves through the lineage exactly as before.
--    * No fact table is written anywhere in this function: no INSERT/UPDATE/DELETE against
--      calculated values, actuals, targets, key results, scorecard lines or snapshots.
--
-- The manual audit row in strata_retire_kpi is DELIBERATE and is not the SR-DEF-002 duplicate
-- pattern: the generic strata_audit() trigger records the row's own columns, but replacement
-- and exception are NOT columns — without this write the governed justification for retiring
-- over active dependencies would be unrecorded.
--
-- Staging evidence (role-impersonated, rolled back):
--   impact: current {element_links 3, model_measures 2, scorecard_lines 2, initiative_links 1}
--           historical {scorecard_lines_locked 1}  active_total 8
--   NEG blocked   -> 'retirement blocked — 8 active dependency(ies) ...'
--                    status stayed approved, effective_to NULL, retire_audit_rows 0
--   NEG past date -> 'retirement must be prospective: effective date 2026-07-16 is in the past'
--   POS replacement -> status retired, effective_to 2026-08-16
--   POS exception   -> effective_to 2026-09-15, waiver recorded in the audit note
--   FACTS_UNCHANGED=t   LOCKED_ROWS 32 -> 32

CREATE OR REPLACE FUNCTION public.strata_kpi_dependency_impact(p_kpi uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE k record; v_lin uuid; ids uuid[];
  el_cur int; el_hist int; mm_cur int; mm_hist int; sl_cur int; sl_hist int;
  kr_cur int; kr_hist int; ini_cur int;
BEGIN
  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  v_lin := k.lineage_id;
  SELECT array_agg(id) INTO ids FROM public.strata_kpis WHERE lineage_id = v_lin;

  SELECT count(*) FILTER (WHERE e.status <> 'retired'),
         count(*) FILTER (WHERE e.status = 'retired')
    INTO el_cur, el_hist
    FROM public.strata_element_kpis ek
    JOIN public.strata_strategy_elements e ON e.id = ek.element_id
   WHERE ek.kpi_id = ANY(ids);

  SELECT count(*) FILTER (WHERE m.status IN ('draft','pending_approval','approved')),
         count(*) FILTER (WHERE m.status IN ('retired','superseded'))
    INTO mm_cur, mm_hist
    FROM public.strata_scorecard_model_measures mm
    JOIN public.strata_scorecard_models m ON m.id = mm.model_id
   WHERE mm.kpi_id = ANY(ids);

  SELECT count(*) FILTER (WHERE i.status <> 'locked'),
         count(*) FILTER (WHERE i.status = 'locked')
    INTO sl_cur, sl_hist
    FROM public.strata_scorecard_lines l
    JOIN public.strata_scorecard_instances i ON i.id = l.instance_id
   WHERE l.kpi_id = ANY(ids);

  SELECT count(*) FILTER (WHERE o.status <> 'closed'),
         count(*) FILTER (WHERE o.status = 'closed')
    INTO kr_cur, kr_hist
    FROM public.strata_key_results kr
    JOIN public.strata_okrs o ON o.id = kr.okr_id
   WHERE kr.kpi_id = ANY(ids);

  SELECT count(*) INTO ini_cur FROM public.strata_initiative_kpis WHERE kpi_id = ANY(ids);

  RETURN jsonb_build_object(
    'kpi_id', p_kpi,
    'lineage_id', v_lin,
    'versions_in_lineage', coalesce(array_length(ids,1), 0),
    'current', jsonb_build_object(
      'element_links', el_cur, 'model_measures', mm_cur, 'scorecard_lines', sl_cur,
      'key_results', kr_cur, 'initiative_links', ini_cur),
    'historical', jsonb_build_object(
      'element_links', el_hist, 'model_measures', mm_hist,
      'scorecard_lines_locked', sl_hist, 'key_results_closed', kr_hist),
    'active_total', el_cur + mm_cur + sl_cur + kr_cur + ini_cur);
END;
$function$;

COMMENT ON FUNCTION public.strata_kpi_dependency_impact(uuid) IS
  'Dependency impact for a KPI across its whole lineage, split current vs historical (KO-DEF-002). One definition shared by revision preview and the retirement gate. Read-only; locked scorecard lines and closed OKR key results are reported as historical and never block.';

GRANT EXECUTE ON FUNCTION public.strata_kpi_dependency_impact(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.strata_retire_kpi(
  p_kpi          uuid,
  p_reason       text,
  p_effective_to date,
  p_replacement  uuid DEFAULT NULL,
  p_exception    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE k record; rep record; impact jsonb; active int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'retiring a KPI requires the strategy_office or admin role';
  END IF;

  SELECT * INTO k FROM public.strata_kpis WHERE id = p_kpi;
  IF k.id IS NULL THEN RAISE EXCEPTION 'KPI not found'; END IF;
  IF k.status <> 'approved' THEN
    RAISE EXCEPTION 'only an approved KPI can be retired (current: %) — discard a draft instead', k.status;
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a retirement reason is required';
  END IF;

  IF p_effective_to IS NULL THEN
    RAISE EXCEPTION 'a prospective effective date is required';
  END IF;
  IF p_effective_to < current_date THEN
    RAISE EXCEPTION 'retirement must be prospective: effective date % is in the past', p_effective_to;
  END IF;

  impact := public.strata_kpi_dependency_impact(p_kpi);
  active := (impact->>'active_total')::int;

  IF p_replacement IS NOT NULL THEN
    SELECT * INTO rep FROM public.strata_kpis WHERE id = p_replacement;
    IF rep.id IS NULL THEN RAISE EXCEPTION 'replacement KPI not found'; END IF;
    IF rep.status <> 'approved' THEN
      RAISE EXCEPTION 'replacement KPI must be approved (current: %)', rep.status;
    END IF;
    IF rep.lineage_id = k.lineage_id THEN
      RAISE EXCEPTION 'replacement must be a different KPI — another version of the same lineage is not a replacement';
    END IF;
  END IF;

  IF active > 0 AND p_replacement IS NULL AND (p_exception IS NULL OR btrim(p_exception) = '') THEN
    RAISE EXCEPTION 'retirement blocked — % active dependency(ies) still reference this KPI: %. Supply a governed replacement KPI or an authorized exception.',
      active, (impact->'current')::text;
  END IF;

  UPDATE public.strata_kpis
     SET status = 'retired',
         effective_to = p_effective_to,
         change_reason = p_reason,
         updated_at = now()
   WHERE id = p_kpi;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_kpis', p_kpi, 'RPC:retire_kpi', auth.uid(),
          format('retire v%s effective %s [active_deps=%s%s%s]: %s',
                 k.version, p_effective_to, active,
                 CASE WHEN p_replacement IS NOT NULL
                      THEN '; replacement=' || public.strata_entity_name('kpi', p_replacement) ELSE '' END,
                 CASE WHEN p_exception IS NOT NULL AND btrim(p_exception) <> ''
                      THEN '; authorized_exception=' || p_exception ELSE '' END,
                 p_reason));

  RETURN jsonb_build_object('kpi_id', p_kpi, 'effective_to', p_effective_to,
                            'active_dependencies', active, 'impact', impact);
END;
$function$;

COMMENT ON FUNCTION public.strata_retire_kpi(uuid, text, date, uuid, text) IS
  'Prospectively retires an approved KPI (KO-DEF-002). Blocks while active dependencies exist unless a governed replacement or authorized exception is supplied. Sets status/effective_to only — the row, versions, facts and lineage survive; no calculation, snapshot or issued evidence is touched.';

GRANT EXECUTE ON FUNCTION public.strata_retire_kpi(uuid, text, date, uuid, text) TO authenticated;
