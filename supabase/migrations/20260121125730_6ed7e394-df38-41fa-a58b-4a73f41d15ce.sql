
-- =====================================================
-- MODULE 4B-1: ENHANCED STEP EDITOR SUPPORT
-- Additional columns and RPCs for step management
-- =====================================================

-- 1. Add additional columns to tm_test_steps if needed
DO $$
BEGIN
  -- Add notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tm_test_steps' AND column_name = 'notes'
  ) THEN
    ALTER TABLE tm_test_steps ADD COLUMN notes TEXT;
  END IF;
  
  -- Add estimated_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tm_test_steps' AND column_name = 'estimated_time_seconds'
  ) THEN
    ALTER TABLE tm_test_steps ADD COLUMN estimated_time_seconds INTEGER;
  END IF;
  
  -- Add is_optional column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tm_test_steps' AND column_name = 'is_optional'
  ) THEN
    ALTER TABLE tm_test_steps ADD COLUMN is_optional BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. RPC: Bulk reorder steps (for drag-drop)
CREATE OR REPLACE FUNCTION tm_reorder_steps(
  p_case_id UUID,
  p_step_orders JSONB -- Array of {step_id, new_order}
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_step RECORD;
BEGIN
  FOR v_step IN SELECT * FROM jsonb_to_recordset(p_step_orders) AS x(step_id UUID, new_order INTEGER)
  LOOP
    UPDATE tm_test_steps 
    SET step_number = v_step.new_order
    WHERE id = v_step.step_id AND case_id = p_case_id;
  END LOOP;
  
  RETURN true;
END;
$$;

-- 3. RPC: Clone step within same test case
CREATE OR REPLACE FUNCTION tm_clone_step(
  p_step_id UUID,
  p_insert_after INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_step_id UUID;
  v_case_id UUID;
  v_new_order INTEGER;
BEGIN
  -- Get source step info
  SELECT case_id INTO v_case_id FROM tm_test_steps WHERE id = p_step_id;
  
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Step not found';
  END IF;
  
  -- Determine new order
  IF p_insert_after IS NOT NULL THEN
    v_new_order := p_insert_after + 1;
    -- Shift subsequent steps
    UPDATE tm_test_steps 
    SET step_number = step_number + 1 
    WHERE case_id = v_case_id AND step_number >= v_new_order;
  ELSE
    SELECT COALESCE(MAX(step_number), 0) + 1 INTO v_new_order 
    FROM tm_test_steps WHERE case_id = v_case_id;
  END IF;
  
  -- Clone the step
  INSERT INTO tm_test_steps (
    case_id, step_number, step_type, action, 
    expected_result, test_data, notes, is_optional, estimated_time_seconds
  )
  SELECT 
    case_id, v_new_order, step_type, action,
    expected_result, test_data, notes, is_optional, estimated_time_seconds
  FROM tm_test_steps
  WHERE id = p_step_id
  RETURNING id INTO v_new_step_id;
  
  RETURN v_new_step_id;
END;
$$;

-- 4. RPC: Insert step at position
CREATE OR REPLACE FUNCTION tm_insert_step_at(
  p_case_id UUID,
  p_position INTEGER,
  p_step_type TEXT DEFAULT 'action',
  p_action TEXT DEFAULT '',
  p_expected_result TEXT DEFAULT '',
  p_test_data TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_step_id UUID;
BEGIN
  -- Shift subsequent steps
  UPDATE tm_test_steps 
  SET step_number = step_number + 1 
  WHERE case_id = p_case_id AND step_number >= p_position;
  
  -- Insert new step
  INSERT INTO tm_test_steps (
    case_id, step_number, step_type, action, expected_result, test_data
  ) VALUES (
    p_case_id, p_position, p_step_type, p_action, p_expected_result, p_test_data
  )
  RETURNING id INTO v_new_step_id;
  
  RETURN v_new_step_id;
END;
$$;

-- 5. RPC: Delete step and reorder
CREATE OR REPLACE FUNCTION tm_delete_step(p_step_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_case_id UUID;
  v_step_number INTEGER;
BEGIN
  -- Get step info
  SELECT case_id, step_number INTO v_case_id, v_step_number 
  FROM tm_test_steps WHERE id = p_step_id;
  
  IF v_case_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete step
  DELETE FROM tm_test_steps WHERE id = p_step_id;
  
  -- Reorder remaining steps
  UPDATE tm_test_steps 
  SET step_number = step_number - 1 
  WHERE case_id = v_case_id AND step_number > v_step_number;
  
  RETURN true;
END;
$$;

-- 6. RPC: Get steps with full details for editor
CREATE OR REPLACE FUNCTION tm_get_case_steps(p_case_id UUID)
RETURNS TABLE (
  id UUID,
  step_number INTEGER,
  step_type TEXT,
  action TEXT,
  expected_result TEXT,
  test_data TEXT,
  notes TEXT,
  is_optional BOOLEAN,
  estimated_time_seconds INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.step_number,
    s.step_type::TEXT,
    s.action,
    s.expected_result,
    s.test_data,
    s.notes,
    COALESCE(s.is_optional, false),
    s.estimated_time_seconds,
    s.created_at,
    s.updated_at
  FROM tm_test_steps s
  WHERE s.case_id = p_case_id
  ORDER BY s.step_number;
END;
$$;

-- 7. RPC: Bulk update steps
CREATE OR REPLACE FUNCTION tm_bulk_update_steps(
  p_case_id UUID,
  p_steps JSONB -- Array of step objects
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_step JSONB;
  v_count INTEGER := 0;
BEGIN
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    UPDATE tm_test_steps SET
      step_number = COALESCE((v_step->>'step_number')::INTEGER, step_number),
      step_type = COALESCE(v_step->>'step_type', step_type),
      action = COALESCE(v_step->>'action', action),
      expected_result = COALESCE(v_step->>'expected_result', expected_result),
      test_data = COALESCE(v_step->>'test_data', test_data),
      notes = COALESCE(v_step->>'notes', notes),
      is_optional = COALESCE((v_step->>'is_optional')::BOOLEAN, is_optional),
      estimated_time_seconds = COALESCE((v_step->>'estimated_time_seconds')::INTEGER, estimated_time_seconds),
      updated_at = now()
    WHERE id = (v_step->>'id')::UUID AND case_id = p_case_id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;
