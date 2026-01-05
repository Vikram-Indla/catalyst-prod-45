-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 4: REPORTS & ANALYTICS - DATABASE FOUNDATION (FINAL)
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper function for timestamp updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 001: Report Types & Configurations
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE report_type AS ENUM (
  'execution_summary',
  'coverage_report', 
  'defect_analysis',
  'trend_analysis',
  'cycle_comparison',
  'custom'
);

CREATE TYPE report_format AS ENUM ('pdf', 'xlsx', 'csv', 'json');

CREATE TABLE public.report_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type report_type NOT NULL,
  
  -- Configuration (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Scheduling (for automated reports)
  schedule_enabled BOOLEAN DEFAULT FALSE,
  schedule_cron VARCHAR(100),
  schedule_recipients TEXT[],
  last_generated_at TIMESTAMPTZ,
  
  -- Access
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_configs_project ON public.report_configurations(project_id);
CREATE INDEX idx_report_configs_type ON public.report_configurations(report_type);
CREATE INDEX idx_report_configs_created_by ON public.report_configurations(created_by);

-- RLS
ALTER TABLE public.report_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports in their projects"
  ON public.report_configurations FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    ) OR is_public = TRUE
  );

CREATE POLICY "Users can manage their own reports"
  ON public.report_configurations FOR ALL
  USING (created_by = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 002: Generated Reports (History)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_config_id UUID REFERENCES public.report_configurations(id) ON DELETE SET NULL,
  
  -- Report Info
  name VARCHAR(255) NOT NULL,
  report_type report_type NOT NULL,
  format report_format NOT NULL,
  
  -- File
  file_url TEXT,
  file_size_bytes INTEGER,
  
  -- Snapshot Data (JSONB for archival)
  snapshot_data JSONB,
  
  -- Parameters used
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Generation
  generated_by UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Expiry
  expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_generated_reports_project ON public.generated_reports(project_id);
CREATE INDEX idx_generated_reports_config ON public.generated_reports(report_config_id);
CREATE INDEX idx_generated_reports_generated_at ON public.generated_reports(generated_at DESC);

-- RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view generated reports in their projects"
  ON public.generated_reports FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create reports in their projects"
  ON public.generated_reports FOR INSERT
  WITH CHECK (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 003: Dashboard Widgets
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TYPE widget_type AS ENUM (
  'kpi_card',
  'bar_chart',
  'line_chart',
  'donut_chart',
  'table',
  'heatmap',
  'progress_bar',
  'trend_sparkline'
);

CREATE TABLE public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Widget Info
  name VARCHAR(100) NOT NULL,
  widget_type widget_type NOT NULL,
  
  -- Layout (grid position)
  grid_x INTEGER NOT NULL DEFAULT 0,
  grid_y INTEGER NOT NULL DEFAULT 0,
  grid_w INTEGER NOT NULL DEFAULT 4,
  grid_h INTEGER NOT NULL DEFAULT 4,
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dashboard_widgets_user ON public.dashboard_widgets(user_id);
CREATE INDEX idx_dashboard_widgets_project ON public.dashboard_widgets(project_id);

-- RLS
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own widgets"
  ON public.dashboard_widgets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own widgets"
  ON public.dashboard_widgets FOR ALL
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 004: Daily Execution Stats (Analytics Aggregates)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.daily_execution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.tm_test_cycles(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  
  -- Counts
  total_executions INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  
  -- Rates
  pass_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Duration
  total_duration_seconds INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  
  -- Defects
  defects_found INTEGER DEFAULT 0,
  
  -- Unique test cases
  unique_cases_executed INTEGER DEFAULT 0,
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_daily_stat UNIQUE (project_id, cycle_id, stat_date)
);

-- Indexes
CREATE INDEX idx_daily_stats_project_date ON public.daily_execution_stats(project_id, stat_date DESC);
CREATE INDEX idx_daily_stats_cycle ON public.daily_execution_stats(cycle_id);

-- RLS
ALTER TABLE public.daily_execution_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stats in their projects"
  ON public.daily_execution_stats FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 005: Analytics Functions
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to get execution summary
CREATE OR REPLACE FUNCTION get_execution_summary(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_cycle_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  total_executions BIGINT,
  passed_count BIGINT,
  failed_count BIGINT,
  blocked_count BIGINT,
  skipped_count BIGINT,
  pass_rate NUMERIC,
  total_duration_seconds BIGINT,
  defects_found BIGINT,
  unique_cases_executed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(des.total_executions), 0)::BIGINT,
    COALESCE(SUM(des.passed_count), 0)::BIGINT,
    COALESCE(SUM(des.failed_count), 0)::BIGINT,
    COALESCE(SUM(des.blocked_count), 0)::BIGINT,
    COALESCE(SUM(des.skipped_count), 0)::BIGINT,
    CASE 
      WHEN SUM(des.total_executions) > 0 THEN
        ROUND((SUM(des.passed_count)::NUMERIC / SUM(des.total_executions)::NUMERIC) * 100, 2)
      ELSE 0
    END,
    COALESCE(SUM(des.total_duration_seconds), 0)::BIGINT,
    COALESCE(SUM(des.defects_found), 0)::BIGINT,
    COALESCE(SUM(des.unique_cases_executed), 0)::BIGINT
  FROM public.daily_execution_stats des
  WHERE des.project_id = p_project_id
    AND des.stat_date BETWEEN p_start_date AND p_end_date
    AND (p_cycle_ids IS NULL OR des.cycle_id = ANY(p_cycle_ids));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trend data
CREATE OR REPLACE FUNCTION get_execution_trend(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_grouping VARCHAR DEFAULT 'day'
)
RETURNS TABLE (
  period_start DATE,
  total_executions BIGINT,
  passed_count BIGINT,
  failed_count BIGINT,
  blocked_count BIGINT,
  skipped_count BIGINT,
  pass_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE 
      WHEN p_grouping = 'day' THEN des.stat_date
      WHEN p_grouping = 'week' THEN DATE_TRUNC('week', des.stat_date)::DATE
      WHEN p_grouping = 'month' THEN DATE_TRUNC('month', des.stat_date)::DATE
      ELSE des.stat_date
    END as period_start,
    SUM(des.total_executions)::BIGINT,
    SUM(des.passed_count)::BIGINT,
    SUM(des.failed_count)::BIGINT,
    SUM(des.blocked_count)::BIGINT,
    SUM(des.skipped_count)::BIGINT,
    CASE 
      WHEN SUM(des.total_executions) > 0 THEN
        ROUND((SUM(des.passed_count)::NUMERIC / SUM(des.total_executions)::NUMERIC) * 100, 2)
      ELSE 0
    END as pass_rate
  FROM public.daily_execution_stats des
  WHERE des.project_id = p_project_id
    AND des.stat_date BETWEEN p_start_date AND p_end_date
  GROUP BY 1
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coverage stats
CREATE OR REPLACE FUNCTION get_coverage_stats(
  p_project_id UUID,
  p_cycle_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_test_cases INTEGER,
  executed_test_cases INTEGER,
  execution_coverage_pct NUMERIC,
  automated_test_cases INTEGER,
  automation_rate_pct NUMERIC
) AS $$
DECLARE
  v_total_cases INTEGER;
  v_executed_cases INTEGER;
  v_automated_cases INTEGER;
BEGIN
  -- Count total test cases
  SELECT COUNT(*) INTO v_total_cases
  FROM public.tm_test_cases WHERE project_id = p_project_id;
  
  -- Count executed test cases
  IF p_cycle_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT test_case_id) INTO v_executed_cases
    FROM public.tm_cycle_scope
    WHERE cycle_id = p_cycle_id AND current_status NOT IN ('not_run');
  ELSE
    SELECT COUNT(DISTINCT test_case_id) INTO v_executed_cases
    FROM public.tm_cycle_scope cs
    JOIN public.tm_test_cycles tc ON cs.cycle_id = tc.id
    WHERE tc.project_id = p_project_id AND cs.current_status NOT IN ('not_run');
  END IF;
  
  -- Count automated test cases
  SELECT COUNT(*) INTO v_automated_cases
  FROM public.tm_test_cases
  WHERE project_id = p_project_id AND automation_status = 'automated';
  
  RETURN QUERY SELECT
    COALESCE(v_total_cases, 0),
    COALESCE(v_executed_cases, 0),
    CASE WHEN v_total_cases > 0 
      THEN ROUND((v_executed_cases::NUMERIC / v_total_cases::NUMERIC) * 100, 1)
      ELSE 0 END,
    COALESCE(v_automated_cases, 0),
    CASE WHEN v_total_cases > 0
      THEN ROUND((v_automated_cases::NUMERIC / v_total_cases::NUMERIC) * 100, 1)
      ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 006: Timestamp Triggers
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_report_configs_timestamp
  BEFORE UPDATE ON public.report_configurations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_dashboard_widgets_timestamp
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();