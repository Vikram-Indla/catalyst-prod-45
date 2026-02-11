
-- =====================================================
-- G18: My Scope RPCs + G20: Version Trigger
-- =====================================================

-- G18: Create get_my_scope RPC
-- Returns all test cases assigned to a user across active cycles
CREATE OR REPLACE FUNCTION public.get_my_scope(
  p_user_id UUID
)
RETURNS TABLE (
  cycle_test_case_id UUID,
  test_case_id UUID,
  case_key TEXT,
  title VARCHAR,
  priority VARCHAR,
  execution_status VARCHAR,
  cycle_id UUID,
  cycle_name VARCHAR,
  release_id UUID,
  release_version VARCHAR,
  release_name TEXT,
  assigned_at TIMESTAMPTZ,
  failure_reason VARCHAR,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ctc.id AS cycle_test_case_id,
    ctc.test_case_id,
    tc.case_key,
    tc.title,
    tc.priority,
    ctc.execution_status,
    c.id AS cycle_id,
    c.name AS cycle_name,
    r.id AS release_id,
    r.version AS release_version,
    r.name AS release_name,
    ctc.created_at AS assigned_at,
    ctc.failure_reason,
    ctc.notes
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON ctc.test_case_id = tc.id
  JOIN th_test_cycles c ON ctc.cycle_id = c.id
  LEFT JOIN releases r ON c.release_id = r.id
  WHERE ctc.assigned_to = p_user_id
    AND c.status IN ('active', 'in_progress')
  ORDER BY
    CASE tc.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    tc.case_key;
END;
$$;

-- G18: Create get_my_stats RPC
-- Returns personal execution statistics for a user
CREATE OR REPLACE FUNCTION public.get_my_stats(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_assigned', COUNT(*),
    'remaining', COUNT(*) FILTER (WHERE ctc.execution_status = 'not_run'),
    'passed_count', COUNT(*) FILTER (WHERE ctc.execution_status = 'passed'),
    'failed_count', COUNT(*) FILTER (WHERE ctc.execution_status = 'failed'),
    'blocked_count', COUNT(*) FILTER (WHERE ctc.execution_status = 'blocked'),
    'executed_today', COUNT(*) FILTER (WHERE ctc.executed_at::date = CURRENT_DATE),
    'executed_this_week', COUNT(*) FILTER (WHERE ctc.executed_at >= date_trunc('week', CURRENT_DATE)),
    'pass_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE ctc.execution_status IN ('passed','failed')) > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE ctc.execution_status = 'passed')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE ctc.execution_status IN ('passed','failed')), 0) * 100, 1
      )
      ELSE 0
    END
  ) INTO v_result
  FROM th_cycle_test_cases ctc
  JOIN th_test_cycles c ON ctc.cycle_id = c.id
  WHERE ctc.assigned_to = p_user_id
    AND c.status IN ('active', 'in_progress');

  RETURN COALESCE(v_result, '{"total_assigned":0,"remaining":0,"passed_count":0,"failed_count":0,"blocked_count":0,"executed_today":0,"executed_this_week":0,"pass_rate":0}'::json);
END;
$$;

-- G20: Create version trigger for th_test_cases
-- Automatically captures a version snapshot before any update
CREATE OR REPLACE FUNCTION public.th_capture_test_case_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}'::jsonb;
  v_has_changes BOOLEAN := false;
BEGIN
  -- Track field-level changes
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    v_has_changes := true;
  END IF;
  IF OLD.objective IS DISTINCT FROM NEW.objective THEN
    v_changes := v_changes || jsonb_build_object('objective', jsonb_build_object('old', OLD.objective, 'new', NEW.objective));
    v_has_changes := true;
  END IF;
  IF OLD.preconditions IS DISTINCT FROM NEW.preconditions THEN
    v_changes := v_changes || jsonb_build_object('preconditions', jsonb_build_object('old', OLD.preconditions, 'new', NEW.preconditions));
    v_has_changes := true;
  END IF;
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    v_changes := v_changes || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    v_has_changes := true;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    v_has_changes := true;
  END IF;
  IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
    v_changes := v_changes || jsonb_build_object('folder_id', jsonb_build_object('old', OLD.folder_id, 'new', NEW.folder_id));
    v_has_changes := true;
  END IF;

  -- Only create version if meaningful fields changed
  IF v_has_changes THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
    
    INSERT INTO th_test_case_versions (
      test_case_id,
      version,
      changes,
      changed_by,
      changed_at
    ) VALUES (
      OLD.id,
      COALESCE(OLD.version, 1),
      v_changes,
      COALESCE(NEW.updated_by, auth.uid()),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_th_test_case_version ON th_test_cases;
CREATE TRIGGER trg_th_test_case_version
  BEFORE UPDATE ON th_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION th_capture_test_case_version();
