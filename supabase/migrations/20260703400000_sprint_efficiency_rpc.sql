-- CAT-SPRINTS-NATIVE-20260702-002 Phase 3 Slice 4b
-- Efficiency score (D-008): 40% completion + 25% flow-efficiency +
-- 20% scope-stability + 15% approval-timeliness. Every component is null
-- when its source data is absent — never a guessed 0 or 100 (zero-assumption).
-- SECURITY INVOKER: read-only, relies entirely on the calling user's own RLS
-- access to the underlying tables — no elevated privilege needed.

CREATE OR REPLACE FUNCTION public.compute_sprint_efficiency(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sprint ph_jira_sprints%ROWTYPE;
  v_completion numeric;
  v_flow numeric;
  v_scope numeric;
  v_approval numeric;
  v_overall numeric;
  v_missing text[] := '{}';

  v_done_count int;
  v_total_count int;

  v_active_ms numeric;
  v_total_ms numeric;

  v_total_ever_added int;
  v_removed_count int;

  v_awaiting_at timestamptz;
  v_decided_at timestamptz;
  v_elapsed_hours numeric;
  v_length_hours numeric;
BEGIN
  SELECT * INTO v_sprint FROM ph_jira_sprints WHERE id = p_sprint_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'sprint not found');
  END IF;

  -- Completion
  SELECT
    count(*) FILTER (WHERE status_category = 'done'),
    count(*)
  INTO v_done_count, v_total_count
  FROM ph_issues WHERE sprint_id = p_sprint_id;

  IF v_total_count > 0 THEN
    v_completion := (v_done_count::numeric / v_total_count) * 100;
  ELSE
    v_missing := array_append(v_missing, 'completion');
  END IF;

  -- Flow-efficiency
  SELECT
    sum(time_in_from_status_ms) FILTER (WHERE from_status_category = 'in_progress'),
    sum(time_in_from_status_ms) FILTER (WHERE time_in_from_status_ms IS NOT NULL)
  INTO v_active_ms, v_total_ms
  FROM work_item_transitions
  WHERE work_item_id IN (SELECT id FROM ph_issues WHERE sprint_id = p_sprint_id);

  IF v_total_ms IS NOT NULL AND v_total_ms > 0 THEN
    v_flow := (COALESCE(v_active_ms, 0) / v_total_ms) * 100;
  ELSE
    v_missing := array_append(v_missing, 'flow_efficiency');
  END IF;

  -- Scope-stability
  SELECT
    count(*) FILTER (WHERE to_value = p_sprint_id::text),
    count(*) FILTER (WHERE from_value = p_sprint_id::text)
  INTO v_total_ever_added, v_removed_count
  FROM work_item_changelogs
  WHERE field_name = 'sprint'
    AND (from_value = p_sprint_id::text OR to_value = p_sprint_id::text);

  IF v_total_ever_added IS NOT NULL AND v_total_ever_added > 0 THEN
    v_scope := (1 - (v_removed_count::numeric / v_total_ever_added)) * 100;
  ELSE
    v_missing := array_append(v_missing, 'scope_stability');
  END IF;

  -- Approval-timeliness
  SELECT transitioned_at INTO v_awaiting_at
  FROM ph_sprint_status_transitions
  WHERE sprint_id = p_sprint_id AND to_status = 'awaiting_approval'
  ORDER BY transitioned_at DESC LIMIT 1;

  SELECT max(decided_at) INTO v_decided_at
  FROM ph_sprint_approvers
  WHERE sprint_id = p_sprint_id AND decided_at IS NOT NULL;

  IF v_awaiting_at IS NOT NULL AND v_decided_at IS NOT NULL AND v_decided_at > v_awaiting_at THEN
    v_elapsed_hours := EXTRACT(EPOCH FROM (v_decided_at - v_awaiting_at)) / 3600;
    v_length_hours := GREATEST(COALESCE(v_sprint.length_weeks, 1), 1) * 7 * 24;
    v_approval := GREATEST(0, LEAST(100, 100 - ((v_elapsed_hours - 24) / NULLIF(v_length_hours - 24, 0)) * 100));
    IF v_elapsed_hours <= 24 THEN
      v_approval := 100;
    END IF;
  ELSE
    v_missing := array_append(v_missing, 'approval_timeliness');
  END IF;

  IF array_length(v_missing, 1) IS NULL THEN
    v_overall := 0.40 * v_completion + 0.25 * v_flow + 0.20 * v_scope + 0.15 * v_approval;
  END IF;

  RETURN jsonb_build_object(
    'completion', v_completion,
    'flow_efficiency', v_flow,
    'scope_stability', v_scope,
    'approval_timeliness', v_approval,
    'overall', v_overall,
    'missing', to_jsonb(v_missing)
  );
END;
$$;
