-- CAT-STRATA-IMPL-20260712-001 · R3 · data-source lifecycle + dependents impact + blast radius
-- Plan Lock: blueprint §2.2 (data-source register/retire), P4-D4 · authorization R3.
--
-- ── REUSE — the lifecycle STATES already exist (probed 2026-07-17) ──────────
-- strata_data_sources.status is ALREADY CHECKed to (registered | active | suspended | retired) —
-- exactly R3's "registration / validation and activation / suspension and retirement". Nothing about
-- the states needed inventing. What was missing is the TRANSITIONS (nothing enforced any of them),
-- the dependents-impact check, and the blast radius. Only those are added.
--
-- ── P4-D4's "labelled gap" IS NOW CLOSABLE — and that is the point of this slice ──
-- P4-D4 recorded: "Downstream dependents honest — backward-derivable named KPIs only (kpisForSource);
-- **labeled gap for scorecard/snapshot forward impact**; never fabricate."
-- The forward chain is now EXPRESSIBLE, because every link exists as a real FK / array containment:
--   data_source -> strata_upload_runs.data_source_id
--              -> strata_calculated_values.source_run_ids @> run
--              -> strata_calculated_values.snapshot_id
--              -> strata_board_packs.snapshot_id
--
-- ⚠️ BE PRECISE ABOUT WHAT IS AND IS NOT PROVEN. On today's data this chain yields ZERO:
--   calculated_values with snapshot_id      = 32
--   calculated_values with source_run_ids   = 3,178
--   calculated_values with BOTH             = **0**
-- Those two populations do not intersect — the run-sourced rows belong to periods that were never
-- locked, and the rows inside the two locked snapshots come from actuals with no upload_run_id. So
-- `historical` is legitimately EMPTY for every real source right now. That is a fact about the data,
-- not a broken join: the chain was proven to FIRE against a constructed locked snapshot holding a
-- run-sourced value (it returned SNAP-1001 + its board packs — see 06_VALIDATION_EVIDENCE.md).
-- Citing "3,178 + 32" as if it demonstrated forward impact would have been a claim built on two
-- numbers that never meet. Nothing here is fabricated: every dependent reported is a real row.
--
-- ── Classification: BLOCKING vs MIGRATION vs HISTORICAL ─────────────────────
-- The authorization asks for "blocking and migration classifications". A third class is unavoidable
-- and is the important one:
--   BLOCKING   — an APPROVED KPI still fed by this source. Retiring would silently starve official
--                reporting. Must be resolved first.
--   MIGRATION  — a draft/pending KPI. Re-point it; nothing official depends on it yet.
--   HISTORICAL — locked snapshots and issued board packs that USED this source. These are NEVER
--                blocking and MUST NEVER be "resolved": you cannot fix history and you must not try.
--                They are reported so a retirement decision is made with open eyes, not to gate it.
-- Collapsing HISTORICAL into BLOCKING would make every source with any history permanently
-- un-retirable. Collapsing it into MIGRATION would invite someone to "migrate" a locked snapshot —
-- i.e. rewrite governed history, which D-1 forbids outright.

-- ── 1. blast radius — read-only, derived, honest about its own limits ───────
CREATE OR REPLACE FUNCTION public.strata_data_source_blast_radius(p_source uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src record;
  v_runs uuid[];
  v_blocking jsonb; v_migration jsonb; v_historical jsonb;
  v_cv_count int; v_actuals int;
BEGIN
  SELECT * INTO v_src FROM public.strata_data_sources WHERE id = p_source;
  IF v_src.id IS NULL THEN RAISE EXCEPTION 'data source not found'; END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO v_runs
    FROM public.strata_upload_runs WHERE data_source_id = p_source;

  -- BLOCKING: approved KPIs fed by this source. Named, not counted — a decision needs the names.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type', 'kpi', 'id', k.id, 'name', k.name, 'version', k.version,
           'lineage_id', k.lineage_id, 'status', k.status,
           'reason', 'an approved KPI is fed by this source; retiring it would stop official reporting for this KPI')), '[]'::jsonb)
    INTO v_blocking
    FROM public.strata_kpis k
   WHERE k.data_source_id = p_source AND k.status = 'approved';

  -- MIGRATION: not yet official — re-point and move on.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type', 'kpi', 'id', k.id, 'name', k.name, 'status', k.status,
           'reason', 'not yet approved — re-point it to another source before this one retires')), '[]'::jsonb)
    INTO v_migration
    FROM public.strata_kpis k
   WHERE k.data_source_id = p_source AND k.status <> 'approved';

  -- HISTORICAL: locked snapshots and issued packs whose numbers came from this source's runs.
  -- Reported so the decision is informed; NEVER blocking, NEVER "migratable" (D-1: history is not
  -- rewritten). This is the forward impact P4-D4 could not derive.
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
           'type', 'locked_snapshot', 'id', s.id, 'snapshot_key', s.snapshot_key,
           'locked_at', s.locked_at,
           'reason', 'this snapshot''s frozen numbers were produced from this source; it is preserved unchanged and is not a blocker')), '[]'::jsonb)
    INTO v_historical
    FROM public.strata_calculated_values cv
    JOIN public.strata_snapshots s ON s.id = cv.snapshot_id
   WHERE cv.source_run_ids && v_runs AND s.status = 'locked';

  SELECT count(*) INTO v_cv_count FROM public.strata_calculated_values WHERE source_run_ids && v_runs;
  SELECT count(*) INTO v_actuals FROM public.strata_kpi_actuals WHERE upload_run_id = ANY (v_runs);

  RETURN jsonb_build_object(
    'data_source', jsonb_build_object('id', v_src.id, 'name', v_src.name, 'status', v_src.status),
    'upload_runs', array_length(v_runs, 1),
    'kpi_actuals_from_source', v_actuals,
    'calculated_values_from_source', v_cv_count,
    'blocking', v_blocking,
    'migration', v_migration,
    'historical', v_historical,
    'board_packs_over_affected_snapshots', (
      SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
               'type', 'board_pack', 'id', bp.id, 'issue_status', bp.issue_status, 'version', bp.version)), '[]'::jsonb)
        FROM public.strata_board_packs bp
       WHERE bp.snapshot_id IN (
         SELECT cv.snapshot_id FROM public.strata_calculated_values cv
          WHERE cv.source_run_ids && v_runs AND cv.snapshot_id IS NOT NULL)),
    'can_retire', (jsonb_array_length(v_blocking) = 0),
    -- Say what this analysis CANNOT see, on every response. A KPI whose actuals were entered
    -- manually carries no upload_run_id, so it leaves no trace back to a source: absence from
    -- `historical` is not proof a source was uninvolved. Same discipline as the integrity register.
    'coverage_note', 'Derived from upload_run lineage (data_source -> upload_runs -> calculated_values.source_run_ids -> snapshot). Manually entered actuals carry no upload_run_id and therefore cannot be traced to a source: absence from `historical` is NOT evidence that this source was uninvolved.'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_data_source_blast_radius(uuid) TO authenticated;

-- ── 2. lifecycle transitions ────────────────────────────────────────────────
-- Nothing enforced these before: status was a free-form column. Each transition is stated
-- explicitly rather than allowing arbitrary jumps, because "registered -> retired" skipping
-- activation means a source that never proved it works is now recorded as having been decommissioned.
CREATE OR REPLACE FUNCTION public.strata_set_data_source_status(
  p_source uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v record; v_blast jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','data_steward']) THEN
    RAISE EXCEPTION 'changing a data source''s status requires the strategy_office, data_steward or admin role';
  END IF;
  IF p_status NOT IN ('registered','active','suspended','retired') THEN
    RAISE EXCEPTION 'status must be registered | active | suspended | retired';
  END IF;
  SELECT * INTO v FROM public.strata_data_sources WHERE id = p_source;
  IF v.id IS NULL THEN RAISE EXCEPTION 'data source not found'; END IF;
  IF v.status = p_status THEN
    RAISE EXCEPTION 'this data source is already %', p_status;
  END IF;
  IF v.status = 'retired' THEN
    RAISE EXCEPTION 'this data source is retired — retirement is terminal; register a new source instead of reviving a decommissioned one';
  END IF;

  -- Legal transitions, stated rather than implied.
  IF NOT (
       (v.status = 'registered' AND p_status IN ('active','retired'))       -- validated -> active, or abandoned
    OR (v.status = 'active'     AND p_status IN ('suspended','retired'))
    OR (v.status = 'suspended'  AND p_status IN ('active','retired'))       -- resumed or given up on
  ) THEN
    RAISE EXCEPTION 'cannot go from % to % — allowed: registered→active|retired, active→suspended|retired, suspended→active|retired', v.status, p_status;
  END IF;

  -- Retirement is the only transition with a dependents gate. Suspension deliberately has none:
  -- suspending is how you STOP a bad feed, and blocking that behind its dependents would mean the
  -- more important a broken source is, the harder it is to stop. Suspension is reversible; the
  -- blast radius is returned so the cost is visible either way.
  v_blast := public.strata_data_source_blast_radius(p_source);
  IF p_status = 'retired' AND (v_blast->>'can_retire')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'cannot retire: % approved KPI(s) are still fed by this source. Re-point or retire them first. Blocking: %',
      jsonb_array_length(v_blast->'blocking'),
      (SELECT string_agg(b->>'name', ', ') FROM jsonb_array_elements(v_blast->'blocking') b);
  END IF;
  IF p_status = 'retired' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'a reason is required to retire a data source';
  END IF;

  UPDATE public.strata_data_sources SET status = p_status WHERE id = p_source;

  -- Historical lineage preservation (R3): nothing is deleted or re-pointed. The runs, actuals,
  -- calculated values, snapshots and packs that came from this source stay exactly as they are —
  -- retiring a source ends its FUTURE, it does not edit its past.
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note, before, after)
  VALUES ('strata_data_sources', p_source, 'RPC:set_data_source_status', auth.uid(),
          format('%s → %s%s', v.status, p_status, COALESCE(': ' || p_reason, '')),
          jsonb_build_object('status', v.status),
          jsonb_build_object('status', p_status, 'blast_radius_at_change', v_blast));

  RETURN v_blast;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_set_data_source_status(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.strata_data_source_blast_radius(uuid) IS
  'R3 downstream blast radius, derived from upload_run lineage — closes P4-D4''s labelled gap, which was true when written and is no longer. blocking = approved KPIs (retirement is refused while any exist). migration = not-yet-approved KPIs. historical = locked snapshots / issued packs, which are NEVER blocking and must never be "migrated" (D-1: history is not rewritten). Read-only; writes nothing. See coverage_note: manual actuals carry no run lineage, so absence is not evidence.';
