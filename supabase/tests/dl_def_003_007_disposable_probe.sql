-- ============================================================================
-- DL-DEF-003 / DL-DEF-007 — disposable, self-rolling-back staging probe
-- CAT-STRATA-DLDEF-20260718-001 · For independent Codex execution.
--
-- WHAT IT PROVES
--   1. Promotion-time revalidation blocks a staged/tampered confidence outside
--      0–1 with ZERO canonical writes (DL-DEF-007).
--   2. An identical-payload twin run cannot promote (DL-DEF-003).
--   3. Same-run double-click/retry promotion is idempotent (0 promoted / N skipped).
--   4. No pre-existing official actual is changed (global count asserted).
--
-- SAFETY
--   • STAGING ONLY (catalyst-staging, ref cyijbdeuehohvhnsywig). Never production.
--   • Every write happens inside one DO block that ends in RAISE EXCEPTION →
--     the whole transaction rolls back. Nothing persists; nothing to clean up.
--   • Fixture identifiers use the J Lineage / ZZQA convention.
--   • No service-role secret and no hardcoded user id: the block impersonates
--     whichever existing role-holder strata_role_assignments already contains.
--   • RLS/role guards are NOT weakened — the RPCs run their real checks against
--     the impersonated claims.
--
-- HOW TO RUN
--   Execute this file verbatim against staging (Supabase SQL editor or MCP
--   execute_sql). SUCCESS = the statement ERRORS with a message beginning
--   'PROBE_COMPLETE_ROLLBACK ::' whose report contains every expected value.
--   Any other error, or a non-error completion, is a FAILURE.
--
-- PROJECT GUARD
--   The probe hard-aborts unless the target database carries the two
--   staging-only migration-ledger rows written when the DL-DEF-007/003 fixes
--   were applied to catalyst-staging (cyijbdeuehohvhnsywig). Production
--   (lmqwtldpfacrrlvdnmld) does not have these rows, so pointing the probe at
--   production (or any other project) aborts before any write. NOTE: Postgres
--   cannot read the Supabase project ref directly; this ledger marker is the
--   strongest in-database guard available — additionally, every write in this
--   probe is rolled back even when the guard is bypassed.
--
-- CONCURRENCY (two exact copy-paste sessions)
--   True two-session concurrency cannot run inside one transaction.
--   SESSION A (leave the transaction OPEN — do not commit):
--     BEGIN;
--     SELECT set_config('request.jwt.claims', json_build_object('sub',
--       (SELECT user_id FROM public.strata_role_assignments
--         WHERE role IN ('data_steward','strategy_office') LIMIT 1),
--       'role','authenticated')::text, true);
--     -- create + validate + promote a run with file_hash 'zzqaconcurrency1'
--     -- (copy Phase B below, replacing the hash), then STOP after
--     -- strata_promote_run returns. Keep the session open.
--   SESSION B (second connection, same set_config):
--     BEGIN;
--     -- create + validate an identical run (same file_hash 'zzqaconcurrency1',
--     -- same template) and call strata_promote_run(<run B id>).
--     -- EXPECTED: the call BLOCKS on pg_advisory_xact_lock until session A
--     -- resolves. If A COMMITs: B errors 'identical payload … was already
--     -- promoted by run …'. If A ROLLBACKs: B proceeds and promotes 1.
--   VERIFICATION / ROLLBACK (both sessions):
--     ROLLBACK;   -- in each session — leaves zero residue either way.
--     SELECT count(*) FROM public.strata_upload_runs WHERE file_hash='zzqaconcurrency1';  -- expect 0
-- ============================================================================

DO $$
DECLARE
  v_uid uuid;
  v_tpl uuid;
  ra uuid; rb uuid; rc uuid; row2 uuid;
  res jsonb;
  report text := '';
  n int; before_actuals int;
BEGIN
  -- PROJECT GUARD: staging-only migration-ledger markers (see header).
  IF NOT (EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = 'strata_numeric_boundary_guard')
      AND EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = 'strata_duplicate_replay_guard')) THEN
    RAISE EXCEPTION 'PROBE_ABORT :: project guard failed — this database is not catalyst-staging (cyijbdeuehohvhnsywig) carrying the DL-DEF-003/007 fixes; refusing to run';
  END IF;

  -- Impersonate an EXISTING ingest role-holder (no hardcoded identity).
  SELECT user_id INTO v_uid FROM public.strata_role_assignments
   WHERE role IN ('data_steward','strategy_office','kpi_owner') LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'PROBE_ABORT :: no ingest role-holder exists in strata_role_assignments'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT id INTO v_tpl FROM public.strata_upload_templates
   WHERE slug = 'kpi-actuals-quarterly' AND status = 'approved';
  IF v_tpl IS NULL THEN RAISE EXCEPTION 'PROBE_ABORT :: approved kpi-actuals-quarterly template not found'; END IF;

  SELECT count(*) INTO before_actuals FROM public.strata_kpi_actuals;

  -- ── Phase A (DL-DEF-007): RUN-27 replica — value=-1/conf 0.8 + value=5/conf 1.1
  INSERT INTO public.strata_upload_runs (run_key, template_id, template_version, initiated_by, file_name, file_hash, status, row_count_raw)
  VALUES ('ZZQA-J-LINEAGE-PROBE-A', v_tpl, 1, v_uid, 'J Lineage disposable probe A', 'zzqajprobehash1', 'staging', 2) RETURNING id INTO ra;
  INSERT INTO public.strata_staging_rows (upload_run_id, row_number, raw, target_entity) VALUES
    (ra, 1, '{"kpi_slug":"enterprise-revenue-growth-proof","period":"Q2 FY2026","value":"-1","confidence":"0.8"}', 'kpi_actual'),
    (ra, 2, '{"kpi_slug":"enterprise-revenue-growth-proof","period":"Q2 FY2026","value":"5","confidence":"1.1"}', 'kpi_actual');
  res := public.strata_validate_run(ra);
  report := report || format('A_validate=%s/%s(expect 1/1); ', res->>'row_count_valid', res->>'row_count_rejected');

  -- Tamper bypass: flip the rejected conf=1.1 row to 'valid' and attempt promotion.
  SELECT id INTO row2 FROM public.strata_staging_rows WHERE upload_run_id = ra AND row_number = 2;
  UPDATE public.strata_staging_rows SET validation_status = 'valid' WHERE id = row2;
  BEGIN
    res := public.strata_promote_run(ra);
    report := report || format('A_tampered_promote=UNEXPECTED_SUCCESS %s; ', res);
  EXCEPTION WHEN OTHERS THEN
    report := report || format('A_tampered_promote=BLOCKED(%s); ', left(SQLERRM, 80));
  END;
  SELECT count(*) INTO n FROM public.strata_kpi_actuals WHERE upload_run_id = ra;
  report := report || format('A_canonical_writes=%s(expect 0); ', n);

  -- ── Phase B (DL-DEF-003): promote a clean run, then retry, then its identical twin
  INSERT INTO public.strata_upload_runs (run_key, template_id, template_version, initiated_by, file_name, file_hash, status, row_count_raw)
  VALUES ('ZZQA-J-LINEAGE-PROBE-B', v_tpl, 1, v_uid, 'J Lineage disposable probe B', 'zzqajprobehash2', 'staging', 1) RETURNING id INTO rb;
  INSERT INTO public.strata_staging_rows (upload_run_id, row_number, raw, target_entity) VALUES
    (rb, 1, '{"kpi_slug":"enterprise-revenue-growth-proof","period":"Q2 FY2026","value":"7","confidence":"0.9"}', 'kpi_actual');
  res := public.strata_validate_run(rb);
  res := public.strata_promote_run(rb);
  report := report || format('B_promote=%s(expect 1); ', res->>'promoted');
  res := public.strata_promote_run(rb);  -- double-click / retry
  report := report || format('B_retry=%s promoted/%s skipped(expect 0/1); ', res->>'promoted', res->>'skipped');

  INSERT INTO public.strata_upload_runs (run_key, template_id, template_version, initiated_by, file_name, file_hash, status, row_count_raw)
  VALUES ('ZZQA-J-LINEAGE-PROBE-C', v_tpl, 1, v_uid, 'J Lineage disposable probe C (twin of B)', 'zzqajprobehash2', 'staging', 1) RETURNING id INTO rc;
  INSERT INTO public.strata_staging_rows (upload_run_id, row_number, raw, target_entity) VALUES
    (rc, 1, '{"kpi_slug":"enterprise-revenue-growth-proof","period":"Q2 FY2026","value":"7","confidence":"0.9"}', 'kpi_actual');
  res := public.strata_validate_run(rc);
  SELECT count(*) INTO n FROM public.strata_validation_results WHERE upload_run_id = rc AND error_code = 'duplicate_payload' AND severity = 'warning';
  report := report || format('C_dup_warning=%s(expect 1); ', n);
  BEGIN
    res := public.strata_promote_run(rc);
    report := report || format('C_twin_promote=UNEXPECTED_SUCCESS %s; ', res);
  EXCEPTION WHEN OTHERS THEN
    report := report || format('C_twin_promote=BLOCKED(%s); ', left(SQLERRM, 80));
  END;
  SELECT count(*) INTO n FROM public.strata_kpi_actuals WHERE upload_run_id = rc;
  report := report || format('C_canonical_writes=%s(expect 0); ', n);

  -- ── No pre-existing official actual changed: only run B's single write exists.
  SELECT count(*) - before_actuals INTO n FROM public.strata_kpi_actuals;
  report := report || format('net_new_actuals=%s(expect 1, rolled back next)', n);

  RAISE EXCEPTION 'PROBE_COMPLETE_ROLLBACK :: %', report;
END $$;
