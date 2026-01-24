-- Update the save_test_data function to handle admin access
-- The issue: is_project_member only checks project_members table, but admins may not be in that table

CREATE OR REPLACE FUNCTION save_test_data(
  p_test_case_id uuid,
  p_parameters jsonb,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_param record;
  v_row record;
  v_inserted_params int := 0;
  v_inserted_rows int := 0;
  v_user_id uuid;
  v_project_id uuid;
  v_user_role text;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get the project_id from the test case
  SELECT project_id INTO v_project_id
  FROM tm_test_cases
  WHERE id = p_test_case_id;
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Test case not found';
  END IF;
  
  -- Check if user is admin OR is a project member
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
  
  IF v_user_role != 'admin' AND NOT is_project_member(v_user_id, v_project_id) THEN
    RAISE EXCEPTION 'Access denied - not a project member';
  END IF;

  -- Delete existing parameters and rows for this test case (atomic within transaction)
  DELETE FROM test_data_parameters WHERE test_case_id = p_test_case_id;
  DELETE FROM test_data_rows WHERE test_case_id = p_test_case_id;
  
  -- Insert new parameters
  IF p_parameters IS NOT NULL AND jsonb_array_length(p_parameters) > 0 THEN
    FOR v_param IN SELECT * FROM jsonb_array_elements(p_parameters)
    LOOP
      INSERT INTO test_data_parameters (
        test_case_id,
        parameter_name,
        parameter_type,
        column_order,
        created_at,
        updated_at
      ) VALUES (
        p_test_case_id,
        v_param.value->>'parameter_name',
        COALESCE(v_param.value->>'parameter_type', 'text'),
        COALESCE((v_param.value->>'column_order')::int, 0),
        now(),
        now()
      );
      v_inserted_params := v_inserted_params + 1;
    END LOOP;
  END IF;
  
  -- Insert new rows
  IF p_rows IS NOT NULL AND jsonb_array_length(p_rows) > 0 THEN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
      INSERT INTO test_data_rows (
        test_case_id,
        row_data,
        row_order,
        created_at,
        updated_at
      ) VALUES (
        p_test_case_id,
        v_row.value->'row_data',
        COALESCE((v_row.value->>'row_order')::int, 0),
        now(),
        now()
      );
      v_inserted_rows := v_inserted_rows + 1;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'parameters_saved', v_inserted_params,
    'rows_saved', v_inserted_rows
  );
END;
$$;