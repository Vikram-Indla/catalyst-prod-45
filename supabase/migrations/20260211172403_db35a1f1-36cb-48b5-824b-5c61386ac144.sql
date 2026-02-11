
-- Fix refresh_dynamic_test_set to use priority_id via tm_case_priorities
CREATE OR REPLACE FUNCTION refresh_dynamic_test_set(p_set_id UUID)
RETURNS JSON AS $$
DECLARE
  v_set tm_test_sets%ROWTYPE;
  v_criteria JSONB;
  v_added_count INTEGER;
  v_removed_count INTEGER;
  v_priority_ids UUID[];
BEGIN
  SELECT * INTO v_set FROM tm_test_sets WHERE id = p_set_id;
  IF v_set.id IS NULL THEN RAISE EXCEPTION 'Test set not found'; END IF;
  IF v_set.membership_type != 'dynamic' THEN RAISE EXCEPTION 'Not a dynamic set'; END IF;
  v_criteria := v_set.dynamic_criteria;
  IF v_criteria IS NULL THEN RAISE EXCEPTION 'No criteria defined'; END IF;

  -- Resolve priority names to IDs
  IF v_criteria->'priority' IS NOT NULL AND jsonb_array_length(v_criteria->'priority') > 0 THEN
    SELECT ARRAY_AGG(cp.id) INTO v_priority_ids
    FROM tm_case_priorities cp
    WHERE LOWER(cp.name) = ANY(SELECT LOWER(jsonb_array_elements_text(v_criteria->'priority')));
  END IF;

  SELECT COUNT(*) INTO v_removed_count FROM tm_test_set_cases WHERE test_set_id = p_set_id;
  DELETE FROM tm_test_set_cases WHERE test_set_id = p_set_id;

  INSERT INTO tm_test_set_cases (test_set_id, test_case_id, sort_order, added_by)
  SELECT p_set_id, tc.id, ROW_NUMBER() OVER (ORDER BY tc.case_key)::integer, v_set.owner_id
  FROM tm_test_cases tc
  WHERE tc.project_id = v_set.project_id
  AND tc.status != 'archived'
  AND (v_priority_ids IS NULL OR tc.priority_id = ANY(v_priority_ids))
  AND (v_criteria->>'folder_id' IS NULL OR v_criteria->>'folder_id' = ''
       OR tc.folder_id = (v_criteria->>'folder_id')::uuid);

  GET DIAGNOSTICS v_added_count = ROW_COUNT;
  RETURN json_build_object('set_id', p_set_id, 'added', v_added_count, 'removed', v_removed_count, 'refreshed_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
