-- CAT-STRATA-IMPL-20260712-001 · step 6b / B1 · snapshot config-version completeness
-- Plan Lock: blueprint §4 + §8.3 · F-9 ("Locked snapshots freeze these identifiers").
--
-- §4's gap, verified in the shipped body: config_versions recorded
--   { perspectives[{id,version}], threshold_schemes[{id,version}], scorecard_models[{id,version}] }
-- and each of those sub-selects is `WHERE status='approved'` with NO link to the snapshot — i.e. it
-- stamps EVERY approved config in the system, not the ones this snapshot USED. KPIs, formula
-- versions and model measures were absent entirely. §4: "today's blob OVER-CLAIMS".
--
-- WHY THIS IS NOW POSSIBLE (and was not before step 6a): strata_snapshot_items freezes
-- `to_jsonb(cv)`, and as of 20260717100000 every calculated value carries its COMPLETE provenance in
-- config_context (kpi id + lineage + version, formula version, target version, threshold scheme +
-- ITS version, resolved_as_of). So "the configs USED" is no longer a guess — it is derivable from
-- what actually happened, by reading the frozen items back. That is why config_versions is written
-- AFTER the items are frozen, not before.
--
-- FORWARD-ONLY (D-1, §7, §8.3): this changes the RPC only. **No existing snapshot row is touched.**
-- The two existing locked snapshots stay byte-identical; they are annotated in
-- strata_integrity_exceptions instead (E-1), never rewritten. Verified after apply.
--
-- Legacy blob retained under `all_approved_at_lock`: dropping it would lose information the two
-- existing snapshots are annotated against, and it is genuinely useful as "what else existed then".
-- It is explicitly labelled so it can never again be mistaken for "what this snapshot used".

CREATE OR REPLACE FUNCTION public.strata_lock_snapshot(
  p_name text, p_cycle uuid, p_period uuid,
  p_instance_ids uuid[] DEFAULT NULL::uuid[], p_scope jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE snap uuid; runs uuid[]; cfg jsonb; used jsonb; n_draft_excluded int; n_items_incomplete int;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'locking a snapshot requires strategy_office or admin role';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT a.upload_run_id) FILTER (WHERE a.upload_run_id IS NOT NULL), '{}')
    INTO runs
    FROM public.strata_kpi_actuals a
   WHERE a.period_id = p_period AND a.validation_status = 'validated';

  -- Base blob, unchanged in content but now HONESTLY LABELLED: this is everything approved at lock
  -- time, NOT what this snapshot used. The used-only record is added below.
  SELECT jsonb_build_object(
    'all_approved_at_lock', jsonb_build_object(
      'perspectives',      (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved'),
      'threshold_schemes', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_threshold_schemes WHERE status = 'approved'),
      'scorecard_models',  (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_scorecard_models WHERE status = 'approved')
    ),
    -- kept at the top level too, so existing readers of config_versions->'perspectives' keep working
    'perspectives',      (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_perspectives WHERE status = 'approved'),
    'threshold_schemes', (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_threshold_schemes WHERE status = 'approved'),
    'scorecard_models',  (SELECT jsonb_agg(jsonb_build_object('id', id, 'version', version)) FROM public.strata_scorecard_models WHERE status = 'approved')
  ) INTO cfg;

  INSERT INTO public.strata_snapshots (name, cycle_id, period_id, scope, config_versions, data_run_ids, created_by, approved_by)
  VALUES (p_name, p_cycle, p_period,
          COALESCE(p_scope, jsonb_build_object('instance_ids', to_jsonb(COALESCE(p_instance_ids, '{}'::uuid[])))),
          cfg, runs, auth.uid(), auth.uid())
  RETURNING id INTO snap;

  INSERT INTO public.strata_snapshot_items (snapshot_id, entity_type, entity_id, payload)
  SELECT snap, cv.entity_type, cv.entity_id,
         (to_jsonb(cv) - 'id' - 'snapshot_id')
         || jsonb_build_object('entity_name', public.strata_entity_name(cv.entity_type, cv.entity_id))
    FROM public.strata_calculated_values cv
   WHERE cv.period_id = p_period
     AND cv.calculated_at = (
       SELECT max(cv2.calculated_at) FROM public.strata_calculated_values cv2
        WHERE cv2.entity_type = cv.entity_type AND cv2.entity_id = cv.entity_id
          AND cv2.period_id = cv.period_id AND cv2.metric_key = cv.metric_key
     );

  -- ── B1 §4: the configs USED, derived from the frozen items' own provenance ──
  -- ONLY items carrying FULL provenance contribute (kpi_version present ⇒ written by the post-step-6a
  -- calc). Items without it are COUNTED, not silently folded in.
  -- Why this matters, found by probing a real lock: strata_calc_scorecard_instance still writes a
  -- config_context with threshold_scheme_id but NO threshold_scheme_version, so a naive DISTINCT
  -- produced the SAME scheme twice — {id, version:null} and {id, version:"1"} — which reads as two
  -- different configurations. Deduping the null away would have OVER-CLAIMED completeness, the exact
  -- fault §4 exists to fix. Counting the gap is the honest form, and the count is the to-do list for
  -- wiring the remaining calcs (step 6c).
  WITH ctx AS (
    SELECT si.payload->'config_context' AS c
      FROM public.strata_snapshot_items si
     WHERE si.snapshot_id = snap
       AND jsonb_typeof(si.payload->'config_context') = 'object'
       AND si.payload->'config_context'->>'kpi_version' IS NOT NULL
  )
  SELECT jsonb_build_object(
    'kpis', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'kpi_id', 'version', c->>'kpi_version',
                'lineage_id', c->>'kpi_lineage_id', 'revision_class', c->>'kpi_revision_class'))
               FROM ctx WHERE c->>'kpi_id' IS NOT NULL),
    'kpi_formula_versions', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'formula_version_id', 'version', c->>'formula_version'))
               FROM ctx WHERE c->>'formula_version_id' IS NOT NULL),
    'kpi_targets', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'target_id', 'version', c->>'target_version'))
               FROM ctx WHERE c->>'target_id' IS NOT NULL),
    'threshold_schemes', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', c->>'threshold_scheme_id', 'version', c->>'threshold_scheme_version'))
               FROM ctx WHERE c->>'threshold_scheme_id' IS NOT NULL),
    'model_measures', (SELECT jsonb_agg(DISTINCT jsonb_build_object(
                'id', m.id, 'model_id', m.model_id, 'kpi_id', m.kpi_id, 'weight', m.weight))
               FROM public.strata_scorecard_model_measures m
              WHERE m.kpi_id IN (SELECT (c->>'kpi_id')::uuid FROM ctx WHERE c->>'kpi_id' IS NOT NULL)),
    'resolved_as_of', (SELECT max(c->>'resolved_as_of') FROM ctx)
  ) INTO used;

  -- DEF-010/E-7: prove the exclusion was APPLIED, rather than asserting it. Counts the KPIs that
  -- had eligible actuals this period but no approved effective version — i.e. exactly what was
  -- excluded from this snapshot's numbers.
  SELECT count(DISTINCT a.kpi_id) INTO n_draft_excluded
    FROM public.strata_kpi_actuals a
    JOIN public.strata_periods p ON p.id = a.period_id
   WHERE a.period_id = p_period
     AND public.strata_resolve_kpi_effective(a.kpi_id, p.ends_on::timestamptz) IS NULL;

  -- Honest completeness accounting: how many frozen items DON'T carry full provenance yet.
  -- Non-zero means this snapshot's `used` block is a lower bound — say so in the record itself
  -- rather than letting a reader assume it is a census.
  SELECT count(*) INTO n_items_incomplete
    FROM public.strata_snapshot_items si
   WHERE si.snapshot_id = snap
     AND (jsonb_typeof(si.payload->'config_context') <> 'object'
          OR si.payload->'config_context'->>'kpi_version' IS NULL);

  UPDATE public.strata_snapshots
     SET config_versions = cfg
       || jsonb_build_object('used', used)
       || jsonb_build_object('selection_semantics', 'used_only: derived from the config_context frozen on each item')
       || jsonb_build_object('provenance_completeness', jsonb_build_object(
            'items_with_full_provenance', (SELECT count(*) FROM public.strata_snapshot_items si
                                            WHERE si.snapshot_id = snap
                                              AND si.payload->'config_context'->>'kpi_version' IS NOT NULL),
            'items_without_full_provenance', n_items_incomplete,
            'note', CASE WHEN n_items_incomplete > 0
                    THEN 'LOWER BOUND: some frozen items predate full provenance capture or come from a calc not yet wired to the canonical resolver (step 6c). Their configs are NOT listed in `used`.'
                    ELSE 'complete: every frozen item carries its full resolved version context' END))
       || jsonb_build_object('draft_kpi_exclusion', jsonb_build_object(
            'rule', 'only KPI versions approved AND effective at the period end contribute (E-7/DEF-010)',
            'kpis_excluded_with_actuals', n_draft_excluded))
   WHERE id = snap;

  UPDATE public.strata_calculated_values SET snapshot_id = snap
   WHERE period_id = p_period AND snapshot_id IS NULL;

  IF p_instance_ids IS NOT NULL THEN
    UPDATE public.strata_scorecard_instances
       SET status = 'locked', locked_snapshot_id = snap, updated_at = now()
     WHERE id = ANY (p_instance_ids);
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_snapshots', snap, 'RPC:lock_snapshot', auth.uid(), p_name);
  RETURN snap;
END;
$function$;
