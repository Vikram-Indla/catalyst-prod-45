-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice G3: ph_releases test gate
-- The canonical Release detail page (entity-hub RELEASE_CONFIG) renders
-- ph_releases rows, and the tm plane FKs ph_releases natively
-- (tm_test_cycles/executions/cases.release_id). This RPC computes the release
-- test readiness gate over that native linkage. The rh_releases bridge
-- (tm_compute_release_gate, B8) keeps serving the Release Ops cockpit.

CREATE OR REPLACE FUNCTION public.tm_compute_ph_release_gate(p_release_id uuid)
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
  v_draft_linked int;
  v_uat_total int;
  v_uat_done int;
  v_gate text;
  v_reasons jsonb := '[]'::jsonb;
BEGIN
  -- Execution health across cycles tied to this release
  SELECT
    count(*),
    count(*) FILTER (WHERE cs.current_status IS DISTINCT FROM 'not_run'),
    count(*) FILTER (WHERE cs.current_status = 'passed'),
    count(*) FILTER (WHERE cs.current_status = 'failed'),
    count(*) FILTER (WHERE cs.current_status = 'blocked')
  INTO v_total, v_executed, v_passed, v_failed, v_blocked
  FROM tm_cycle_scope cs
  JOIN tm_test_cycles c ON c.id = cs.cycle_id
  WHERE c.release_id = p_release_id;

  -- Open blocker/critical defects with lineage into those cycles
  SELECT count(DISTINCT d.id) INTO v_open_blockers
  FROM tm_defects d
  JOIN tm_defect_links dl ON dl.defect_id = d.id
  JOIN tm_cycle_scope cs ON cs.id = dl.cycle_scope_id
  JOIN tm_test_cycles c ON c.id = cs.cycle_id
  WHERE c.release_id = p_release_id
    AND d.severity::text IN ('blocker', 'critical')
    AND d.status::text NOT IN ('resolved', 'closed');

  -- Evidence completeness on failed/blocked items
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
    JOIN tm_test_cycles c ON c.id = cs.cycle_id
    WHERE c.release_id = p_release_id AND cs.current_status IN ('failed', 'blocked')
  ) s;

  -- Draft cases targeted at this release (V2: draft never executable)
  SELECT count(*) INTO v_draft_linked
  FROM tm_test_cases tc
  WHERE tc.release_id = p_release_id AND tc.status = 'draft';

  -- UAT execution completion (labs of scope type release flagged UAT via name,
  -- v1 heuristic: executions on this release whose cycles are all complete)
  SELECT count(*), count(*) FILTER (WHERE status = 'completed')
  INTO v_uat_total, v_uat_done
  FROM tm_test_executions
  WHERE release_id = p_release_id;

  IF v_open_blockers > 0 OR v_failed > 0 THEN
    v_gate := 'block';
    IF v_open_blockers > 0 THEN v_reasons := v_reasons || jsonb_build_array('open blocker/critical defects: ' || v_open_blockers); END IF;
    IF v_failed > 0 THEN v_reasons := v_reasons || jsonb_build_array('failed tests: ' || v_failed); END IF;
  ELSIF v_total = 0 OR v_executed < v_total OR v_blocked > 0 OR v_draft_linked > 0 THEN
    v_gate := 'warn';
    IF v_total = 0 THEN v_reasons := v_reasons || jsonb_build_array('no test scope linked to release'); END IF;
    IF v_total > 0 AND v_executed < v_total THEN v_reasons := v_reasons || jsonb_build_array('unexecuted scope: ' || (v_total - v_executed)); END IF;
    IF v_blocked > 0 THEN v_reasons := v_reasons || jsonb_build_array('blocked tests: ' || v_blocked); END IF;
    IF v_draft_linked > 0 THEN v_reasons := v_reasons || jsonb_build_array('draft cases targeted at release: ' || v_draft_linked); END IF;
  ELSE
    v_gate := 'pass';
  END IF;

  RETURN jsonb_build_object(
    'release_id', p_release_id,
    'gate', v_gate,
    'reasons', v_reasons,
    'totals', jsonb_build_object(
      'scope', v_total, 'executed', v_executed, 'passed', v_passed,
      'failed', v_failed, 'blocked', v_blocked,
      'open_blocker_defects', v_open_blockers,
      'failed_blocked_with_evidence', v_fb_with_evidence,
      'failed_blocked_total', v_fb,
      'draft_cases', v_draft_linked,
      'executions', v_uat_total, 'executions_completed', v_uat_done
    ),
    'computed_at', now()
  );
END;
$$;
