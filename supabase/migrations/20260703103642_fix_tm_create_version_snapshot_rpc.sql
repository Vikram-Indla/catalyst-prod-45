-- CAT-TESTHUB-PROD-20260703-001 P1-S3 (discovered live: RPC never actually
-- worked). tm_create_version_snapshot referenced FOUR columns that do not
-- exist on the real schema: tm_test_steps.step_type (no such column),
-- tm_test_cases.postconditions (only postconditions_html exists),
-- tm_test_cases.priority (UUID FK is priority_id, no plain text column —
-- the exact silent-bug pattern TESTHUB_BUILD_HANDOVER.md warned about),
-- and tm_test_cases.type (UUID FK is case_type_id). Every invocation
-- 42703'd — this RPC has been unusable since creation; tm_test_case_versions
-- has 0 rows in the wild because nothing could ever call it successfully.
-- Found via a live scratch-row probe when consolidating onto it as the
-- single snapshot writer (P1-S3's whole point — shipping the consolidation
-- onto a broken RPC would have been strictly worse than the racy client
-- writers it replaced).

CREATE OR REPLACE FUNCTION public.tm_create_version_snapshot(p_case_id uuid, p_change_summary text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_case RECORD;
  v_steps JSONB;
  v_snapshot JSONB;
  v_version INTEGER;
BEGIN
  SELECT * INTO v_case FROM tm_test_cases WHERE id = p_case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test case not found';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'step_number', step_number,
      'action', action,
      'action_html', action_html,
      'expected_result', expected_result,
      'expected_result_html', expected_result_html,
      'test_data', test_data,
      'notes', notes,
      'is_optional', is_optional,
      'estimated_time_seconds', estimated_time_seconds
    ) ORDER BY step_number
  ), '[]'::jsonb)
  INTO v_steps
  FROM tm_test_steps WHERE test_case_id = p_case_id AND deleted_at IS NULL;

  v_snapshot := jsonb_build_object(
    'title', v_case.title,
    'description', v_case.description,
    'description_html', v_case.description_html,
    'preconditions', v_case.preconditions,
    'preconditions_html', v_case.preconditions_html,
    'postconditions_html', v_case.postconditions_html,
    'status', v_case.status,
    'priority_id', v_case.priority_id,
    'case_type_id', v_case.case_type_id,
    'test_format', v_case.test_format,
    'gherkin_feature', v_case.gherkin_feature,
    'gherkin_scenario', v_case.gherkin_scenario,
    'folder_id', v_case.folder_id,
    'steps', v_steps
  );

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
  FROM tm_test_case_versions WHERE test_case_id = p_case_id;

  INSERT INTO tm_test_case_versions (
    test_case_id,
    version_number,
    snapshot,
    change_summary,
    changed_by
  ) VALUES (
    p_case_id,
    v_version,
    v_snapshot,
    p_change_summary,
    auth.uid()
  );

  UPDATE tm_test_cases
  SET version = v_version, updated_at = now()
  WHERE id = p_case_id;

  RETURN v_version;
END;
$function$;
