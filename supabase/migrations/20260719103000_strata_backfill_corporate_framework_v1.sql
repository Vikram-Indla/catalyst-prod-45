-- CAT-STRATA-GOVFRAMEWORK-20260719-001 — Slice 4: Deterministic backfill of Corporate
-- Strategy Framework Version 1 from the pre-framework implicit model.
--
-- Establishes ONE explicit, governed framework version whose members ARE the currently
-- approved perspectives, with framework weight = each perspective's (deprecated)
-- default_weight and framework order = order_index. This replaces the anti-pattern where the
-- "framework" was the flat set of approved perspectives summing to 100.
--
-- PROVENANCE (D-E, Vikram-approved): the integrity report proved approved_by/created_by are
-- NULL for every approved perspective — the original framework approval predates the framework
-- governance model and CANNOT be proven. Therefore v1 is recorded as provenance='legacy_unverified',
-- approved_by = NULL (never invented), with source evidence in change_reason. The next revision
-- must go through the full maker-checker workflow.
--
-- Selection is by status='approved' (NOT hardcoded UUIDs) so this is correct on a clean DB,
-- staging, and any environment. It asserts count>0 and total=100 and re-runs the authoritative
-- validator; any deviation FAILS the migration (no silent redistribution).
--
-- Idempotent: no-op if a framework with key 'corporate' already exists.
-- Depends on Slices 1–2. Forward-only.
--
-- ROLLBACK (non-destructive, manual): this migration only INSERTs new rows in the three new
-- framework tables. To reverse without destroying post-migration records, retire the version via
-- strata_retire_strategy_framework_version(<v1>) — it will not touch perspectives, models, or
-- snapshots. Do NOT DELETE the identity if any later framework version or model references it.

DO $$
DECLARE
  v_exists   boolean;
  v_fw       uuid;
  v_ver      uuid;
  v_count    int;
  v_total    numeric;
  v_dup      int;
  v_validation jsonb;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.strata_strategy_frameworks WHERE framework_key = 'corporate') INTO v_exists;
  IF v_exists THEN
    RAISE NOTICE 'strata backfill: corporate framework already exists — skipping (idempotent).';
    RETURN;
  END IF;

  -- Measure the source set (approved perspectives).
  SELECT COUNT(*), COALESCE(SUM(default_weight), 0)
    INTO v_count, v_total
    FROM public.strata_perspectives WHERE status = 'approved';

  RAISE NOTICE 'strata backfill (before): % approved perspectives, default_weight total = %', v_count, v_total;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'strata backfill: no approved perspectives to seed a framework from';
  END IF;
  IF abs(v_total - 100) > 0.01 THEN
    RAISE EXCEPTION 'strata backfill: approved default_weight total is % (expected 100). Refusing to redistribute silently — resolve the source weights first.', v_total;
  END IF;

  -- Report (do not auto-fix) duplicate legacy order values; the members unique(order_index)
  -- constraint will additionally enforce this on insert.
  SELECT COUNT(*) INTO v_dup FROM (
    SELECT order_index FROM public.strata_perspectives WHERE status = 'approved'
    GROUP BY order_index HAVING COUNT(*) > 1) d;
  IF v_dup > 0 THEN
    RAISE NOTICE 'strata backfill: WARNING — % duplicate legacy order_index value(s) among approved perspectives; member insert will fail if unresolved.', v_dup;
  END IF;

  -- Identity.
  INSERT INTO public.strata_strategy_frameworks (framework_key, name, description)
  VALUES ('corporate', 'Corporate Strategy Framework',
          'The enterprise strategy framework: the governed set of perspectives, their order and weights, totalling 100%.')
  RETURNING id INTO v_fw;

  -- Version 1 — approved + legacy_unverified. approved_by intentionally NULL (unprovable).
  INSERT INTO public.strata_strategy_framework_versions (
    framework_id, version, status, provenance, approved_by, approved_at, effective_from, change_reason)
  VALUES (
    v_fw, 1, 'approved', 'legacy_unverified', NULL, now(), now(),
    'Legacy/unverified provenance: backfilled from the approved perspectives whose deprecated '
    'default_weight totalled 100 at migration time (CAT-STRATA-GOVFRAMEWORK-20260719-001). The '
    'original framework approver/timestamp predate framework governance and cannot be proven; '
    'the next revision must use the full maker-checker workflow.')
  RETURNING id INTO v_ver;

  -- Members = approved perspectives; framework weight/order taken from the deprecated columns
  -- (their historical operational values), now owned authoritatively by the framework version.
  INSERT INTO public.strata_strategy_framework_members (framework_version_id, perspective_id, weight, order_index)
  SELECT v_ver, id, default_weight, order_index
    FROM public.strata_perspectives WHERE status = 'approved'
   ORDER BY order_index;

  -- Gate: re-run the authoritative validator. Must be valid, else fail (no silent acceptance).
  v_validation := public.strata_validate_strategy_framework_version(v_ver);
  IF NOT (v_validation->>'valid')::boolean THEN
    RAISE EXCEPTION 'strata backfill: framework v1 failed validation: %', v_validation->'blockers';
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_strategy_framework_versions', v_ver, 'MIGRATION:backfill_corporate_framework_v1', NULL,
          format('Corporate framework v1 backfilled (legacy_unverified): %s members, total_weight %s',
                 v_validation->>'member_count', v_validation->>'total_weight'));

  RAISE NOTICE 'strata backfill (after): corporate framework % v1 %  — % members, total_weight %',
    v_fw, v_ver, v_validation->>'member_count', v_validation->>'total_weight';
END $$;
