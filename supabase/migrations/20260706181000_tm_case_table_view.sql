-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B9: repository view + pull-latest + sprint health
-- 1) tm_case_table_v2: one-query 13-column repository table (no client N+1)
-- 2) tm_build_case_snapshot + tm_pull_latest_into_scope: explicit variance resolution
-- 3) tm_compute_sprint_test_health: sprint gate compute + snapshot row

-- 1) Repository table view (security_invoker: RLS of underlying tables applies)
CREATE OR REPLACE VIEW public.tm_case_table_v2 WITH (security_invoker = 'true') AS
SELECT
  tc.id,
  tc.project_id,
  tc.case_key,
  tc.title,
  tc.status,
  tc.origin,
  tc.is_ai_generated,
  tc.folder_id,
  f.name AS folder_name,
  f.path::text AS folder_path,
  ct.name AS case_type,
  tc.sprint_id,
  sp.name AS sprint_name,
  sp.slug AS sprint_slug,
  tc.release_id,
  rel.name AS release_name,
  rel.slug AS release_slug,
  tc.assigned_to,
  pd.full_name AS designer_name,
  pd.avatar_url AS designer_avatar,
  tc.created_at,
  tc.updated_at,
  tc.version,
  lr.current_status AS latest_run_status,
  lr.updated_at AS latest_run_at,
  od.open_defects
FROM public.tm_test_cases tc
LEFT JOIN public.tm_folders f ON f.id = tc.folder_id
LEFT JOIN public.tm_case_types ct ON ct.id = tc.case_type_id
LEFT JOIN public.ph_jira_sprints sp ON sp.id = tc.sprint_id AND sp.deleted_at IS NULL
LEFT JOIN public.ph_releases rel ON rel.id = tc.release_id
LEFT JOIN public.profiles pd ON pd.id = COALESCE(tc.assigned_to, tc.created_by)
LEFT JOIN LATERAL (
  SELECT cs.current_status, cs.updated_at
  FROM public.tm_cycle_scope cs
  WHERE cs.test_case_id = tc.id
  ORDER BY cs.updated_at DESC NULLS LAST
  LIMIT 1
) lr ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS open_defects
  FROM public.tm_defects d
  WHERE d.source_test_case_id = tc.id
    AND d.status::text NOT IN ('resolved', 'closed')
) od ON true;

-- 2) Shared snapshot builder (used by scope-add trigger and pull-latest)
CREATE OR REPLACE FUNCTION public.tm_build_case_snapshot(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_steps jsonb;
BEGIN
  SELECT * INTO v_case FROM tm_test_cases WHERE id = p_case_id;
  IF v_case.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'step_number', s.step_number,
      'action', s.action,
      'action_html', s.action_html,
      'expected_result', s.expected_result,
      'expected_result_html', s.expected_result_html,
      'test_data', s.test_data,
      'is_optional', s.is_optional
    ) ORDER BY s.step_number
  ), '[]'::jsonb)
  INTO v_steps
  FROM tm_test_steps s
  WHERE s.test_case_id = p_case_id AND s.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'case_key', v_case.case_key,
    'title', v_case.title,
    'description', v_case.description,
    'description_html', v_case.description_html,
    'preconditions', v_case.preconditions,
    'preconditions_html', v_case.preconditions_html,
    'expected_result', v_case.expected_result,
    'test_format', v_case.test_format,
    'gherkin_feature', v_case.gherkin_feature,
    'gherkin_scenario', v_case.gherkin_scenario,
    'status', v_case.status,
    'origin', v_case.origin,
    'folder_id', v_case.folder_id,
    'locked_version', v_case.version,
    'snapshotted_at', now(),
    'steps', v_steps
  );
END;
$$;

-- Re-point the live scope-add trigger fn at the shared builder
CREATE OR REPLACE FUNCTION public.tm_cycle_scope_populate_locked_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.locked_version IS NULL THEN
    SELECT version INTO NEW.locked_version FROM tm_test_cases WHERE id = NEW.test_case_id;
  END IF;
  IF NEW.locked_snapshot IS NULL THEN
    NEW.locked_snapshot := public.tm_build_case_snapshot(NEW.test_case_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Explicit pull-latest (V2: repository changes never auto-mutate; user action only, open cycles only)
CREATE OR REPLACE FUNCTION public.tm_pull_latest_into_scope(p_scope_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope RECORD;
  v_case RECORD;
BEGIN
  SELECT cs.*, c.status AS cycle_status INTO v_scope
  FROM tm_cycle_scope cs JOIN tm_test_cycles c ON c.id = cs.cycle_id
  WHERE cs.id = p_scope_id;

  IF v_scope.id IS NULL THEN
    RAISE EXCEPTION 'tm_pull_latest_into_scope: unknown scope %', p_scope_id;
  END IF;
  IF v_scope.cycle_status IN ('completed', 'archived') THEN
    RAISE EXCEPTION 'CLOSED_CYCLE_IMMUTABLE: cannot pull latest into a closed cycle' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_case FROM tm_test_cases WHERE id = v_scope.test_case_id;

  UPDATE tm_cycle_scope
  SET locked_version = v_case.version,
      locked_snapshot = public.tm_build_case_snapshot(v_scope.test_case_id)
  WHERE id = p_scope_id;

  UPDATE tm_case_variance
  SET resolved_at = now(), resolution = 'pulled_latest', resolved_by = auth.uid()
  WHERE cycle_scope_id = p_scope_id AND resolved_at IS NULL;

  RETURN jsonb_build_object('scope_id', p_scope_id, 'pulled_version', v_case.version, 'pulled_at', now());
END;
$$;

-- 3) Sprint test health compute + snapshot
CREATE OR REPLACE FUNCTION public.tm_compute_sprint_test_health(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stories int;
  v_covered int;
  v_total int;
  v_executed int;
  v_passed int;
  v_failed int;
  v_blocked int;
  v_open_blockers int;
  v_draft_linked int;
  v_gate text;
  v_reasons jsonb := '[]'::jsonb;
  v_totals jsonb;
  v_project uuid;
BEGIN
  -- Story coverage: sprint stories with at least one linked test case
  SELECT count(*),
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM tm_requirement_links rl
           WHERE rl.external_key = i.issue_key
         ))
  INTO v_stories, v_covered
  FROM ph_issues i
  WHERE i.sprint_id = p_sprint_id;

  -- Execution health across sprint cycles
  SELECT
    count(*),
    count(*) FILTER (WHERE cs.current_status IS DISTINCT FROM 'not_run'),
    count(*) FILTER (WHERE cs.current_status = 'passed'),
    count(*) FILTER (WHERE cs.current_status = 'failed'),
    count(*) FILTER (WHERE cs.current_status = 'blocked')
  INTO v_total, v_executed, v_passed, v_failed, v_blocked
  FROM tm_cycle_scope cs
  JOIN tm_test_cycles c ON c.id = cs.cycle_id
  WHERE c.sprint_id = p_sprint_id;

  -- Open blocker/critical defects targeted at this sprint
  SELECT count(*) INTO v_open_blockers
  FROM tm_defects d
  WHERE d.sprint_id = p_sprint_id
    AND d.severity::text IN ('blocker', 'critical')
    AND d.status::text NOT IN ('resolved', 'closed');

  -- Draft cases linked to sprint scope (V2 gate criterion: no executable case still draft)
  SELECT count(*) INTO v_draft_linked
  FROM tm_test_cases tc
  WHERE tc.sprint_id = p_sprint_id AND tc.status = 'draft';

  SELECT c.project_id INTO v_project
  FROM tm_test_cycles c WHERE c.sprint_id = p_sprint_id LIMIT 1;

  IF v_open_blockers > 0 OR v_failed > 0 THEN
    v_gate := 'block';
    IF v_open_blockers > 0 THEN v_reasons := v_reasons || jsonb_build_array('open blocker/critical defects: ' || v_open_blockers); END IF;
    IF v_failed > 0 THEN v_reasons := v_reasons || jsonb_build_array('failed tests: ' || v_failed); END IF;
  ELSIF v_total = 0 OR v_executed < v_total OR v_blocked > 0
        OR (v_stories > 0 AND v_covered < v_stories) OR v_draft_linked > 0 THEN
    v_gate := 'warn';
    IF v_total = 0 THEN v_reasons := v_reasons || jsonb_build_array('no sprint test execution scope'); END IF;
    IF v_total > 0 AND v_executed < v_total THEN v_reasons := v_reasons || jsonb_build_array('unexecuted scope: ' || (v_total - v_executed)); END IF;
    IF v_blocked > 0 THEN v_reasons := v_reasons || jsonb_build_array('blocked tests: ' || v_blocked); END IF;
    IF v_stories > 0 AND v_covered < v_stories THEN v_reasons := v_reasons || jsonb_build_array('uncovered stories: ' || (v_stories - v_covered)); END IF;
    IF v_draft_linked > 0 THEN v_reasons := v_reasons || jsonb_build_array('draft cases in sprint: ' || v_draft_linked); END IF;
  ELSE
    v_gate := 'pass';
  END IF;

  v_totals := jsonb_build_object(
    'stories', v_stories, 'covered_stories', v_covered,
    'scope', v_total, 'executed', v_executed, 'passed', v_passed,
    'failed', v_failed, 'blocked', v_blocked,
    'open_blocker_defects', v_open_blockers,
    'draft_cases', v_draft_linked
  );

  INSERT INTO tm_sprint_test_health (sprint_id, project_id, totals, gate_state, gate_reasons, computed_by)
  VALUES (p_sprint_id, v_project, v_totals, v_gate, v_reasons, auth.uid());

  RETURN jsonb_build_object(
    'sprint_id', p_sprint_id,
    'gate', v_gate,
    'reasons', v_reasons,
    'totals', v_totals,
    'computed_at', now()
  );
END;
$$;
