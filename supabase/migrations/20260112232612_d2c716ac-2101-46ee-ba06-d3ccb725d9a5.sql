-- =============================================
-- CATALYST SECTION 3: DATABASE MIGRATION
-- Adds missing tables, functions, and RLS for Test Case Detail
-- =============================================

-- =============================================
-- ADD MISSING COLUMNS TO test_cases
-- =============================================
DO $$ 
BEGIN
  -- Add description column if not exists (spec calls it description, we have objective)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'description') THEN
    ALTER TABLE test_cases ADD COLUMN description TEXT;
  END IF;
  
  -- Add estimated_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'estimated_time') THEN
    ALTER TABLE test_cases ADD COLUMN estimated_time INTEGER CHECK (estimated_time >= 0);
  END IF;
  
  -- Add execution metrics columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'execution_count') THEN
    ALTER TABLE test_cases ADD COLUMN execution_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'pass_rate') THEN
    ALTER TABLE test_cases ADD COLUMN pass_rate NUMERIC(5,2) CHECK (pass_rate >= 0 AND pass_rate <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'last_executed_at') THEN
    ALTER TABLE test_cases ADD COLUMN last_executed_at TIMESTAMPTZ;
  END IF;
  
  -- Add updated_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'updated_by') THEN
    ALTER TABLE test_cases ADD COLUMN updated_by UUID REFERENCES profiles(id);
  END IF;
  
  -- Add soft delete columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'deleted_at') THEN
    ALTER TABLE test_cases ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'deleted_by') THEN
    ALTER TABLE test_cases ADD COLUMN deleted_by UUID REFERENCES profiles(id);
  END IF;
  
  -- Add release_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_cases' AND column_name = 'release_id') THEN
    ALTER TABLE test_cases ADD COLUMN release_id UUID REFERENCES releases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- ADD MISSING COLUMNS TO test_steps
-- =============================================
DO $$ 
BEGIN
  -- Add notes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'notes') THEN
    ALTER TABLE test_steps ADD COLUMN notes TEXT;
  END IF;
END $$;

-- =============================================
-- TABLE: test_case_defects
-- =============================================
CREATE TABLE IF NOT EXISTS test_case_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE NOT NULL,
  defect_id UUID REFERENCES defects(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES test_steps(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  linked_by UUID REFERENCES profiles(id) NOT NULL,
  
  UNIQUE(test_case_id, defect_id)
);

CREATE INDEX IF NOT EXISTS idx_tc_def_case ON test_case_defects(test_case_id);

-- =============================================
-- TABLE: execution_results
-- =============================================
CREATE TABLE IF NOT EXISTS execution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE NOT NULL,
  cycle_id UUID,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'blocked', 'skipped', 'not_run')),
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')),
  duration INTEGER CHECK (duration >= 0),
  notes TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  executed_by UUID REFERENCES profiles(id) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exec_results_case ON execution_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_exec_results_date ON execution_results(executed_at DESC);

-- =============================================
-- TABLE: test_case_activities
-- =============================================
CREATE TABLE IF NOT EXISTS test_case_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'status_changed', 'assigned',
    'step_added', 'step_updated', 'step_deleted', 'step_reordered',
    'attachment_added', 'attachment_removed',
    'executed', 'defect_linked', 'defect_unlinked',
    'requirement_linked', 'requirement_unlinked',
    'duplicated', 'archived', 'restored'
  )),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_case ON test_case_activities(test_case_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON test_case_activities(created_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Log activity function
CREATE OR REPLACE FUNCTION log_test_case_activity(
  p_test_case_id UUID,
  p_action TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO test_case_activities (test_case_id, action, description, metadata, created_by)
  VALUES (p_test_case_id, p_action, p_description, p_metadata, auth.uid())
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update execution metrics
CREATE OR REPLACE FUNCTION update_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE test_cases
  SET 
    execution_count = (SELECT COUNT(*) FROM execution_results WHERE test_case_id = NEW.test_case_id),
    pass_rate = (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'passed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        2
      )
      FROM execution_results 
      WHERE test_case_id = NEW.test_case_id
    ),
    last_executed_at = NEW.executed_at,
    updated_by = NEW.executed_by
  WHERE id = NEW.test_case_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for execution metrics
DROP TRIGGER IF EXISTS tr_execution_metrics ON execution_results;
CREATE TRIGGER tr_execution_metrics
  AFTER INSERT ON execution_results
  FOR EACH ROW
  EXECUTE FUNCTION update_execution_metrics();

-- Reorder steps function
CREATE OR REPLACE FUNCTION reorder_test_steps(
  p_test_case_id UUID,
  p_step_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Temporarily set all orders to negative to avoid unique constraint
  UPDATE test_steps SET step_order = -step_order WHERE test_case_id = p_test_case_id;
  
  -- Set new orders
  FOR i IN 1..array_length(p_step_ids, 1) LOOP
    UPDATE test_steps
    SET step_order = i
    WHERE id = p_step_ids[i] AND test_case_id = p_test_case_id;
  END LOOP;
  
  -- Log activity
  PERFORM log_test_case_activity(
    p_test_case_id,
    'step_reordered',
    'Steps reordered',
    jsonb_build_object('step_ids', p_step_ids)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Shift steps down (for insert/duplicate)
CREATE OR REPLACE FUNCTION shift_steps_down(
  p_test_case_id UUID,
  p_after_order INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE test_steps
  SET step_order = step_order + 1
  WHERE test_case_id = p_test_case_id AND step_order > p_after_order;
END;
$$ LANGUAGE plpgsql;

-- Reorder after delete
CREATE OR REPLACE FUNCTION reorder_remaining_steps(
  p_test_case_id UUID,
  p_deleted_order INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE test_steps
  SET step_order = step_order - 1
  WHERE test_case_id = p_test_case_id AND step_order > p_deleted_order;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE test_case_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_activities ENABLE ROW LEVEL SECURITY;

-- test_case_defects policies
DROP POLICY IF EXISTS "Users can view test case defects" ON test_case_defects;
CREATE POLICY "Users can view test case defects" ON test_case_defects
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage test case defects" ON test_case_defects;
CREATE POLICY "Users can manage test case defects" ON test_case_defects
  FOR ALL USING (auth.uid() IS NOT NULL);

-- execution_results policies
DROP POLICY IF EXISTS "Users can view execution results" ON execution_results;
CREATE POLICY "Users can view execution results" ON execution_results
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert execution results" ON execution_results;
CREATE POLICY "Users can insert execution results" ON execution_results
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- test_case_activities policies
DROP POLICY IF EXISTS "Users can view activities" ON test_case_activities;
CREATE POLICY "Users can view activities" ON test_case_activities
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert activities" ON test_case_activities;
CREATE POLICY "System can insert activities" ON test_case_activities
  FOR INSERT WITH CHECK (true);

-- =============================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-attachments', 'test-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Anyone can view test attachments" ON storage.objects;
CREATE POLICY "Anyone can view test attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'test-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload test attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload test attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'test-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own test attachments" ON storage.objects;
CREATE POLICY "Users can delete own test attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'test-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);