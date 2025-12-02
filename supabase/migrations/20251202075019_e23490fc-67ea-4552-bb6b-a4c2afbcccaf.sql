-- Create test reports tables for analytics and reporting

CREATE TABLE IF NOT EXISTS test_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(100) NOT NULL,
  program_id UUID NOT NULL,
  config JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by UUID,
  file_url VARCHAR(500),
  share_token VARCHAR(100),
  share_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(100) NOT NULL,
  program_id UUID NOT NULL,
  config JSONB NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  recipients TEXT[],
  format VARCHAR(50) DEFAULT 'pdf',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_reports_program ON test_reports(program_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_type ON test_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_test_reports_generated_at ON test_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_test_report_schedules_program ON test_report_schedules(program_id);
CREATE INDEX IF NOT EXISTS idx_test_report_schedules_active ON test_report_schedules(is_active);

-- Enable RLS
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_report_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view reports for their programs" ON test_reports;
DROP POLICY IF EXISTS "Users can create reports" ON test_reports;
DROP POLICY IF EXISTS "Users can view report schedules" ON test_report_schedules;
DROP POLICY IF EXISTS "Users can manage report schedules" ON test_report_schedules;

-- RLS Policies
CREATE POLICY "Users can view reports for their programs"
  ON test_reports FOR SELECT
  USING (true);

CREATE POLICY "Users can create reports"
  ON test_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view report schedules"
  ON test_report_schedules FOR SELECT
  USING (true);

CREATE POLICY "Users can manage report schedules"
  ON test_report_schedules FOR ALL
  USING (true);