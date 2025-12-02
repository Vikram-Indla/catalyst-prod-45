-- Add archive and delete tracking columns to test_cases
ALTER TABLE test_cases 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create indexes for archived and deleted cases
CREATE INDEX IF NOT EXISTS idx_cases_archived ON test_cases(is_archived) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_cases_deleted ON test_cases(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add missing columns to existing test_case_versions table
ALTER TABLE test_case_versions
ADD COLUMN IF NOT EXISTS status VARCHAR(50),
ADD COLUMN IF NOT EXISTS priority VARCHAR(50),
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES test_folders(id),
ADD COLUMN IF NOT EXISTS component VARCHAR(255),
ADD COLUMN IF NOT EXISTS release VARCHAR(255),
ADD COLUMN IF NOT EXISTS labels TEXT[],
ADD COLUMN IF NOT EXISTS snapshot_data JSONB;

-- Create index on test_case_versions
CREATE INDEX IF NOT EXISTS idx_case_versions_case ON test_case_versions(case_id, version DESC);

-- Create test_case_version_changes table
CREATE TABLE IF NOT EXISTS test_case_version_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES test_cases(id),
  from_version INTEGER,
  to_version INTEGER NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(50),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_version_changes ON test_case_version_changes(case_id, to_version);

-- Create test_case_bulk_operations table
CREATE TABLE IF NOT EXISTS test_case_bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(50) NOT NULL,
  case_ids UUID[] NOT NULL,
  operation_data JSONB,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'completed',
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  error_messages TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_bulk_ops_user ON test_case_bulk_operations(executed_by);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_type ON test_case_bulk_operations(operation_type);

-- Enable RLS on new tables
ALTER TABLE test_case_version_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_bulk_operations ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_case_version_changes
CREATE POLICY "Users can view version changes of accessible cases"
  ON test_case_version_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM test_cases
      WHERE test_cases.id = test_case_version_changes.case_id
      AND test_cases.program_id IN (
        SELECT program_id FROM program_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for test_case_bulk_operations
CREATE POLICY "Users can view their own bulk operations"
  ON test_case_bulk_operations FOR SELECT
  USING (executed_by = auth.uid());

CREATE POLICY "Users can create bulk operations"
  ON test_case_bulk_operations FOR INSERT
  WITH CHECK (executed_by = auth.uid());