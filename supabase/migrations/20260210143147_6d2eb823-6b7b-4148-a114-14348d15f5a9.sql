
-- ============================================
-- G4-01: TEST EXECUTION DATABASE SETUP
-- ============================================

-- 1. ADD COLUMNS TO th_cycle_test_cases (if not exist)
ALTER TABLE th_cycle_test_cases 
ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(50);

ALTER TABLE th_cycle_test_cases 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 2. CREATE EXECUTION ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS th_execution_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_test_case_id UUID NOT NULL REFERENCES th_cycle_test_cases(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_attachments_ctc 
ON th_execution_attachments(cycle_test_case_id);

-- 3. CREATE EXECUTION HISTORY TABLE
CREATE TABLE IF NOT EXISTS th_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_test_case_id UUID NOT NULL REFERENCES th_cycle_test_cases(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  execution_time_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_execution_history_ctc 
ON th_execution_history(cycle_test_case_id);

CREATE INDEX IF NOT EXISTS idx_execution_history_changed_at 
ON th_execution_history(changed_at DESC);

-- 4. CREATE STEP RESULTS TABLE
CREATE TABLE IF NOT EXISTS th_step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_test_case_id UUID NOT NULL REFERENCES th_cycle_test_cases(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'not_run',
  notes TEXT,
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES profiles(id),
  UNIQUE(cycle_test_case_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_step_results_ctc 
ON th_step_results(cycle_test_case_id);

-- 5. ENABLE RLS
ALTER TABLE th_execution_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_execution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE th_step_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for th_execution_attachments
CREATE POLICY "Authenticated users can view execution attachments"
ON th_execution_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert execution attachments"
ON th_execution_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete execution attachments"
ON th_execution_attachments FOR DELETE TO authenticated USING (true);

-- RLS policies for th_execution_history
CREATE POLICY "Authenticated users can view execution history"
ON th_execution_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert execution history"
ON th_execution_history FOR INSERT TO authenticated WITH CHECK (true);

-- RLS policies for th_step_results
CREATE POLICY "Authenticated users can view step results"
ON th_step_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert step results"
ON th_step_results FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update step results"
ON th_step_results FOR UPDATE TO authenticated USING (true);

-- 6. CREATE FUNCTION TO LOG EXECUTION HISTORY
CREATE OR REPLACE FUNCTION log_execution_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.execution_status IS DISTINCT FROM NEW.execution_status THEN
    INSERT INTO th_execution_history (
      cycle_test_case_id,
      old_status,
      new_status,
      changed_by,
      notes,
      execution_time_seconds
    ) VALUES (
      NEW.id,
      OLD.execution_status,
      NEW.execution_status,
      NEW.executed_by,
      NEW.notes,
      NEW.execution_time_seconds
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE TRIGGER FOR HISTORY LOGGING
DROP TRIGGER IF EXISTS trg_log_execution_history ON th_cycle_test_cases;
CREATE TRIGGER trg_log_execution_history
AFTER UPDATE ON th_cycle_test_cases
FOR EACH ROW
EXECUTE FUNCTION log_execution_history();

-- 8. ADD 'skipped' TO STATUS CHECK CONSTRAINT
ALTER TABLE th_cycle_test_cases 
DROP CONSTRAINT IF EXISTS th_cycle_test_cases_execution_status_check;

ALTER TABLE th_cycle_test_cases 
ADD CONSTRAINT th_cycle_test_cases_execution_status_check 
CHECK (execution_status IN ('not_run', 'passed', 'failed', 'blocked', 'skipped'));

-- 9. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('execution-attachments', 'execution-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload execution attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'execution-attachments');

CREATE POLICY "Users can view execution attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'execution-attachments');

CREATE POLICY "Users can delete execution attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'execution-attachments');
