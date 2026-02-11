
-- Create RPC to get KPIs from previous period for trend comparison
CREATE OR REPLACE FUNCTION get_command_center_kpis_previous(p_project_id UUID)
RETURNS JSON AS $$
BEGIN
  -- Returns KPIs based on snapshot data from 7 days ago
  -- Since we don't have historical snapshots, we approximate trends
  -- by comparing current values against a synthetic baseline
  RETURN (
    SELECT json_build_object(
      'active_releases', (
        SELECT COUNT(*) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
        AND created_at <= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ),
      'total_test_cases', (
        SELECT COALESCE(SUM(test_cases_total), 0) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
      ),
      'executed_test_cases', (
        -- Approximate: count runs from 7-14 days ago
        SELECT COUNT(DISTINCT tr.id) FROM tm_test_runs tr
        JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
        JOIN tm_test_cycles tc ON cs.cycle_id = tc.id
        WHERE tc.project_id = p_project_id
        AND tr.started_at < CURRENT_DATE - INTERVAL '7 days'
        AND tr.started_at >= CURRENT_DATE - INTERVAL '14 days'
      ),
      'passed_test_cases', (
        SELECT COUNT(DISTINCT tr.id) FROM tm_test_runs tr
        JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
        JOIN tm_test_cycles tc ON cs.cycle_id = tc.id
        WHERE tc.project_id = p_project_id
        AND tr.status = 'passed'
        AND tr.started_at < CURRENT_DATE - INTERVAL '7 days'
        AND tr.started_at >= CURRENT_DATE - INTERVAL '14 days'
      ),
      'open_defects', (
        SELECT COALESCE(SUM(defects_open), 0) FROM releases
        WHERE project_id = p_project_id
        AND status NOT IN ('released', 'archived')
      ),
      'critical_defects', (
        SELECT COALESCE(SUM(critical_defects), 0) FROM releases
        WHERE project_id = p_project_id
        AND status NOT IN ('released', 'archived')
      ),
      'active_testers', (
        SELECT COUNT(DISTINCT tr.executed_by) FROM tm_test_runs tr
        JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
        JOIN tm_test_cycles tc ON cs.cycle_id = tc.id
        WHERE tc.project_id = p_project_id
        AND tr.started_at < CURRENT_DATE - INTERVAL '7 days'
        AND tr.started_at >= CURRENT_DATE - INTERVAL '14 days'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
