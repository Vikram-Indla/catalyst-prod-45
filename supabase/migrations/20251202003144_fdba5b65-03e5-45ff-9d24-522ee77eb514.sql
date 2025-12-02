-- Add program_id to all test management tables and update RLS policies

-- Add program_id to test_cases
ALTER TABLE test_cases ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
CREATE INDEX idx_test_cases_program_id ON test_cases(program_id);

-- Add program_id to test_folders
ALTER TABLE test_folders ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
CREATE INDEX idx_test_folders_program_id ON test_folders(program_id);

-- Add program_id to test_sets
ALTER TABLE test_sets ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
CREATE INDEX idx_test_sets_program_id ON test_sets(program_id);

-- Add program_id to test_cycles
ALTER TABLE test_cycles ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
CREATE INDEX idx_test_cycles_program_id ON test_cycles(program_id);

-- Add program_id to test_executions
ALTER TABLE test_executions ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
CREATE INDEX idx_test_executions_program_id ON test_executions(program_id);

-- Add program_id to test_activity_log
ALTER TABLE test_activity_log ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;
CREATE INDEX idx_test_activity_log_program_id ON test_activity_log(program_id);

-- Drop existing RLS policies and recreate with program_id filtering

-- test_cases policies
DROP POLICY IF EXISTS "Users can view test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can create test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can update test cases" ON test_cases;
DROP POLICY IF EXISTS "Users can delete test cases" ON test_cases;

CREATE POLICY "Users can view test cases in their program"
ON test_cases FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create test cases in their program"
ON test_cases FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND program_id IS NOT NULL);

CREATE POLICY "Users can update test cases in their program"
ON test_cases FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test cases in their program"
ON test_cases FOR DELETE
USING (auth.uid() IS NOT NULL);

-- test_folders policies
DROP POLICY IF EXISTS "Users can view test folders" ON test_folders;
DROP POLICY IF EXISTS "Users can create test folders" ON test_folders;
DROP POLICY IF EXISTS "Users can update test folders" ON test_folders;
DROP POLICY IF EXISTS "Users can delete test folders" ON test_folders;

CREATE POLICY "Users can view test folders in their program"
ON test_folders FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create test folders in their program"
ON test_folders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND program_id IS NOT NULL);

CREATE POLICY "Users can update test folders in their program"
ON test_folders FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test folders in their program"
ON test_folders FOR DELETE
USING (auth.uid() IS NOT NULL);

-- test_sets policies
DROP POLICY IF EXISTS "Users can view test sets" ON test_sets;
DROP POLICY IF EXISTS "Users can create test sets" ON test_sets;
DROP POLICY IF EXISTS "Users can update test sets" ON test_sets;
DROP POLICY IF EXISTS "Users can delete test sets" ON test_sets;

CREATE POLICY "Users can view test sets in their program"
ON test_sets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create test sets in their program"
ON test_sets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND program_id IS NOT NULL);

CREATE POLICY "Users can update test sets in their program"
ON test_sets FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test sets in their program"
ON test_sets FOR DELETE
USING (auth.uid() IS NOT NULL);

-- test_cycles policies
DROP POLICY IF EXISTS "Users can view test cycles" ON test_cycles;
DROP POLICY IF EXISTS "Users can create test cycles" ON test_cycles;
DROP POLICY IF EXISTS "Users can update test cycles" ON test_cycles;
DROP POLICY IF EXISTS "Users can delete test cycles" ON test_cycles;

CREATE POLICY "Users can view test cycles in their program"
ON test_cycles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create test cycles in their program"
ON test_cycles FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND program_id IS NOT NULL);

CREATE POLICY "Users can update test cycles in their program"
ON test_cycles FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test cycles in their program"
ON test_cycles FOR DELETE
USING (auth.uid() IS NOT NULL);

-- test_executions policies
DROP POLICY IF EXISTS "Users can view test executions" ON test_executions;
DROP POLICY IF EXISTS "Users can create test executions" ON test_executions;
DROP POLICY IF EXISTS "Users can update test executions" ON test_executions;
DROP POLICY IF EXISTS "Users can delete test executions" ON test_executions;

CREATE POLICY "Users can view test executions in their program"
ON test_executions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create test executions in their program"
ON test_executions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND program_id IS NOT NULL);

CREATE POLICY "Users can update test executions in their program"
ON test_executions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test executions in their program"
ON test_executions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- test_activity_log policies
DROP POLICY IF EXISTS "Users can view test activity log" ON test_activity_log;
DROP POLICY IF EXISTS "Users can create test activity log" ON test_activity_log;

CREATE POLICY "Users can view test activity log in their program"
ON test_activity_log FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create test activity log in their program"
ON test_activity_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND program_id IS NOT NULL);