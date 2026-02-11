
-- =========================================================
-- G16: Command Center Database Setup
-- =========================================================

-- 1. Activity Log table
CREATE TABLE public.cc_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES tm_test_cycles(id) ON DELETE SET NULL,
  test_case_id UUID REFERENCES tm_test_cases(id) ON DELETE SET NULL,
  defect_id UUID REFERENCES tm_defects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cc_activity_project ON public.cc_activity_log(project_id);
CREATE INDEX idx_cc_activity_created ON public.cc_activity_log(created_at DESC);
CREATE INDEX idx_cc_activity_type ON public.cc_activity_log(type);

-- RLS
ALTER TABLE public.cc_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity logs"
ON public.cc_activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
ON public.cc_activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_activity_log;

-- 2. RPC: get_command_center_kpis
CREATE OR REPLACE FUNCTION public.get_command_center_kpis(p_project_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        JOIN tm_cycle_scopes cs ON tr.cycle_scope_id = cs.id
        JOIN tm_test_cycles tc ON cs.cycle_id = tc.id
        WHERE tc.project_id = p_project_id
        AND tr.started_at >= CURRENT_DATE - INTERVAL '30 days'
      )
    )
  );
END;
$$;

-- 3. RPC: get_defect_trends
CREATE OR REPLACE FUNCTION public.get_cc_defect_trends(p_project_id UUID, p_days INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(daily_data), '[]'::json)
    FROM (
      SELECT 
        d::date as date,
        COALESCE((
          SELECT COUNT(*) FROM tm_defects def
          WHERE def.project_id = p_project_id
          AND def.created_at::date = d::date
        ), 0) as opened,
        COALESCE((
          SELECT COUNT(*) FROM tm_defects def
          WHERE def.project_id = p_project_id
          AND def.resolved_at::date = d::date
        ), 0) as closed
      FROM generate_series(
        CURRENT_DATE - (p_days || ' days')::interval,
        CURRENT_DATE,
        '1 day'::interval
      ) d
      ORDER BY d
    ) daily_data
  );
END;
$$;

-- 4. RPC: get_team_performance
CREATE OR REPLACE FUNCTION public.get_cc_team_performance(p_project_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      JOIN tm_cycle_scopes cs ON tr.cycle_scope_id = cs.id
      JOIN tm_test_cycles tc ON cs.cycle_id = tc.id
      WHERE tc.project_id = p_project_id
      AND tr.started_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.full_name, p.avatar_url
    ) team_data
  );
END;
$$;
