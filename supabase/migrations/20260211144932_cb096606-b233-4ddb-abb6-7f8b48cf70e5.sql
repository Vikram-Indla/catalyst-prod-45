
-- Drop and recreate get_command_center_kpis with correct table name
DROP FUNCTION IF EXISTS get_command_center_kpis(UUID);
CREATE FUNCTION get_command_center_kpis(p_project_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'active_releases', (
        SELECT COUNT(*) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
      ),
      'total_test_cases', (
        SELECT COALESCE(SUM(test_cases_total), 0) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
      ),
      'executed_test_cases', (
        SELECT COALESCE(SUM(test_cases_executed), 0) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
      ),
      'passed_test_cases', (
        SELECT COALESCE(SUM(test_cases_passed), 0) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
      ),
      'failed_test_cases', (
        SELECT COALESCE(SUM(test_cases_failed), 0) FROM releases 
        WHERE project_id = p_project_id 
        AND status NOT IN ('released', 'archived')
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
        AND tr.started_at >= CURRENT_DATE - INTERVAL '30 days'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_cc_team_performance with correct table name
DROP FUNCTION IF EXISTS get_cc_team_performance(UUID);
CREATE FUNCTION get_cc_team_performance(p_project_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(team_data ORDER BY tests_executed DESC), '[]'::json)
    FROM (
      SELECT 
        p.id,
        p.full_name as name,
        p.avatar_url,
        COUNT(DISTINCT tr.id) as tests_executed,
        COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'passed') as tests_passed,
        CASE WHEN COUNT(DISTINCT tr.id) > 0 
          THEN ROUND((COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'passed')::numeric / COUNT(DISTINCT tr.id)) * 100, 1)
          ELSE 0 
        END as pass_rate
      FROM profiles p
      JOIN tm_test_runs tr ON tr.executed_by = p.id
      JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
      JOIN tm_test_cycles tc ON cs.cycle_id = tc.id
      WHERE tc.project_id = p_project_id
      AND tr.started_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.full_name, p.avatar_url
    ) team_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
