-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B8: release gate bridge (D-001)
-- Release quality plane = rh_releases. TestHub health flows in through
-- rh_release_test_cycle_links → tm cycles → scope/runs/defects, lands in
-- rh_readiness_checks under tm_* check keys, and returns a computed gate.
-- Note: live tm FKs (executions/cases/cycles.release_id) target ph_releases —
-- rh bridge is via the explicit cycle-link table, no FK churn (D-001 bridge option).

CREATE OR REPLACE FUNCTION public.tm_compute_release_gate(p_release_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_executed int;
  v_passed int;
  v_failed int;
  v_blocked int;
  v_open_blockers int;
  v_fb int;
  v_fb_with_evidence int;
  v_gate text;
  v_reasons jsonb := '[]'::jsonb;
BEGIN
  WITH cyc AS (
    SELECT test_cycle_id FROM rh_release_test_cycle_links WHERE release_id = p_release_id
  ),
  scope AS (
    SELECT cs.id, cs.current_status
    FROM tm_cycle_scope cs JOIN cyc ON cs.cycle_id = cyc.test_cycle_id
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE current_status IS DISTINCT FROM 'not_run'),
    count(*) FILTER (WHERE current_status = 'passed'),
    count(*) FILTER (WHERE current_status = 'failed'),
    count(*) FILTER (WHERE current_status = 'blocked')
  INTO v_total, v_executed, v_passed, v_failed, v_blocked
  FROM scope;

  SELECT count(DISTINCT d.id) INTO v_open_blockers
  FROM tm_defects d
  JOIN tm_defect_links dl ON dl.defect_id = d.id
  JOIN tm_cycle_scope cs ON cs.id = dl.cycle_scope_id
  JOIN rh_release_test_cycle_links l ON l.test_cycle_id = cs.cycle_id
  WHERE l.release_id = p_release_id
    AND d.severity::text IN ('blocker', 'critical')
    AND d.status::text NOT IN ('resolved', 'closed');

  SELECT
    count(*),
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM tm_attachments a
      WHERE a.entity_id = s.id
         OR a.entity_id IN (SELECT r.id FROM tm_test_runs r WHERE r.cycle_scope_id = s.id)
    ))
  INTO v_fb, v_fb_with_evidence
  FROM (
    SELECT cs.id FROM tm_cycle_scope cs
    JOIN rh_release_test_cycle_links l ON l.test_cycle_id = cs.cycle_id
    WHERE l.release_id = p_release_id AND cs.current_status IN ('failed', 'blocked')
  ) s;

  -- Gate decision
  IF v_open_blockers > 0 OR v_failed > 0 THEN
    v_gate := 'block';
    IF v_open_blockers > 0 THEN v_reasons := v_reasons || jsonb_build_array('open blocker/critical defects: ' || v_open_blockers); END IF;
    IF v_failed > 0 THEN v_reasons := v_reasons || jsonb_build_array('failed tests: ' || v_failed); END IF;
  ELSIF v_total = 0 OR v_executed < v_total OR v_blocked > 0 THEN
    v_gate := 'warn';
    IF v_total = 0 THEN v_reasons := v_reasons || jsonb_build_array('no test scope linked'); END IF;
    IF v_total > 0 AND v_executed < v_total THEN v_reasons := v_reasons || jsonb_build_array('unexecuted scope: ' || (v_total - v_executed)); END IF;
    IF v_blocked > 0 THEN v_reasons := v_reasons || jsonb_build_array('blocked tests: ' || v_blocked); END IF;
  ELSE
    v_gate := 'pass';
  END IF;

  -- Upsert tm readiness checks (rh_readiness_checks: pending|pass|fail|na)
  INSERT INTO rh_readiness_checks (release_id, check_key, label, status, detail, checked_at)
  VALUES
    (p_release_id, 'tm_regression_pass', 'Test execution health',
      CASE WHEN v_total = 0 THEN 'pending'
           WHEN v_failed > 0 OR v_blocked > 0 THEN 'fail'
           WHEN v_executed < v_total THEN 'pending'
           ELSE 'pass' END,
      format('%s/%s executed, %s passed, %s failed, %s blocked', v_executed, v_total, v_passed, v_failed, v_blocked),
      now()),
    (p_release_id, 'tm_open_blocker_defects', 'Blocking defects from testing',
      CASE WHEN v_open_blockers = 0 THEN 'pass' ELSE 'fail' END,
      format('%s open blocker/critical defect(s) linked to release test scope', v_open_blockers),
      now()),
    (p_release_id, 'tm_evidence_complete', 'Evidence on failed/blocked tests',
      CASE WHEN v_fb = 0 THEN 'na'
           WHEN v_fb_with_evidence = v_fb THEN 'pass'
           ELSE 'fail' END,
      format('%s/%s failed or blocked items carry evidence', v_fb_with_evidence, v_fb),
      now()),
    (p_release_id, 'tm_uat_signoff', 'UAT signoff', 'pending', 'Manual signoff — set by QA/UAT lead', NULL)
  ON CONFLICT (release_id, check_key) DO UPDATE
    SET status = CASE WHEN rh_readiness_checks.check_key = 'tm_uat_signoff'
                      THEN rh_readiness_checks.status  -- manual check: never clobber
                      ELSE EXCLUDED.status END,
        detail = CASE WHEN rh_readiness_checks.check_key = 'tm_uat_signoff'
                      THEN rh_readiness_checks.detail
                      ELSE EXCLUDED.detail END,
        checked_at = CASE WHEN rh_readiness_checks.check_key = 'tm_uat_signoff'
                      THEN rh_readiness_checks.checked_at
                      ELSE EXCLUDED.checked_at END;

  RETURN jsonb_build_object(
    'release_id', p_release_id,
    'gate', v_gate,
    'reasons', v_reasons,
    'totals', jsonb_build_object(
      'scope', v_total, 'executed', v_executed, 'passed', v_passed,
      'failed', v_failed, 'blocked', v_blocked,
      'open_blocker_defects', v_open_blockers,
      'failed_blocked_with_evidence', v_fb_with_evidence,
      'failed_blocked_total', v_fb
    ),
    'computed_at', now()
  );
END;
$$;
