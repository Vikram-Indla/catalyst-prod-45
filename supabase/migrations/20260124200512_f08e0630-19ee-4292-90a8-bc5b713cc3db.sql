-- Add ordering columns to test data tables
ALTER TABLE test_data_parameters ADD COLUMN IF NOT EXISTS column_order integer NOT NULL DEFAULT 0;
ALTER TABLE test_data_rows ADD COLUMN IF NOT EXISTS row_order integer NOT NULL DEFAULT 0;

-- Create indexes for efficient ordering
CREATE INDEX IF NOT EXISTS idx_test_data_parameters_order ON test_data_parameters(test_case_id, column_order);
CREATE INDEX IF NOT EXISTS idx_test_data_rows_order ON test_data_rows(test_case_id, row_order);

-- Create atomic save function for test data (prevents partial writes)
CREATE OR REPLACE FUNCTION save_test_data(
  p_test_case_id uuid,
  p_parameters jsonb, -- array of {parameter_name: string, parameter_type: string, column_order: int}
  p_rows jsonb -- array of {row_data: jsonb, row_order: int}
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
BEGIN
  -- Validate test case exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM tm_test_cases tc
    WHERE tc.id = p_test_case_id
      AND is_project_member(auth.uid(), tc.project_id)
  ) THEN
    RAISE EXCEPTION 'Test case not found or access denied';
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_test_data(uuid, jsonb, jsonb) TO authenticated;