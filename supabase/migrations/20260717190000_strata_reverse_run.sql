-- CAT-STRATA-IMPL-20260712-001 · R4d · 24-hour import reversal (D-7, E-5)
-- D-7: undo = immutable supersession + reversal LEDGER. NOT negative/offsetting measurements.
--   Preserve the original run and actuals · compensating reversal run referencing the original ·
--   mark affected actuals reversed/superseded · restore the prior effective state where one existed.
--   Allowed only: within 24h · before a locked snapshot · before dependent board-pack issuance ·
--   before a later run makes reversal unsafe. Prefer ATOMIC; never leave a partial reversal.
-- E-5: restore the previous VALIDATED effective state; if none exists, leave NO effective value.
--   **Never create zero, negative or artificial offset measurements.** Recalculate UNLOCKED only.
--
-- ── Why supersession and not an offsetting entry ────────────────────────────
-- A -100 "correction" is a measurement that never happened. It would sit in the ledger as though
-- someone observed -100, and every downstream average, trend and audit would read it as data. The
-- original actual is marked `reversed` and stops counting (it is not in R4b's eligible set); the
-- prior validated actual, if there is one, becomes effective again. Nothing is invented and nothing
-- is deleted.
--
-- ── Reuse ──────────────────────────────────────────────────────────────────
-- `reversed` already exists on strata_kpi_actuals' CHECK (R4a) and is already excluded from
-- calculations (R4b's eligible set). strata_calc_kpi_achievement already picks the most recent
-- eligible actual, so "restoring" the prior value requires NO repointing — un-reversing the newest
-- row simply lets the older validated one win again. No new state machine.

ALTER TABLE public.strata_upload_runs ADD COLUMN IF NOT EXISTS run_type text NOT NULL DEFAULT 'import';
ALTER TABLE public.strata_upload_runs DROP CONSTRAINT IF EXISTS strata_upload_runs_run_type_check;
ALTER TABLE public.strata_upload_runs
  ADD CONSTRAINT strata_upload_runs_run_type_check CHECK (run_type IN ('import','reversal'));
ALTER TABLE public.strata_upload_runs ADD COLUMN IF NOT EXISTS reverses_run_id uuid REFERENCES public.strata_upload_runs(id);
ALTER TABLE public.strata_upload_runs ADD COLUMN IF NOT EXISTS reversed_by_run_id uuid REFERENCES public.strata_upload_runs(id);
ALTER TABLE public.strata_upload_runs ADD COLUMN IF NOT EXISTS reversal_reason text;

-- One reversal per run: two would both claim to have undone it.
CREATE UNIQUE INDEX IF NOT EXISTS strata_upload_runs_one_reversal
  ON public.strata_upload_runs (reverses_run_id) WHERE reverses_run_id IS NOT NULL;

ALTER TABLE public.strata_kpi_actuals ADD COLUMN IF NOT EXISTS reversed_by_run_id uuid REFERENCES public.strata_upload_runs(id);

COMMENT ON COLUMN public.strata_upload_runs.run_type IS
  'import | reversal. A reversal run is a compensating LEDGER entry (D-7) — it references the run it reverses and carries no measurements of its own. Reversal is supersession, never an offsetting number.';

-- ── the eligibility check, separated so the UI can ASK before offering the verb ──
-- Returns every blocking reason rather than the first: a user told "locked snapshot" who fixes that
-- and is then told "issued board pack" has been misled twice. All reasons, once.
CREATE OR REPLACE FUNCTION public.strata_run_reversal_eligibility(p_run uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- NOTE: append with array_append, never `reasons || 'literal'`. An untyped literal on the right of
-- || makes Postgres choose array||array and try to PARSE the sentence as an array literal, which
-- raises "malformed array literal" at runtime. It bit the two plain-string reasons here while the
-- format()-built one (explicitly text) worked — so the bug only appeared for already-reversed and
-- is-a-reversal runs: an opaque crash exactly where a clean reason was the whole point.
DECLARE r record; reasons text[] := '{}'; v_actuals uuid[]; v_periods uuid[];
BEGIN
  SELECT * INTO r FROM public.strata_upload_runs WHERE id = p_run;
  IF r.id IS NULL THEN RAISE EXCEPTION 'run not found'; END IF;

  SELECT COALESCE(array_agg(id), '{}'), COALESCE(array_agg(DISTINCT period_id), '{}')
    INTO v_actuals, v_periods
    FROM public.strata_kpi_actuals WHERE upload_run_id = p_run AND validation_status <> 'reversed';

  IF r.run_type = 'reversal' THEN
    reasons := array_append(reasons, 'this IS a reversal run — reversing a reversal would re-apply the original data by sleight of hand');
  END IF;
  IF r.reversed_by_run_id IS NOT NULL THEN
    reasons := array_append(reasons, 'this run has already been reversed');
  END IF;

  -- 24h window (D-7)
  IF r.completed_at IS NULL THEN
    reasons := array_append(reasons, 'this run never completed — there is nothing committed to reverse');
  ELSIF now() - r.completed_at > interval '24 hours' THEN
    reasons := array_append(reasons, format('the 24-hour window has passed (completed %s ago)',
                                 date_trunc('minute', now() - r.completed_at)));
  END IF;

  -- entered a LOCKED SNAPSHOT (D-7) — the numbers are frozen and published
  IF EXISTS (SELECT 1 FROM public.strata_calculated_values cv
              JOIN public.strata_snapshots s ON s.id = cv.snapshot_id
             WHERE cv.source_run_ids && ARRAY[p_run] AND s.status = 'locked') THEN
    reasons := array_append(reasons, 'this run''s data is inside a LOCKED snapshot — reversing would contradict published numbers');
  END IF;

  -- a LOCKED/CLOSED PERIOD (E-5: recalculate unlocked results only)
  IF EXISTS (SELECT 1 FROM public.strata_periods p
              WHERE p.id = ANY (v_periods) AND p.close_status <> 'open') THEN
    reasons := array_append(reasons, 'this run touches a period that is not open — closed periods are not recalculated');
  END IF;

  -- an ISSUED board pack (D-7)
  IF EXISTS (SELECT 1 FROM public.strata_board_packs bp
              WHERE bp.issue_status IN ('issued','superseded')
                AND bp.snapshot_id IN (SELECT cv.snapshot_id FROM public.strata_calculated_values cv
                                        WHERE cv.source_run_ids && ARRAY[p_run] AND cv.snapshot_id IS NOT NULL)) THEN
    reasons := array_append(reasons, 'a board pack over this run''s snapshot has been ISSUED — the board already received these numbers');
  END IF;

  -- a LATER run made reversal unsafe (D-7): a newer actual exists for the same KPI+period, so
  -- reversing this one would restore a value that a later submission already replaced.
  IF EXISTS (
    SELECT 1 FROM public.strata_kpi_actuals a
      JOIN public.strata_kpi_actuals later
        ON later.kpi_id = a.kpi_id AND later.period_id = a.period_id
       AND later.upload_run_id IS DISTINCT FROM p_run
       AND later.submitted_at > a.submitted_at
       AND later.validation_status IN ('validated','accepted_with_exception')
     WHERE a.upload_run_id = p_run) THEN
    reasons := array_append(reasons, 'a LATER submission has already superseded this run''s data for at least one KPI/period — reversing now would resurrect a value the later run replaced');
  END IF;

  RETURN jsonb_build_object(
    'run_id', p_run, 'run_type', r.run_type, 'completed_at', r.completed_at,
    'affected_actuals', array_length(v_actuals, 1),
    'can_reverse', (array_length(reasons, 1) IS NULL),
    'blocking_reasons', to_jsonb(reasons));
END;
$function$;

-- ── the reversal itself — atomic by construction ────────────────────────────
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
  INSERT INTO public.strata_upload_runs
    (data_source_id, status, run_type, reverses_run_id, reversal_reason, started_at, completed_at, initiated_by)
  VALUES (r.data_source_id, 'completed', 'reversal', p_run, p_reason, now(), now(), auth.uid())
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

    -- E-5: the PRIOR valid, non-reversed actual for the same KPI/period becomes effective again.
    -- Nothing is repointed or rewritten: the calc already takes the most recent ELIGIBLE actual, so
    -- removing the newer one from the eligible set restores the older automatically.
    SELECT id INTO v_prior FROM public.strata_kpi_actuals
     WHERE kpi_id = a.kpi_id AND period_id = a.period_id AND id <> a.id
       AND validation_status IN ('validated','accepted_with_exception')
     ORDER BY validated_at DESC NULLS LAST, submitted_at DESC LIMIT 1;

    IF v_prior IS NOT NULL THEN
      v_restored := v_restored + 1;
    ELSE
      -- E-5: "otherwise leave no effective value". No zero. No negative. No placeholder.
      v_none := v_none + 1;
    END IF;

    v_report := v_report || jsonb_build_object(
      'kpi_id', a.kpi_id, 'period_id', a.period_id, 'reversed_actual', a.id,
      'restored_actual', v_prior,
      'effective_after_reversal', CASE WHEN v_prior IS NULL THEN 'none (no prior validated value — left empty, not zeroed)'
                                       ELSE 'prior validated value' END);
  END LOOP;

  -- E-5: recalculate UNLOCKED results only. A locked period is never touched; the eligibility gate
  -- above already refuses a run that reaches one, so this loop only ever sees open periods.
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

GRANT EXECUTE ON FUNCTION public.strata_run_reversal_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_reverse_run(uuid, text) TO authenticated;
