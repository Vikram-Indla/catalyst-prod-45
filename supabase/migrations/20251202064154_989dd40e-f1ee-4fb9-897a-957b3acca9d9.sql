-- Add missing columns to existing test_folders table
ALTER TABLE test_folders 
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) CHECK (entity_type IN ('test_cases', 'test_sets', 'test_cycles')),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Create index on entity_type
CREATE INDEX IF NOT EXISTS idx_folders_entity_type ON test_folders(entity_type);

-- Add folder_id columns to test tables if they don't exist
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL;
ALTER TABLE test_sets ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL;
ALTER TABLE test_cycles ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES test_folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_cases_folder ON test_cases(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_sets_folder ON test_sets(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_cycles_folder ON test_cycles(folder_id) WHERE folder_id IS NOT NULL;