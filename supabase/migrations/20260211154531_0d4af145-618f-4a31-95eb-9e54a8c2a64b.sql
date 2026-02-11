
-- Fix version trigger to not reference non-existent updated_by column
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
      auth.uid(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;
