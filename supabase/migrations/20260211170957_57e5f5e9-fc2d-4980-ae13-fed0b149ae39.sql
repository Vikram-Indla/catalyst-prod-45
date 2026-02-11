-- G20 FIX: Correct version trigger and add missing columns

-- 1. Add steps and changed_fields to tm_test_case_versions
ALTER TABLE public.tm_test_case_versions
ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS changed_fields text[];

-- 2. Add DDT columns to tm_test_runs
ALTER TABLE public.tm_test_runs
ADD COLUMN IF NOT EXISTS dataset_id uuid,
ADD COLUMN IF NOT EXISTS data_row_index integer,
ADD COLUMN IF NOT EXISTS data_row_snapshot jsonb;

-- 3. Fix trigger function to target correct table (tm_test_case_versions)
CREATE OR REPLACE FUNCTION public.auto_create_test_case_version()
RETURNS TRIGGER AS $$
DECLARE
  v_next_version integer;
  v_changed_fields text[];
  v_steps jsonb;
  v_snapshot jsonb;
BEGIN
  -- Only trigger on meaningful field changes
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.objective IS DISTINCT FROM NEW.objective OR
    OLD.preconditions IS DISTINCT FROM NEW.preconditions OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.description IS DISTINCT FROM NEW.description
  ) THEN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM tm_test_case_versions WHERE test_case_id = NEW.id;

    -- Identify changed fields
    v_changed_fields := ARRAY[]::text[];
    IF OLD.title IS DISTINCT FROM NEW.title THEN v_changed_fields := array_append(v_changed_fields, 'title'); END IF;
    IF OLD.objective IS DISTINCT FROM NEW.objective THEN v_changed_fields := array_append(v_changed_fields, 'objective'); END IF;
    IF OLD.preconditions IS DISTINCT FROM NEW.preconditions THEN v_changed_fields := array_append(v_changed_fields, 'preconditions'); END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN v_changed_fields := array_append(v_changed_fields, 'priority'); END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN v_changed_fields := array_append(v_changed_fields, 'status'); END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN v_changed_fields := array_append(v_changed_fields, 'description'); END IF;

    -- Get current steps snapshot
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'step_number', step_number,
      'action', action,
      'expected_result', expected_result,
      'test_data', test_data
    ) ORDER BY step_number), '[]'::jsonb) INTO v_steps
    FROM tm_test_steps WHERE test_case_id = NEW.id;

    -- Build snapshot of OLD values (pre-change state)
    v_snapshot := jsonb_build_object(
      'title', OLD.title,
      'objective', OLD.objective,
      'preconditions', OLD.preconditions,
      'priority', OLD.priority,
      'status', OLD.status,
      'description', OLD.description,
      'steps', v_steps
    );

    -- Insert into CORRECT table: tm_test_case_versions
    INSERT INTO tm_test_case_versions (
      test_case_id, version_number, snapshot, change_summary,
      changed_by, steps, changed_fields
    ) VALUES (
      NEW.id, v_next_version, v_snapshot,
      'Changed: ' || array_to_string(v_changed_fields, ', '),
      NEW.updated_by, v_steps, v_changed_fields
    );

    -- Update version counter
    NEW.current_version := v_next_version;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach trigger
DROP TRIGGER IF EXISTS trg_auto_version_test_case ON public.tm_test_cases;
CREATE TRIGGER trg_auto_version_test_case
BEFORE UPDATE ON public.tm_test_cases
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_test_case_version();