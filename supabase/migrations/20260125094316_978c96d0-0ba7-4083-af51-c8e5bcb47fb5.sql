-- CATALYST V5 - Phase 1.2: Release Metrics Sync (Fixed for enum types)

-- Helper function with TEXT cast
CREATE OR REPLACE FUNCTION tm_is_defect_open(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IS NULL OR p_status NOT IN ('closed', 'resolved', 'rejected', 'duplicate', 'wont_fix');
$$;

-- Manual recalculation function
CREATE OR REPLACE FUNCTION tm_recalculate_release_metrics(p_release_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_cases_total INTEGER;
  v_test_cases_passed INTEGER;
  v_defects_open INTEGER;
  v_coverage_percent INTEGER;
  v_project_id UUID;
BEGIN
  SELECT project_id INTO v_project_id FROM releases WHERE id = p_release_id;

  SELECT COUNT(*) INTO v_test_cases_total FROM tm_test_cases WHERE release_id = p_release_id;

  SELECT COUNT(DISTINCT cs.test_case_id) INTO v_test_cases_passed
  FROM tm_test_runs tr
  JOIN tm_cycle_scope cs ON cs.id = tr.cycle_scope_id
  JOIN tm_test_cycles cyc ON cyc.id = cs.cycle_id
  WHERE cyc.release_id = p_release_id AND tr.status = 'passed';

  SELECT COUNT(*) INTO v_defects_open FROM tm_defects d
  WHERE d.project_id = v_project_id AND tm_is_defect_open(d.status::TEXT);

  v_coverage_percent := CASE WHEN v_test_cases_total > 0 
    THEN ROUND((v_test_cases_passed::NUMERIC / v_test_cases_total::NUMERIC) * 100)
    ELSE 0 END;

  UPDATE releases SET 
    test_cases_total = COALESCE(v_test_cases_total, 0),
    test_cases_passed = COALESCE(v_test_cases_passed, 0),
    defects_open = COALESCE(v_defects_open, 0),
    coverage_percent = COALESCE(v_coverage_percent, 0),
    updated_at = NOW()
  WHERE id = p_release_id;

  RETURN jsonb_build_object('release_id', p_release_id, 'test_cases_total', v_test_cases_total, 
    'test_cases_passed', v_test_cases_passed, 'defects_open', v_defects_open, 'coverage_percent', v_coverage_percent);
END;
$$;

-- Trigger for test case count
CREATE OR REPLACE FUNCTION tm_sync_release_test_case_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.release_id IS NOT NULL THEN
    UPDATE releases SET test_cases_total = test_cases_total + 1 WHERE id = NEW.release_id;
  ELSIF TG_OP = 'DELETE' AND OLD.release_id IS NOT NULL THEN
    UPDATE releases SET test_cases_total = GREATEST(0, test_cases_total - 1) WHERE id = OLD.release_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.release_id IS DISTINCT FROM NEW.release_id THEN
    IF OLD.release_id IS NOT NULL THEN
      UPDATE releases SET test_cases_total = GREATEST(0, test_cases_total - 1) WHERE id = OLD.release_id;
    END IF;
    IF NEW.release_id IS NOT NULL THEN
      UPDATE releases SET test_cases_total = test_cases_total + 1 WHERE id = NEW.release_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tm_test_cases_release_sync ON tm_test_cases;
CREATE TRIGGER trg_tm_test_cases_release_sync AFTER INSERT OR UPDATE OR DELETE ON tm_test_cases FOR EACH ROW EXECUTE FUNCTION tm_sync_release_test_case_count();

-- Trigger for defect count
CREATE OR REPLACE FUNCTION tm_sync_release_defect_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id UUID;
  v_was_open BOOLEAN;
  v_is_now_open BOOLEAN;
BEGIN
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  v_was_open := CASE WHEN TG_OP != 'INSERT' THEN tm_is_defect_open(OLD.status::TEXT) ELSE FALSE END;
  v_is_now_open := CASE WHEN TG_OP != 'DELETE' THEN tm_is_defect_open(NEW.status::TEXT) ELSE FALSE END;
  
  IF v_project_id IS NOT NULL THEN
    IF v_is_now_open AND NOT v_was_open THEN
      UPDATE releases SET defects_open = defects_open + 1 WHERE project_id = v_project_id;
    ELSIF v_was_open AND NOT v_is_now_open THEN
      UPDATE releases SET defects_open = GREATEST(0, defects_open - 1) WHERE project_id = v_project_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tm_defects_release_sync ON tm_defects;
CREATE TRIGGER trg_tm_defects_release_sync AFTER INSERT OR UPDATE OR DELETE ON tm_defects FOR EACH ROW EXECUTE FUNCTION tm_sync_release_defect_count();

-- Sync existing data
DO $$ DECLARE r RECORD; BEGIN FOR r IN SELECT id FROM releases LOOP PERFORM tm_recalculate_release_metrics(r.id); END LOOP; END $$;