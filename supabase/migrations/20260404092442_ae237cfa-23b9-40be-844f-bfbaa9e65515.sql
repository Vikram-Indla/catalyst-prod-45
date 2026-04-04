
-- Step 1: Drop broken FK
ALTER TABLE tm_cycle_execution_audit
  DROP CONSTRAINT IF EXISTS tm_cycle_execution_audit_test_case_id_fkey;

-- Step 2: Add correct FK to tm_test_cases
ALTER TABLE tm_cycle_execution_audit
  ADD CONSTRAINT tm_cycle_execution_audit_test_case_id_fkey
  FOREIGN KEY (test_case_id)
  REFERENCES tm_test_cases(id)
  ON DELETE CASCADE;

-- Step 3: Fix assignment trigger
CREATE OR REPLACE FUNCTION tm_log_cycle_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tc_key   TEXT;
  v_tc_title TEXT;
BEGIN
  SELECT case_key, title
    INTO v_tc_key, v_tc_title
    FROM tm_test_cases
   WHERE id = NEW.test_case_id;

  INSERT INTO tm_cycle_execution_audit (
    cycle_id, test_case_id, action,
    assigned_to, performed_by, performed_at, notes
  ) VALUES (
    NEW.cycle_id, NEW.test_case_id, 'assigned',
    NEW.assigned_to, auth.uid(), NOW(),
    'Assigned — ' || COALESCE(v_tc_key, 'unknown')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'assignment audit failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Fix status change trigger
CREATE OR REPLACE FUNCTION tm_log_cycle_scope_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tc_key TEXT;
BEGIN
  IF OLD.current_status IS DISTINCT FROM NEW.current_status THEN
    SELECT case_key INTO v_tc_key
      FROM tm_test_cases WHERE id = NEW.test_case_id;

    INSERT INTO tm_cycle_execution_audit (
      cycle_id, test_case_id, action,
      performed_by, performed_at, notes
    ) VALUES (
      NEW.cycle_id, NEW.test_case_id, 'status_changed',
      auth.uid(), NOW(),
      COALESCE(v_tc_key,'unknown') || ': ' ||
      COALESCE(OLD.current_status,'none') || ' → ' || NEW.current_status
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'status audit failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
