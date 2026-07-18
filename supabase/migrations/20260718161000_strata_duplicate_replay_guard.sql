-- ============================================================================
-- STRATA — DL-DEF-003: identical-payload replay detection + duplicate
-- canonical-promotion guard
-- CAT-STRATA-DLDEF-20260718-001 · Module 7 defect pack, Priority 2.1
--
-- RUN-21/RUN-22 proved an identical payload (same file_hash `06063cefcc2b`,
-- same template) creates a second run with no duplicate warning, and nothing
-- prevents both runs from promoting the same rows into canonical actuals.
--
-- Additive + idempotent (CREATE OR REPLACE of the two DL-DEF-007-hardened
-- functions; no data rewritten, no history touched):
--   1. strata_validate_run — when another import run with the same file_hash
--      + template exists (and has not been reversed), a run-level
--      severity='warning' finding (error_code 'duplicate_payload',
--      staging_row_id NULL) is recorded as retained evidence. Warnings do not
--      reject rows (unchanged contract).
--   2. strata_promote_run —
--        • pg_advisory_xact_lock on the payload checksum serializes
--          concurrent/double-click promotion of identical payloads;
--        • if an identical payload (file_hash + template) was ALREADY
--          promoted by another non-reversed import run, promotion raises and
--          writes nothing — a replayed payload can never duplicate canonical
--          actuals. Reversing the original run lifts the block.
--      Same-run retry stays idempotent (per-staging-row EXISTS + UNIQUE
--      (kpi_id, period_id, upload_run_id) backstop).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.strata_validate_run(p_run uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  run record;
  tpl record;
  row_rec record;
  err record;
  dup record;
  row_has_error boolean;
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

  -- DL-DEF-003: identical-payload replay detection (retained evidence).
  IF run.file_hash IS NOT NULL THEN
    SELECT r.run_key, r.created_at INTO dup
      FROM public.strata_upload_runs r
     WHERE r.id <> p_run
       AND r.file_hash = run.file_hash
       AND r.template_id = run.template_id
       AND COALESCE(r.run_type, 'import') = 'import'
       AND r.reversed_by_run_id IS NULL
     ORDER BY r.created_at DESC
     LIMIT 1;
    IF dup IS NOT NULL THEN
      INSERT INTO public.strata_validation_results
        (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
      VALUES
        (p_run, NULL, 'payload', 'duplicate_payload', 'warning',
         format('This payload (checksum %s) is identical to run %s ingested %s',
                run.file_hash, dup.run_key, to_char(dup.created_at, 'DD Mon YYYY HH24:MI')),
         format('If this is an unintended replay, do not promote; run %s already carries this payload', dup.run_key));
    END IF;
  END IF;

  FOR row_rec IN
    SELECT * FROM public.strata_staging_rows
     WHERE upload_run_id = p_run
     ORDER BY row_number
  LOOP
    row_has_error := false;

    FOR err IN
      SELECT * FROM public.strata_staging_row_errors(
        row_rec.raw, tpl.column_schema, tpl.target_entity, row_rec.row_number)
    LOOP
      INSERT INTO public.strata_validation_results
        (upload_run_id, staging_row_id, field_name, error_code, severity, message, suggested_fix)
      VALUES
        (p_run, row_rec.id, err.field_name, err.error_code, 'error', err.message, err.suggested_fix);
      row_has_error := true;
    END LOOP;

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
  'Validates a staging run via strata_staging_row_errors; records a run-level duplicate_payload warning when an identical non-reversed payload (file_hash + template) already exists. DL-DEF-007 + DL-DEF-003 hardened.';

CREATE OR REPLACE FUNCTION public.strata_promote_run(p_run uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  run record;
  tpl record;
  row_rec record;
  dup record;
  v_kpi uuid;
  v_period uuid;
  v_value numeric;
  v_conf numeric;
  new_actual uuid;
  n_promoted int := 0;
  n_skipped int := 0;
  err_detail text;
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

  -- DL-DEF-003: serialize concurrent promotion of identical payloads
  -- (double-click / retry / parallel sessions) for this transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended('strata_promote:' || COALESCE(run.file_hash, p_run::text), 0));

  -- DL-DEF-003: a replayed payload must never duplicate canonical actuals.
  IF run.file_hash IS NOT NULL THEN
    SELECT r.run_key INTO dup
      FROM public.strata_upload_runs r
     WHERE r.id <> p_run
       AND r.file_hash = run.file_hash
       AND r.template_id = run.template_id
       AND COALESCE(r.run_type, 'import') = 'import'
       AND r.reversed_by_run_id IS NULL
       AND EXISTS (SELECT 1 FROM public.strata_kpi_actuals a WHERE a.upload_run_id = r.id)
     ORDER BY r.created_at DESC
     LIMIT 1;
    IF dup IS NOT NULL THEN
      RAISE EXCEPTION
        'promotion blocked: identical payload (checksum %) was already promoted by run % — no rows were promoted; reverse that run first or import a corrected file',
        run.file_hash, dup.run_key;
    END IF;
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

    -- DL-DEF-007: never trust the staged 'valid' verdict (full transactional
    -- re-validation; any failure rolls back the entire promotion).
    SELECT string_agg(format('%s [%s]: %s', e.field_name, e.error_code, e.message), ' · ')
      INTO err_detail
      FROM public.strata_staging_row_errors(
             row_rec.raw, tpl.column_schema, tpl.target_entity, row_rec.row_number) e;
    IF err_detail IS NOT NULL THEN
      RAISE EXCEPTION
        'promotion blocked: staged row % failed re-validation — % — no rows were promoted; re-run validation on this run',
        row_rec.row_number, err_detail;
    END IF;

    SELECT id INTO v_kpi FROM public.strata_kpis
     WHERE slug = btrim(row_rec.raw ->> 'kpi_slug') AND status = 'approved';
    SELECT id INTO v_period FROM public.strata_periods
     WHERE name = btrim(row_rec.raw ->> 'period');
    IF v_kpi IS NULL OR v_period IS NULL THEN
      RAISE EXCEPTION
        'promotion blocked: staged row % no longer resolves to an approved KPI and period — no rows were promoted',
        row_rec.row_number;
    END IF;

    v_value := replace(btrim(row_rec.raw ->> 'value'), ',', '')::numeric;
    v_conf := NULL;
    IF btrim(COALESCE(row_rec.raw ->> 'confidence', '')) <> '' THEN
      v_conf := replace(btrim(row_rec.raw ->> 'confidence'), ',', '')::numeric;
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
  'Promotes VALID staging rows of a completed run into strata_kpi_actuals as pending. DL-DEF-007: per-row transactional re-validation (any failure = zero writes). DL-DEF-003: checksum advisory lock + identical-payload duplicate-promotion block (lifted only by reversing the promoted run). Idempotent per staging row.';
