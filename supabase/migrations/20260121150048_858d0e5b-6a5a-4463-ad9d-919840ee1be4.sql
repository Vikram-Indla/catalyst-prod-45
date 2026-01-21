-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 5A-3: AUTOMATION STATUS TRACKING
-- Auto-sync automation_status when tests are mapped to automation results
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Sync automation status when mapping is created
CREATE OR REPLACE FUNCTION sync_automation_status_on_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update test case automation_status to 'automated' when mapped
  UPDATE test_cases
  SET automation_status = 'automated',
      automation_id = NEW.external_test_id,
      updated_at = now()
  WHERE id = NEW.test_case_id
    AND (automation_status IS NULL OR automation_status != 'automated');
  
  RETURN NEW;
END;
$$;

-- Trigger: Auto-sync on mapping insert/update
DROP TRIGGER IF EXISTS trg_sync_automation_status ON automation_test_mappings;
CREATE TRIGGER trg_sync_automation_status
  AFTER INSERT OR UPDATE ON automation_test_mappings
  FOR EACH ROW
  EXECUTE FUNCTION sync_automation_status_on_mapping();

-- Function: Get automation sync status for test cases
CREATE OR REPLACE FUNCTION get_automation_sync_status(p_project_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_automated INTEGER;
  v_manual INTEGER;
  v_candidate INTEGER;
  v_mapped INTEGER;
  v_with_results INTEGER;
BEGIN
  -- Get counts from test_cases
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE automation_status = 'automated'),
    COUNT(*) FILTER (WHERE automation_status = 'manual' OR automation_status IS NULL),
    COUNT(*) FILTER (WHERE automation_status IN ('candidate', 'in_progress', 'planned'))
  INTO v_total, v_automated, v_manual, v_candidate
  FROM test_cases
  WHERE (p_project_id IS NULL OR project_id = p_project_id);

  -- Get mapped count
  SELECT COUNT(DISTINCT test_case_id) INTO v_mapped
  FROM automation_test_mappings
  WHERE test_case_id IN (
    SELECT id FROM test_cases WHERE (p_project_id IS NULL OR project_id = p_project_id)
  );

  -- Get count with recent results
  SELECT COUNT(DISTINCT ar.test_case_id) INTO v_with_results
  FROM automation_results ar
  WHERE ar.test_case_id IS NOT NULL
    AND ar.imported_at > now() - INTERVAL '30 days'
    AND (p_project_id IS NULL OR ar.test_case_id IN (
      SELECT id FROM test_cases WHERE project_id = p_project_id
    ));

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'automated', v_automated,
    'manual', v_manual,
    'candidate', v_candidate,
    'mapped', v_mapped,
    'with_recent_results', v_with_results,
    'automation_rate', CASE WHEN v_total > 0 THEN ROUND((v_automated::NUMERIC / v_total) * 100, 1) ELSE 0 END
  );
END;
$$;

-- Function: Get latest automation results for a test case
CREATE OR REPLACE FUNCTION get_test_automation_history(
  p_test_case_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'results', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ar.id,
        'status', ar.status,
        'duration_ms', ar.duration_ms,
        'error_message', ar.error_message,
        'run_timestamp', ar.run_timestamp,
        'imported_at', ar.imported_at,
        'connector_name', ac.name,
        'connector_type', ac.connector_type
      ) ORDER BY ar.run_timestamp DESC)
      FROM automation_results ar
      JOIN automation_connectors ac ON ac.id = ar.connector_id
      WHERE ar.test_case_id = p_test_case_id
      LIMIT p_limit
    ), '[]'::JSONB)
  );
END;
$$;