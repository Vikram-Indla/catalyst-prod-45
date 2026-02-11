-- ============================================
-- G10-01: TEST REPORTS & EXPORT - DATABASE SETUP
-- ============================================

-- 1. Create sequence for report keys
CREATE SEQUENCE IF NOT EXISTS th_report_key_seq START WITH 1;

-- 2. Create reports table
CREATE TABLE IF NOT EXISTS th_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key TEXT UNIQUE NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL CHECK (type IN ('cycle_summary', 'plan_summary', 'coverage', 'defect', 'trend', 'custom')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'failed', 'archived')),
  cycle_id UUID REFERENCES th_test_cycles(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES th_test_plans(id) ON DELETE SET NULL,
  date_from DATE,
  date_to DATE,
  report_data JSONB DEFAULT '{}',
  export_format VARCHAR(20),
  file_path TEXT,
  file_size INTEGER,
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create report templates table
CREATE TABLE IF NOT EXISTS th_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL,
  config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create scheduled reports table
CREATE TABLE IF NOT EXISTS th_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES th_report_templates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  schedule_type VARCHAR(20) CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'on_cycle_complete')),
  schedule_day INTEGER,
  schedule_time TIME,
  recipients TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_type ON th_reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON th_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_cycle ON th_reports(cycle_id);
CREATE INDEX IF NOT EXISTS idx_reports_plan ON th_reports(plan_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON th_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON th_report_templates(type);

-- 6. Create function to generate report key
CREATE OR REPLACE FUNCTION generate_report_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_key IS NULL OR NEW.report_key = '' THEN
    NEW.report_key := 'RPT-' || LPAD(nextval('th_report_key_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for auto-generating report key
DROP TRIGGER IF EXISTS trg_generate_report_key ON th_reports;
CREATE TRIGGER trg_generate_report_key
BEFORE INSERT ON th_reports
FOR EACH ROW EXECUTE FUNCTION generate_report_key();

-- 8. Create function to generate cycle summary report data
CREATE OR REPLACE FUNCTION generate_cycle_report_data(p_cycle_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_cycle RECORD;
  v_test_cases JSONB;
  v_status_breakdown JSONB;
  v_assignee_breakdown JSONB;
BEGIN
  SELECT * INTO v_cycle FROM th_test_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN
    RETURN '{"error": "Cycle not found"}'::JSONB;
  END IF;

  SELECT jsonb_object_agg(execution_status, cnt) INTO v_status_breakdown
  FROM (
    SELECT execution_status, COUNT(*) as cnt
    FROM th_cycle_test_cases
    WHERE cycle_id = p_cycle_id
    GROUP BY execution_status
  ) sub;

  SELECT jsonb_agg(jsonb_build_object(
    'assignee_id', assignee_id,
    'assignee_name', COALESCE(p.full_name, 'Unassigned'),
    'total', total,
    'passed', passed,
    'failed', failed
  )) INTO v_assignee_breakdown
  FROM (
    SELECT 
      ctc.assigned_to as assignee_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ctc.execution_status = 'passed') as passed,
      COUNT(*) FILTER (WHERE ctc.execution_status = 'failed') as failed
    FROM th_cycle_test_cases ctc
    WHERE ctc.cycle_id = p_cycle_id
    GROUP BY ctc.assigned_to
  ) sub
  LEFT JOIN profiles p ON p.id = sub.assignee_id;

  SELECT jsonb_agg(jsonb_build_object(
    'case_key', tc.case_key,
    'title', tc.title,
    'priority', tc.priority,
    'status', ctc.execution_status,
    'executed_at', ctc.executed_at,
    'executed_by', p.full_name
  )) INTO v_test_cases
  FROM th_cycle_test_cases ctc
  JOIN th_test_cases tc ON tc.id = ctc.test_case_id
  LEFT JOIN profiles p ON p.id = ctc.executed_by
  WHERE ctc.cycle_id = p_cycle_id
  ORDER BY tc.case_key;

  v_result := jsonb_build_object(
    'cycle', jsonb_build_object(
      'id', v_cycle.id,
      'cycle_key', v_cycle.cycle_key,
      'name', v_cycle.name,
      'status', v_cycle.status,
      'start_date', v_cycle.start_date,
      'end_date', v_cycle.end_date
    ),
    'summary', jsonb_build_object(
      'total_cases', v_cycle.total_cases,
      'executed', v_cycle.total_cases - v_cycle.not_run_count,
      'passed', v_cycle.passed_count,
      'failed', v_cycle.failed_count,
      'blocked', v_cycle.blocked_count,
      'skipped', v_cycle.skipped_count,
      'not_run', v_cycle.not_run_count,
      'progress_percent', v_cycle.progress_percent,
      'pass_rate', CASE WHEN (v_cycle.total_cases - v_cycle.not_run_count) > 0 
        THEN ROUND((v_cycle.passed_count::NUMERIC / (v_cycle.total_cases - v_cycle.not_run_count)) * 100, 1)
        ELSE 0 END
    ),
    'status_breakdown', COALESCE(v_status_breakdown, '{}'::JSONB),
    'assignee_breakdown', COALESCE(v_assignee_breakdown, '[]'::JSONB),
    'test_cases', COALESCE(v_test_cases, '[]'::JSONB),
    'generated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to generate defect report data
CREATE OR REPLACE FUNCTION generate_defect_report_data(p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_severity_breakdown JSONB;
  v_status_breakdown JSONB;
  v_defects JSONB;
BEGIN
  SELECT jsonb_object_agg(severity, cnt) INTO v_severity_breakdown
  FROM (
    SELECT severity, COUNT(*) as cnt
    FROM th_defects
    WHERE (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to + INTERVAL '1 day')
    GROUP BY severity
  ) sub;

  SELECT jsonb_object_agg(status, cnt) INTO v_status_breakdown
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM th_defects
    WHERE (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to + INTERVAL '1 day')
    GROUP BY status
  ) sub;

  SELECT jsonb_agg(jsonb_build_object(
    'defect_key', d.defect_key,
    'title', d.title,
    'severity', d.severity,
    'priority', d.priority,
    'status', d.status,
    'created_at', d.created_at,
    'reporter', p.full_name
  )) INTO v_defects
  FROM th_defects d
  LEFT JOIN profiles p ON p.id = d.reporter_id
  WHERE (p_date_from IS NULL OR d.created_at >= p_date_from)
    AND (p_date_to IS NULL OR d.created_at <= p_date_to + INTERVAL '1 day')
  ORDER BY d.created_at DESC;

  v_result := jsonb_build_object(
    'date_range', jsonb_build_object('from', p_date_from, 'to', p_date_to),
    'total_defects', COALESCE(jsonb_array_length(v_defects), 0),
    'severity_breakdown', COALESCE(v_severity_breakdown, '{}'::JSONB),
    'status_breakdown', COALESCE(v_status_breakdown, '{}'::JSONB),
    'defects', COALESCE(v_defects, '[]'::JSONB),
    'generated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get report stats
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE (
  total_reports BIGINT,
  ready_reports BIGINT,
  this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'ready')::BIGINT,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))::BIGINT
  FROM th_reports
  WHERE status != 'archived';
END;
$$ LANGUAGE plpgsql;

-- 11. Enable RLS
ALTER TABLE th_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_scheduled_reports ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON th_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON th_report_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON th_scheduled_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. Insert default report templates
INSERT INTO th_report_templates (name, type, description, is_default, config) VALUES
  ('Cycle Summary', 'cycle_summary', 'Standard test cycle execution summary', TRUE, '{"include_test_details": true, "include_charts": true}'),
  ('Plan Overview', 'plan_summary', 'Test plan progress and coverage overview', TRUE, '{"include_cycles": true, "include_stats": true}'),
  ('Coverage Report', 'coverage', 'Requirements coverage analysis', TRUE, '{"group_by": "requirement", "show_gaps": true}'),
  ('Defect Summary', 'defect', 'Defect status and trends report', TRUE, '{"include_charts": true, "group_by": "severity"}'),
  ('Trend Analysis', 'trend', 'Historical testing trends over time', TRUE, '{"period": "weekly", "metrics": ["pass_rate", "defects"]}')
ON CONFLICT DO NOTHING;