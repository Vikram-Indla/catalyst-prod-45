-- ============================================================================
-- STRATA — DL-DEF-007: server-authoritative numeric boundary guard
-- CAT-STRATA-DLDEF-20260718-001 · Module 7 defect pack, Priority 1
--
-- RUN-27 proved strata_validate_run accepts confidence=1.1 (governed contract
-- is inclusive 0–1, mirrored by the strata_kpi_actuals CHECK) and that
-- strata_promote_run trusts the staged 'valid' verdict, silently NULLing an
-- out-of-range confidence instead of blocking.
--
-- This migration is additive + idempotent (CREATE OR REPLACE only; no data
-- rewritten, no audit/run/staging history touched):
--   1. strata_staging_row_errors(...)  — single shared row checker used by
--      BOTH validation and promotion:
--        • required-column and numeric-format checks (as before)
--        • explicit NaN/±Infinity rejection (not_finite)
--        • template contract range rules: optional "min"/"max" per number
--          column in column_schema are now enforced (value_out_of_range).
--          No universal non-negative rule is imposed — a KPI actual may be
--          negative unless its governed template/contract declares a minimum.
--        • kpi_actual contract: confidence must parse and lie in inclusive
--          0–1 (confidence_out_of_range / confidence_not_numeric)
--        • existing KPI/period resolution + open-period checks
--   2. strata_validate_run — same state machine, counters, evidence and audit
--      trail, but verdicts come from the shared checker.
--   3. strata_promote_run — re-runs the full checker on every staged 'valid'
--      row inside the promotion transaction. Any failure RAISEs, rolling back
--      the entire promotion: a tampered/stale staged row produces ZERO
--      canonical writes and cannot corrupt an existing official value. The
--      silent confidence-clamp-to-NULL is removed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Shared row checker
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_staging_row_errors(
  p_raw jsonb,
  p_schema jsonb,
  p_target_entity text,
  p_row_number int
) RETURNS TABLE (field_name text, error_code text, message text, suggested_fix text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  elem jsonb;
  c_col text; c_label text; c_type text; c_required boolean;
  c_min numeric; c_max numeric;
  raw_value text;
  cleaned text;
  v_num numeric;
  v_kpi uuid;
  period_matches int;
  period_is_closed boolean;
  conf_typed_in_schema boolean;
BEGIN
  -- 1a) Template column_schema checks
  FOR elem IN SELECT * FROM jsonb_array_elements(COALESCE(p_schema, '[]'::jsonb))
  LOOP
    c_col      := elem->>'column';
    c_label    := COALESCE(elem->>'label', elem->>'column');
    c_type     := COALESCE(elem->>'type', 'text');
    c_required := COALESCE((elem->>'required')::boolean, false);
    c_min      := NULLIF(btrim(COALESCE(elem->>'min','')), '')::numeric;
    c_max      := NULLIF(btrim(COALESCE(elem->>'max','')), '')::numeric;
    raw_value  := p_raw ->> c_col;

    IF c_required AND (raw_value IS NULL OR btrim(raw_value) = '') THEN
      RETURN QUERY SELECT c_col, 'missing_required'::text,
        format('Row %s: required column "%s" is empty', p_row_number, c_label),
        format('Provide a value for "%s"', c_label);
    ELSIF c_type = 'number' AND raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
      cleaned := replace(btrim(raw_value), ',', '');
      IF cleaned ~* '^[+-]?(nan|inf(inity)?)$' THEN
        RETURN QUERY SELECT c_col, 'not_finite'::text,
          format('Row %s: "%s" is not a finite number for "%s"', p_row_number, raw_value, c_label),
          format('Enter a plain finite numeric value for "%s"', c_label);
      ELSIF cleaned !~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' THEN
        RETURN QUERY SELECT c_col, 'not_numeric'::text,
          format('Row %s: "%s" is not a valid number for "%s"', p_row_number, raw_value, c_label),
          format('Enter a plain numeric value for "%s" (no units or symbols)', c_label);
      ELSE
        v_num := cleaned::numeric;
        IF c_min IS NOT NULL AND v_num < c_min THEN
          RETURN QUERY SELECT c_col, 'value_out_of_range'::text,
            format('Row %s: %s is below the contract minimum %s for "%s"', p_row_number, v_num, c_min, c_label),
            format('Provide a value of at least %s for "%s"', c_min, c_label);
        END IF;
        IF c_max IS NOT NULL AND v_num > c_max THEN
          RETURN QUERY SELECT c_col, 'value_out_of_range'::text,
            format('Row %s: %s exceeds the contract maximum %s for "%s"', p_row_number, v_num, c_max, c_label),
            format('Provide a value of at most %s for "%s"', c_max, c_label);
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 1b) kpi_actual governed contract checks
  IF p_target_entity = 'kpi_actual' THEN
    -- kpi_slug → approved KPI
    raw_value := p_raw ->> 'kpi_slug';
    IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
      SELECT id INTO v_kpi FROM public.strata_kpis
       WHERE slug = btrim(raw_value) AND status = 'approved';
      IF v_kpi IS NULL THEN
        RETURN QUERY SELECT 'kpi_slug'::text, 'kpi_not_found'::text,
          format('Row %s: "%s" does not match an approved KPI', p_row_number, btrim(raw_value)),
          'Use the slug of an approved KPI from the KPI dictionary'::text;
      END IF;
    END IF;

    -- period name → exactly one period, and it must be open
    raw_value := p_raw ->> 'period';
    IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
      SELECT count(*) INTO period_matches
        FROM public.strata_periods WHERE name = btrim(raw_value);
      IF period_matches = 0 THEN
        RETURN QUERY SELECT 'period'::text, 'period_not_found'::text,
          format('Row %s: period "%s" does not exist', p_row_number, btrim(raw_value)),
          'Use an exact period name, e.g. ''Q2 FY2026'''::text;
      ELSIF period_matches > 1 THEN
        RETURN QUERY SELECT 'period'::text, 'period_ambiguous'::text,
          format('Row %s: period "%s" matches %s cycles', p_row_number, btrim(raw_value), period_matches),
          'Disambiguate the period name (period names are only unique per cycle)'::text;
      ELSE
        SELECT close_status = 'closed' INTO period_is_closed
          FROM public.strata_periods WHERE name = btrim(raw_value);
        IF period_is_closed THEN
          RETURN QUERY SELECT 'period'::text, 'period_closed'::text,
            format('Row %s: period "%s" is closed', p_row_number, btrim(raw_value)),
            'Target an open period, or have the strategy office reopen the period'::text;
        END IF;
      END IF;
    END IF;

    -- confidence → inclusive 0–1 governed contract (mirrors the
    -- strata_kpi_actuals CHECK; the template labels the column "Confidence (0-1)")
    raw_value := p_raw ->> 'confidence';
    IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
      cleaned := replace(btrim(raw_value), ',', '');
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p_schema, '[]'::jsonb)) e
         WHERE e->>'column' = 'confidence' AND COALESCE(e->>'type','text') = 'number'
      ) INTO conf_typed_in_schema;
      IF cleaned ~* '^[+-]?(nan|inf(inity)?)$'
         OR cleaned !~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' THEN
        -- malformed: already reported by the schema loop when the template
        -- types confidence as a number; report here only when it does not.
        IF NOT conf_typed_in_schema THEN
          RETURN QUERY SELECT 'confidence'::text, 'confidence_not_numeric'::text,
            format('Row %s: confidence "%s" is not a valid finite number', p_row_number, raw_value),
            'Enter a plain numeric confidence between 0 and 1 inclusive'::text;
        END IF;
      ELSE
        v_num := cleaned::numeric;
        IF v_num < 0 OR v_num > 1 THEN
          RETURN QUERY SELECT 'confidence'::text, 'confidence_out_of_range'::text,
            format('Row %s: confidence %s is outside the governed contract 0–1 inclusive', p_row_number, v_num),
            'Provide a confidence between 0 and 1 inclusive (e.g. 0.9)'::text;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.strata_staging_row_errors(jsonb, jsonb, text, int) IS
  'DL-DEF-007: single authoritative staging-row checker (required/numeric/finite/contract min-max/KPI/period/confidence 0–1). Used by strata_validate_run AND re-run transactionally by strata_promote_run so a staged ''valid'' verdict is never trusted.';

-- ---------------------------------------------------------------------------
-- 2) strata_validate_run — verdicts now come from the shared checker
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.strata_validate_run(p_run uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  run record;
  tpl record;
  row_rec record;
  err record;
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
  'Validates a staging run via strata_staging_row_errors (required/numeric/finite/contract min-max/KPI/period/confidence 0–1), writes strata_validation_results, marks rows valid/rejected, completes or fails the run. DL-DEF-007 hardened.';

-- ---------------------------------------------------------------------------
-- 3) strata_promote_run — transactional re-validation; zero writes on failure
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

    -- DL-DEF-007: never trust the staged 'valid' verdict. Re-run the full
    -- checker inside this transaction; ANY failure aborts the whole promotion
    -- (RAISE → rollback), so an invalid/tampered/stale row produces zero
    -- canonical writes and cannot alter an existing official value.
    SELECT string_agg(format('%s [%s]: %s', e.field_name, e.error_code, e.message), ' · ')
      INTO err_detail
      FROM public.strata_staging_row_errors(
             row_rec.raw, tpl.column_schema, tpl.target_entity, row_rec.row_number) e;
    IF err_detail IS NOT NULL THEN
      RAISE EXCEPTION
        'promotion blocked: staged row % failed re-validation — % — no rows were promoted; re-run validation on this run',
        row_rec.row_number, err_detail;
    END IF;

    -- Re-resolve defensively; config may have moved since validation.
    SELECT id INTO v_kpi FROM public.strata_kpis
     WHERE slug = btrim(row_rec.raw ->> 'kpi_slug') AND status = 'approved';
    SELECT id INTO v_period FROM public.strata_periods
     WHERE name = btrim(row_rec.raw ->> 'period');
    IF v_kpi IS NULL OR v_period IS NULL THEN
      -- unreachable after re-validation above; kept as a hard stop rather than
      -- a silent skip so lineage can never point at a resolution mismatch
      RAISE EXCEPTION
        'promotion blocked: staged row % no longer resolves to an approved KPI and period — no rows were promoted',
        row_rec.row_number;
    END IF;

    v_value := replace(btrim(row_rec.raw ->> 'value'), ',', '')::numeric;
    -- confidence passed the 0–1 contract re-check above; cast directly.
    -- (No silent clamp: an out-of-range confidence blocks promotion instead.)
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
  'Promotes VALID staging rows of a completed run into strata_kpi_actuals as pending. DL-DEF-007: every row is re-validated transactionally via strata_staging_row_errors — any failure raises and rolls back the entire promotion (zero canonical writes). Idempotent per staging row.';
