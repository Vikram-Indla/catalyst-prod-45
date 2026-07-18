-- ============================================================================
-- DL-DEF-008 — disposable, self-rolling-back staging probe (reversal channel)
-- CAT-STRATA-DLDEF-20260718-001 · For independent Codex execution.
--
-- Proves via the REAL RPC boundaries (validate → promote → reverse) that:
--   1. a NEW reversal run is persisted with channel='system' (not the excel
--      column default) — no client relabelling involved;
--   2. the import run keeps its original channel;
--   3. historical RUN-24 remains channel='excel' — history is NOT rewritten;
--   4. the bidirectional reversal linkage is intact.
-- SUCCESS = the statement ERRORS with 'PROBE_COMPLETE_ROLLBACK :: …' showing
-- every expected value; everything rolls back — zero residue.
-- Same project guard and identity rules as dl_def_003_007_disposable_probe.sql.
-- ============================================================================

DO $$
DECLARE
  v_uid uuid; v_tpl uuid; rb uuid; res jsonb; rev uuid;
  report text := '';
  v_channel text; n int;
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = 'strata_numeric_boundary_guard')
      AND EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = 'strata_reversal_system_channel')) THEN
    RAISE EXCEPTION 'PROBE_ABORT :: project guard failed — this database is not catalyst-staging (cyijbdeuehohvhnsywig) carrying the DL-DEF-008 fix; refusing to run';
  END IF;

  SELECT user_id INTO v_uid FROM public.strata_role_assignments WHERE role IN ('data_steward','strategy_office') LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'PROBE_ABORT :: no ingest role-holder exists'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT id INTO v_tpl FROM public.strata_upload_templates WHERE slug='kpi-actuals-quarterly' AND status='approved';

  INSERT INTO public.strata_upload_runs (run_key, template_id, template_version, initiated_by, file_name, file_hash, status, row_count_raw, channel)
  VALUES ('ZZQA-DLDEF008', v_tpl, 1, v_uid, 'ZZQA def-008 probe', 'zzqadef008hash', 'staging', 1, 'manual') RETURNING id INTO rb;
  INSERT INTO public.strata_staging_rows (upload_run_id, row_number, raw, target_entity) VALUES
    (rb, 1, '{"kpi_slug":"enterprise-revenue-growth-proof","period":"Q2 FY2026","value":"3","confidence":"0.9"}', 'kpi_actual');
  res := public.strata_validate_run(rb);
  res := public.strata_promote_run(rb);
  report := report || format('promote=%s(expect 1); ', res->>'promoted');
  res := public.strata_reverse_run(rb, 'ZZQA DL-DEF-008 channel probe');
  rev := (res->>'reversal_run_id')::uuid;
  SELECT channel INTO v_channel FROM public.strata_upload_runs WHERE id = rev;
  report := report || format('new_reversal_channel=%s(expect system); ', v_channel);
  SELECT channel INTO v_channel FROM public.strata_upload_runs WHERE run_key='ZZQA-DLDEF008';
  report := report || format('import_channel_unchanged=%s(expect manual); ', v_channel);
  SELECT channel INTO v_channel FROM public.strata_upload_runs WHERE run_key='RUN-24';
  report := report || format('historical_RUN24_channel=%s(expect excel, untouched); ', v_channel);
  SELECT count(*) INTO n FROM public.strata_upload_runs WHERE id = rev AND run_type='reversal' AND reverses_run_id = rb;
  report := report || format('reversal_linked=%s(expect 1)', n);

  RAISE EXCEPTION 'PROBE_COMPLETE_ROLLBACK :: %', report;
END $$;
