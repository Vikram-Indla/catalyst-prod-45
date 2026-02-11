
-- G24: Reports & Analytics Database Setup

-- Report definitions (saved reports)
CREATE TABLE report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL DEFAULT 'execution',
  config JSONB NOT NULL DEFAULT '{}',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_defs_project ON report_definitions(project_id);
CREATE INDEX idx_report_defs_creator ON report_definitions(created_by);
CREATE INDEX idx_report_defs_type ON report_definitions(report_type);

-- Report frequency enum
CREATE TYPE report_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Report schedules
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  frequency report_frequency NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28),
  time_of_day TIME NOT NULL DEFAULT '09:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  recipients JSONB NOT NULL DEFAULT '[]',
  export_format VARCHAR(20) DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_schedules_next ON report_schedules(next_run_at) WHERE is_active = true;

-- Report snapshots (historical data)
CREATE TABLE report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
  snapshot_data JSONB NOT NULL,
  filters_used JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  file_path TEXT,
  file_format VARCHAR(20),
  file_size INTEGER
);

CREATE INDEX idx_snapshots_report ON report_snapshots(report_id);
CREATE INDEX idx_snapshots_date ON report_snapshots(generated_at DESC);

-- Dashboard widgets (user customization)
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widgets_user_project ON dashboard_widgets(user_id, project_id);

-- RLS Policies
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reports" ON report_definitions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create reports" ON report_definitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update reports" ON report_definitions FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Creators can delete reports" ON report_definitions FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can manage schedules" ON report_schedules FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view snapshots" ON report_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create snapshots" ON report_snapshots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own widgets" ON dashboard_widgets FOR ALL USING (user_id = auth.uid());

-- Analytics RPC Functions (adapted to th_ schema)

-- Get execution summary metrics from th_cycle_test_cases
CREATE OR REPLACE FUNCTION get_report_execution_metrics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_cycle_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_executed', COALESCE(COUNT(*), 0),
    'passed', COALESCE(COUNT(*) FILTER (WHERE execution_status = 'passed'), 0),
    'failed', COALESCE(COUNT(*) FILTER (WHERE execution_status = 'failed'), 0),
    'blocked', COALESCE(COUNT(*) FILTER (WHERE execution_status = 'blocked'), 0),
    'skipped', COALESCE(COUNT(*) FILTER (WHERE execution_status = 'skipped'), 0),
    'not_run', COALESCE(COUNT(*) FILTER (WHERE execution_status = 'not_run' OR execution_status IS NULL), 0),
    'pass_rate', COALESCE(ROUND(
      COUNT(*) FILTER (WHERE execution_status = 'passed') * 100.0 / 
      NULLIF(COUNT(*) FILTER (WHERE execution_status IN ('passed', 'failed')), 0), 1
    ), 0),
    'execution_rate', COALESCE(ROUND(
      COUNT(*) FILTER (WHERE execution_status NOT IN ('not_run') AND execution_status IS NOT NULL) * 100.0 / 
      NULLIF(COUNT(*), 0), 1
    ), 0),
    'avg_execution_time', COALESCE(ROUND(AVG(execution_time_seconds)::numeric, 0), 0)
  ) INTO v_result
  FROM th_cycle_test_cases
  WHERE executed_at BETWEEN p_start_date AND p_end_date
    AND (p_cycle_id IS NULL OR cycle_id = p_cycle_id);
  
  RETURN COALESCE(v_result, '{"total_executed":0,"passed":0,"failed":0,"blocked":0,"skipped":0,"not_run":0,"pass_rate":0,"execution_rate":0,"avg_execution_time":0}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get execution trend over time
CREATE OR REPLACE FUNCTION get_report_execution_trend(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_interval TEXT DEFAULT 'day'
)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(t) ORDER BY t.period)
    FROM (
      SELECT 
        date_trunc(p_interval, executed_at)::date as period,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE execution_status = 'passed') as passed,
        COUNT(*) FILTER (WHERE execution_status = 'failed') as failed,
        COUNT(*) FILTER (WHERE execution_status = 'blocked') as blocked,
        ROUND(
          COUNT(*) FILTER (WHERE execution_status = 'passed') * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE execution_status IN ('passed', 'failed')), 0), 1
        ) as pass_rate
      FROM th_cycle_test_cases
      WHERE executed_at BETWEEN p_start_date AND p_end_date
        AND executed_at IS NOT NULL
      GROUP BY date_trunc(p_interval, executed_at)::date
    ) t
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get coverage metrics
CREATE OR REPLACE FUNCTION get_report_coverage_metrics()
RETURNS JSON AS $$
DECLARE
  v_total INTEGER;
  v_executed INTEGER;
  v_automated INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM th_test_cases;
  
  SELECT COUNT(DISTINCT test_case_id) INTO v_executed
  FROM th_cycle_test_cases
  WHERE execution_status IS NOT NULL AND execution_status != 'not_run';
  
  SELECT COUNT(*) INTO v_automated
  FROM th_test_cases 
  WHERE automation = 'automated';
  
  RETURN json_build_object(
    'total_tests', COALESCE(v_total, 0),
    'executed_tests', COALESCE(v_executed, 0),
    'execution_coverage', COALESCE(ROUND(v_executed * 100.0 / NULLIF(v_total, 0), 1), 0),
    'automated_tests', COALESCE(v_automated, 0),
    'automation_coverage', COALESCE(ROUND(v_automated * 100.0 / NULLIF(v_total, 0), 1), 0),
    'manual_tests', COALESCE(v_total - v_automated, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get results by folder/module
CREATE OR REPLACE FUNCTION get_report_results_by_folder(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(t) ORDER BY t.total DESC)
    FROM (
      SELECT 
        f.id as folder_id,
        f.name as folder_name,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') as passed,
        COUNT(*) FILTER (WHERE ctc.execution_status = 'failed') as failed,
        ROUND(
          COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE ctc.execution_status IN ('passed', 'failed')), 0), 1
        ) as pass_rate
      FROM th_cycle_test_cases ctc
      JOIN th_test_cases tc ON ctc.test_case_id = tc.id
      LEFT JOIN th_folders f ON tc.folder_id = f.id
      WHERE ctc.executed_at BETWEEN p_start_date AND p_end_date
        AND ctc.executed_at IS NOT NULL
      GROUP BY f.id, f.name
    ) t
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get tester performance
CREATE OR REPLACE FUNCTION get_report_tester_performance(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(t) ORDER BY t.total_executed DESC)
    FROM (
      SELECT 
        p.id as user_id,
        p.full_name,
        p.avatar_url,
        COUNT(*) as total_executed,
        COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') as passed,
        COUNT(*) FILTER (WHERE ctc.execution_status = 'failed') as failed,
        ROUND(
          COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE ctc.execution_status IN ('passed', 'failed')), 0), 1
        ) as pass_rate,
        ROUND(AVG(ctc.execution_time_seconds)::numeric, 0) as avg_time_seconds
      FROM th_cycle_test_cases ctc
      JOIN profiles p ON ctc.executed_by = p.id
      WHERE ctc.executed_at BETWEEN p_start_date AND p_end_date
        AND ctc.executed_at IS NOT NULL
      GROUP BY p.id, p.full_name, p.avatar_url
      LIMIT 10
    ) t
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get results by priority
CREATE OR REPLACE FUNCTION get_report_results_by_priority(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT 
        tc.priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') as passed,
        COUNT(*) FILTER (WHERE ctc.execution_status = 'failed') as failed,
        ROUND(
          COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') * 100.0 / 
          NULLIF(COUNT(*) FILTER (WHERE ctc.execution_status IN ('passed', 'failed')), 0), 1
        ) as pass_rate
      FROM th_cycle_test_cases ctc
      JOIN th_test_cases tc ON ctc.test_case_id = tc.id
      WHERE ctc.executed_at BETWEEN p_start_date AND p_end_date
        AND ctc.executed_at IS NOT NULL
      GROUP BY tc.priority
      ORDER BY 
        CASE tc.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5
        END
    ) t
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
