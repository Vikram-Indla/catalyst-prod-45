-- Enhanced Test Cycles Schema for Comprehensive Management

-- Add new columns to test_cycles table
ALTER TABLE test_cycles 
ADD COLUMN IF NOT EXISTS objective TEXT,
ADD COLUMN IF NOT EXISTS build_version VARCHAR(100),
ADD COLUMN IF NOT EXISTS environment VARCHAR(100) DEFAULT 'production',
ADD COLUMN IF NOT EXISTS scope_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scope_locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scope_locked_by UUID,
ADD COLUMN IF NOT EXISTS auto_close_on_completion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID,
ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS sync_with_set BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_set_id UUID REFERENCES test_sets(id),
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Create cycle templates table
CREATE TABLE IF NOT EXISTS test_cycle_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID,
  is_global BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cycle case assignments table for planning
CREATE TABLE IF NOT EXISTS test_cycle_case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES test_cycles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  assigned_to UUID,
  sort_order INTEGER DEFAULT 0,
  milestone VARCHAR(100),
  estimated_effort INTEGER DEFAULT 0,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID,
  UNIQUE(cycle_id, case_id, assigned_to)
);

-- Create cycle dependencies table
CREATE TABLE IF NOT EXISTS test_cycle_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES test_cycles(id) ON DELETE CASCADE,
  predecessor_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  successor_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'finish_to_start',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cycle_id, predecessor_case_id, successor_case_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cycle_assignments_cycle ON test_cycle_case_assignments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_assignments_user ON test_cycle_case_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cycle_dependencies_cycle ON test_cycle_dependencies(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycles_archived ON test_cycles(archived);
CREATE INDEX IF NOT EXISTS idx_cycles_template ON test_cycles(template_id);
CREATE INDEX IF NOT EXISTS idx_cycle_templates_project ON test_cycle_templates(project_id);

-- Enable RLS on new tables
ALTER TABLE test_cycle_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cycle_case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cycle_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_cycle_templates
CREATE POLICY "Allow authenticated users to view templates" ON test_cycle_templates
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage templates" ON test_cycle_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS policies for test_cycle_case_assignments
CREATE POLICY "Allow authenticated users to view assignments" ON test_cycle_case_assignments
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage assignments" ON test_cycle_case_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS policies for test_cycle_dependencies
CREATE POLICY "Allow authenticated users to view dependencies" ON test_cycle_dependencies
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage dependencies" ON test_cycle_dependencies
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default cycle templates
INSERT INTO test_cycle_templates (name, description, is_global, config) VALUES
('Regression Test Cycle', 'Standard regression testing template', true, '{"environment": "staging", "auto_close_on_completion": true}'),
('Smoke Test Cycle', 'Quick smoke testing template', true, '{"environment": "production", "auto_close_on_completion": true}'),
('UAT Cycle', 'User acceptance testing template', true, '{"environment": "staging", "email_notifications": true}'),
('Sprint Cycle', 'Standard sprint testing template', true, '{"environment": "development", "scope_locked": false}')
ON CONFLICT DO NOTHING;