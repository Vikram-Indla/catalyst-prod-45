-- ============================================================================
-- STRATA R2 — Upload pipeline: server-side validation + promotion RPCs
-- CAT-STRATA-20260705-001 · Blueprint §19, §22 · Flow 1
-- strata_validate_run:  staging → validating → completed|failed, writing
--                       strata_validation_results + per-row verdicts.
-- strata_promote_run:   completed run → strata_kpi_actuals (validation_status
--                       'pending' — attestation stays a separate human step,
--                       SoD preserved via strata_attest_actual). Idempotent.
-- NOT APPLIED ANYWHERE YET — see features/CAT-STRATA-20260705-001/
-- 12_ROLLOUT_RUNBOOK_UPLOADS.md for the apply procedure (staging only).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- strata_validate_run(p_run)
-- Guard: data_steward | kpi_owner | strategy_office | admin (mirrors the
-- strata_runs_insert RLS role set). Run must be status 'staging'.
-- Checks per staging row against the run template's column_schema
-- [{column,label,type,required}]:
--   • required column present and non-blank            → error missing_required
--   • type='number' coerces to numeric                 → error not_numeric
-- Plus, for target_entity = 'kpi_actual':
--   • kpi_slug resolves to an APPROVED strata_kpis row → error kpi_not_found
--   • period resolves to exactly one strata_periods row → error period_not_found
--                                                        / period_ambiguous
--   • resolved period is open (seed rule 'period_open') → error period_closed
-- Rows with ≥1 error → 'rejected'; otherwise 'valid' (warnings do not reject).
-- Run counters updated; status → 'completed', or 'failed' when zero valid rows.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_validate_run(p_run uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  run record;
  tpl record;
  row_rec record;
  c_col text; c_label text; c_type text; c_required boolean;
  raw_value text;
  row_has_error boolean;
  v_kpi uuid;
  v_period uuid;
  period_matches int;
  period_closed boolean;
  n_valid int := 0;
  n_rejected int := 0;
  new_status text;
BEGIN
  IF NOT public.strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office']) THEN
    RAISE EXCEPTION 'run validation requires data_steward, kpi_owner, strategy_office or admin role';
  END IF;

  SELECT * INTO run FROM public.strata_upload_runs WHERE id = p_run;
  IF run IS NULL THEN RAISE EXCEPTION 'upload run not found'; END IF;
  IF run.status <> 'staging' THEN
    RAISE EXCEPTION 'only runs in staging can be validated (current: %)', run.status;
  END IF;
  IF run.template_id IS NULL THEN
    RAISE EXCEPTION 'run has no upload template; template-less runs cannot be validated';
  END IF;

  SELECT * INTO tpl FROM public.strata_upload_templates WHERE id = run.template_id;
  IF tpl IS NULL THEN RAISE EXCEPTION 'upload template not found'; END IF;
  IF tpl.status <> 'approved' THEN
    RAISE EXCEPTION 'upload template must be approved (current: %)', tpl.status;
  END IF;

  UPDATE public.strata_upload_runs
     SET status = 'validating', updated_at = now()
   WHERE id = p_run;

  -- Idempotent re-entry within the state machine: clear prior findings.
  DELETE FROM public.strata_validation_results WHERE upload_run_id = p_run;

  FOR row_rec IN
    SELECT * FROM public.strata_staging_rows
     WHERE upload_run_id = p_run
     ORDER BY row_number
  LOOP
    row_has_error := false;

    -- 1) Template column_schema checks
    FOR c_col, c_label, c_type, c_required IN
      SELECT elem->>'column',
             COALESCE(elem->>'label', elem->>'column'),
             COALESCE(elem->>'type', 'text'),
             COALESCE((elem->>'required')::boolean, false)
        FROM jsonb_array_elements(tpl.column_schema) elem
    LOOP
      raw_value := row_rec.raw ->> c_col;

      IF c_required AND (raw_value IS NULL OR btrim(raw_value) = '') THEN
        INSERT INTO public.strata_validation_results
          (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
        VALUES
          (p_run, row_rec.id, c_col, 'missing_required', 'error',
           format('Row %s: required column "%s" is empty', row_rec.row_number, c_label),
           format('Provide a value for "%s"', c_label));
        row_has_error := true;
      ELSIF c_type = 'number' AND raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
        IF replace(btrim(raw_value), ',', '') !~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' THEN
          INSERT INTO public.strata_validation_results
            (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
          VALUES
            (p_run, row_rec.id, c_col, 'not_numeric', 'error',
             format('Row %s: "%s" is not a valid number for "%s"', row_rec.row_number, raw_value, c_label),
             format('Enter a plain numeric value for "%s" (no units or symbols)', c_label));
          row_has_error := true;
        END IF;
      END IF;
    END LOOP;

    -- 2) Entity resolution checks (kpi_actual runs)
    IF tpl.target_entity = 'kpi_actual' THEN
      -- kpi_slug → approved KPI
      raw_value := row_rec.raw ->> 'kpi_slug';
      IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
        SELECT id INTO v_kpi FROM public.strata_kpis
         WHERE slug = btrim(raw_value) AND status = 'approved';
        IF v_kpi IS NULL THEN
          INSERT INTO public.strata_validation_results
            (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
          VALUES
            (p_run, row_rec.id, 'kpi_slug', 'kpi_not_found', 'error',
             format('Row %s: "%s" does not match an approved KPI', row_rec.row_number, btrim(raw_value)),
             'Use the slug of an approved KPI from the KPI dictionary');
          row_has_error := true;
        END IF;
      END IF;

      -- period name → exactly one period, and it must be open
      raw_value := row_rec.raw ->> 'period';
      IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
        SELECT count(*) INTO period_matches
          FROM public.strata_periods WHERE name = btrim(raw_value);
        IF period_matches = 0 THEN
          INSERT INTO public.strata_validation_results
            (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
          VALUES
            (p_run, row_rec.id, 'period', 'period_not_found', 'error',
             format('Row %s: period "%s" does not exist', row_rec.row_number, btrim(raw_value)),
             'Use an exact period name, e.g. ''Q2 FY2026''');
          row_has_error := true;
        ELSIF period_matches > 1 THEN
          INSERT INTO public.strata_validation_results
            (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
          VALUES
            (p_run, row_rec.id, 'period', 'period_ambiguous', 'error',
             format('Row %s: period "%s" matches %s cycles', row_rec.row_number, btrim(raw_value), period_matches),
             'Disambiguate the period name (period names are only unique per cycle)');
          row_has_error := true;
        ELSE
          SELECT id, close_status = 'closed' INTO v_period, period_closed
            FROM public.strata_periods WHERE name = btrim(raw_value);
          IF period_closed THEN
            INSERT INTO public.strata_validation_results
              (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
            VALUES
              (p_run, row_rec.id, 'period', 'period_closed', 'error',
               format('Row %s: period "%s" is closed', row_rec.row_number, btrim(raw_value)),
               'Target an open period, or have the strategy office reopen the period');
            row_has_error := true;
          END IF;
        END IF;
      END IF;
    END IF;

    IF row_has_error THEN
      UPDATE public.strata_staging_rows
         SET validation_status = 'rejected', updated_at = now()
       WHERE id = row_rec.id;
      n_rejected := n_rejected + 1;
    ELSE
      UPDATE public.strata_staging_rows
         SET validation_status = 'valid', updated_at = now()
       WHERE id = row_rec.id;
      n_valid := n_valid + 1;
    END IF;
  END LOOP;

  new_status := CASE WHEN n_valid = 0 THEN 'failed' ELSE 'completed' END;

  UPDATE public.strata_upload_runs
     SET row_count_valid = n_valid,
         row_count_rejected = n_rejected,
         status = new_status,
         error_summary = CASE WHEN n_valid = 0
                              THEN format('validation produced zero valid rows (%s rejected)', n_rejected)
                              ELSE NULL END,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_run;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_upload_runs', p_run, 'RPC:validate_run', auth.uid(),
          format('staging → %s · %s valid / %s rejected', new_status, n_valid, n_rejected));

  RETURN jsonb_build_object(
    'run_id', p_run, 'status', new_status,
    'row_count_valid', n_valid, 'row_count_rejected', n_rejected);
END;
$$;

COMMENT ON FUNCTION public.strata_validate_run(uuid) IS
  'Flow 1 (blueprint §19/§22): validates a staging run against its template column_schema + KPI/period resolution, writes strata_validation_results, marks rows valid/rejected, completes or fails the run.';

-- ---------------------------------------------------------------------------
-- strata_promote_run(p_run)
-- Guard: same role set. Run must be 'completed'. Inserts strata_kpi_actuals
-- from VALID staging rows only, with entry_method 'upload', lineage back-refs
-- (upload_run_id, staging_row_id) and validation_status 'pending' — the human
-- attestation step (strata_attest_actual) remains separate, preserving the
-- strata_actual_sod CHECK (validated_by <> submitted_by).
-- Idempotent: staging rows that already produced an actual are skipped, as are
-- duplicates within the run (UNIQUE NULLS NOT DISTINCT (kpi_id, period_id,
-- upload_run_id) on strata_kpi_actuals).
-- Each write also records provenance in strata_lineage_records.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.strata_promote_run(p_run uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  run record;
  tpl record;
  row_rec record;
  v_kpi uuid;
  v_period uuid;
  v_value numeric;
  v_conf numeric;
  new_actual uuid;
  n_promoted int := 0;
  n_skipped int := 0;
BEGIN
  IF NOT public.strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office']) THEN
    RAISE EXCEPTION 'run promotion requires data_steward, kpi_owner, strategy_office or admin role';
  END IF;

  SELECT * INTO run FROM public.strata_upload_runs WHERE id = p_run;
  IF run IS NULL THEN RAISE EXCEPTION 'upload run not found'; END IF;
  IF run.status <> 'completed' THEN
    RAISE EXCEPTION 'only completed runs can be promoted (current: %)', run.status;
  END IF;
  IF run.template_id IS NULL THEN
    RAISE EXCEPTION 'run has no upload template; nothing to promote';
  END IF;

  SELECT * INTO tpl FROM public.strata_upload_templates WHERE id = run.template_id;
  IF tpl IS NULL THEN RAISE EXCEPTION 'upload template not found'; END IF;
  IF tpl.target_entity <> 'kpi_actual' THEN
    RAISE EXCEPTION 'promotion currently supports kpi_actual templates only (template targets %)', tpl.target_entity;
  END IF;

  FOR row_rec IN
    SELECT * FROM public.strata_staging_rows
     WHERE upload_run_id = p_run AND validation_status = 'valid'
     ORDER BY row_number
  LOOP
    -- Idempotency: this staging row already produced a canonical actual.
    IF EXISTS (SELECT 1 FROM public.strata_kpi_actuals WHERE staging_row_id = row_rec.id) THEN
      n_skipped := n_skipped + 1;
      CONTINUE;
    END IF;

    -- Re-resolve defensively; config may have moved since validation.
    SELECT id INTO v_kpi FROM public.strata_kpis
     WHERE slug = btrim(row_rec.raw ->> 'kpi_slug') AND status = 'approved';
    SELECT id INTO v_period FROM public.strata_periods
     WHERE name = btrim(row_rec.raw ->> 'period');
    IF v_kpi IS NULL OR v_period IS NULL THEN
      n_skipped := n_skipped + 1;
      CONTINUE;
    END IF;

    v_value := replace(btrim(row_rec.raw ->> 'value'), ',', '')::numeric;
    -- confidence is optional and constrained 0..1 on the table; NULL when absent/out-of-range.
    v_conf := NULL;
    IF btrim(COALESCE(row_rec.raw ->> 'confidence', '')) ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' THEN
      v_conf := btrim(row_rec.raw ->> 'confidence')::numeric;
      IF v_conf < 0 OR v_conf > 1 THEN v_conf := NULL; END IF;
    END IF;

    new_actual := NULL;
    INSERT INTO public.strata_kpi_actuals
      (kpi_id, period_id, value, entry_method, upload_run_id, staging_row_id,
       submitted_by, validation_status, confidence)
    VALUES
      (v_kpi, v_period, v_value, 'upload', p_run, row_rec.id,
       COALESCE(run.initiated_by, auth.uid()), 'pending', v_conf)
    ON CONFLICT (kpi_id, period_id, upload_run_id) DO NOTHING
    RETURNING id INTO new_actual;

    IF new_actual IS NULL THEN
      -- duplicate kpi+period within this run — first row wins
      n_skipped := n_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.strata_lineage_records
      (entity_table, entity_id, upload_run_id, staging_row_id, written_by, config_context)
    VALUES
      ('strata_kpi_actuals', new_actual, p_run, row_rec.id, auth.uid(),
       jsonb_build_object('template_id', run.template_id,
                          'template_version', run.template_version,
                          'template_slug', tpl.slug));

    n_promoted := n_promoted + 1;
  END LOOP;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_upload_runs', p_run, 'RPC:promote_run', auth.uid(),
          format('%s actuals written (pending attestation) · %s skipped', n_promoted, n_skipped));

  RETURN jsonb_build_object(
    'run_id', p_run, 'promoted', n_promoted, 'skipped', n_skipped);
END;
$$;

COMMENT ON FUNCTION public.strata_promote_run(uuid) IS
  'Flow 1 (blueprint §19): promotes VALID staging rows of a completed run into strata_kpi_actuals as pending (attestation via strata_attest_actual stays a separate human step — SoD). Idempotent per staging row.';
