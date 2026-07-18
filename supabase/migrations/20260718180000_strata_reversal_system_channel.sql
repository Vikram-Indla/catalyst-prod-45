-- ============================================================================
-- STRATA — DL-DEF-008: persist the canonical 'system' channel on reversal runs
-- CAT-STRATA-DLDEF-20260718-001 · Module 7 defect pack
--
-- RUN-24 was persisted with channel 'excel' (the column default) because the
-- strata_reverse_run compensating INSERT omitted channel; the UI compensated
-- with a client-side "System (reversal)" label. Server truth must not depend
-- on client relabelling.
--
-- Additive + idempotent:
--   1. channel CHECK gains 'system' (existing values untouched).
--   2. strata_reverse_run re-created identically EXCEPT the ledger INSERT now
--      persists channel='system'.
-- Historical runs (RUN-23/RUN-24) and audit events are NOT rewritten — the UI
-- keeps its display fallback for pre-fix reversal rows.
-- ============================================================================

ALTER TABLE public.strata_upload_runs DROP CONSTRAINT IF EXISTS strata_upload_runs_channel_check;
ALTER TABLE public.strata_upload_runs
  ADD CONSTRAINT strata_upload_runs_channel_check
  CHECK (channel IN ('excel','manual','jira','api','system'));

CREATE OR REPLACE FUNCTION public.strata_reverse_run(p_run uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record; elig jsonb; v_new uuid; v_reversed int := 0; v_restored int := 0; v_none int := 0;
  a record; v_prior uuid; v_recalc int := 0; v_report jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','data_steward']) THEN
    RAISE EXCEPTION 'reversing an import requires the strategy_office, data_steward or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a reason is required to reverse an import';
  END IF;

  SELECT * INTO r FROM public.strata_upload_runs WHERE id = p_run;
  IF r.id IS NULL THEN RAISE EXCEPTION 'run not found'; END IF;

  elig := public.strata_run_reversal_eligibility(p_run);
  IF (elig->>'can_reverse')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'cannot reverse this run: %',
      (SELECT string_agg(x, ' | ') FROM jsonb_array_elements_text(elig->'blocking_reasons') x);
  END IF;

  -- The compensating LEDGER entry. It carries NO measurements — that is the point of D-7.
  -- DL-DEF-008: persisted with the canonical 'system' channel (it is machine-written).
  INSERT INTO public.strata_upload_runs
    (data_source_id, status, run_type, channel, reverses_run_id, reversal_reason, started_at, completed_at, initiated_by)
  VALUES (r.data_source_id, 'completed', 'reversal', 'system', p_run, p_reason, now(), now(), auth.uid())
  RETURNING id INTO v_new;

  UPDATE public.strata_upload_runs SET reversed_by_run_id = v_new WHERE id = p_run;

  -- Supersede this run's actuals and restore the prior effective value where one exists (E-5).
  FOR a IN SELECT * FROM public.strata_kpi_actuals
            WHERE upload_run_id = p_run AND validation_status <> 'reversed'
  LOOP
    UPDATE public.strata_kpi_actuals
       SET validation_status = 'reversed', reversed_by_run_id = v_new, updated_at = now()
     WHERE id = a.id;
    v_reversed := v_reversed + 1;

    SELECT id INTO v_prior FROM public.strata_kpi_actuals
     WHERE kpi_id = a.kpi_id AND period_id = a.period_id AND id <> a.id
       AND validation_status IN ('validated','accepted_with_exception')
     ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;

    IF v_prior IS NOT NULL THEN
      v_restored := v_restored + 1;
    ELSE
      v_none := v_none + 1;
    END IF;

    v_report := v_report || jsonb_build_object(
      'kpi_id', a.kpi_id, 'period_id', a.period_id, 'reversed_actual', a.id,
      'restored_actual', v_prior,
      'effective_after_reversal', CASE WHEN v_prior IS NULL THEN 'none (no prior validated value — left empty, not zeroed)'
                                       ELSE 'prior validated value' END);
  END LOOP;

  FOR a IN SELECT DISTINCT k.kpi_id, k.period_id FROM public.strata_kpi_actuals k
            WHERE k.reversed_by_run_id = v_new
  LOOP
    PERFORM public.strata_calc_kpi_achievement(a.kpi_id, a.period_id);
    v_recalc := v_recalc + 1;
  END LOOP;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note, before, after)
  VALUES ('strata_upload_runs', p_run, 'RPC:reverse_run', auth.uid(),
          format('reversed by run %s: %s', v_new, p_reason),
          jsonb_build_object('run_id', p_run, 'actuals', v_reversed),
          jsonb_build_object('reversal_run_id', v_new, 'reversed', v_reversed,
                             'restored_prior', v_restored, 'left_without_value', v_none));

  RETURN jsonb_build_object(
    'reversal_run_id', v_new, 'original_run_id', p_run,
    'actuals_reversed', v_reversed,
    'prior_values_restored', v_restored,
    'left_without_effective_value', v_none,
    'recalculated', v_recalc,
    'detail', v_report,
    'note', 'The original run and its actuals are PRESERVED and unchanged; they are marked reversed and stop counting. No offsetting, zero or negative measurement was created (D-7/E-5).');
END;
$function$;
