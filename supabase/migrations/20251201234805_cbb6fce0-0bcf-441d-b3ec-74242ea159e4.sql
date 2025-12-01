-- CATALYST TESTS - Bidirectional Work Item Test Linking
-- Phase 2B: Critical Integration Feature

-- Create test_case_work_items table for bidirectional linking
CREATE TABLE IF NOT EXISTS test_case_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  work_item_id UUID NOT NULL,
  work_item_type VARCHAR(50) NOT NULL CHECK (work_item_type IN ('story', 'feature', 'defect', 'epic', 'task')),
  link_type VARCHAR(50) DEFAULT 'covers' CHECK (link_type IN ('covers', 'tests', 'validates', 'reproduces')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(test_case_id, work_item_id, work_item_type)
);

-- Add indexes for performance
CREATE INDEX idx_test_case_work_items_work_item ON test_case_work_items(work_item_id, work_item_type);
CREATE INDEX idx_test_case_work_items_test_case ON test_case_work_items(test_case_id);
CREATE INDEX idx_test_case_work_items_created ON test_case_work_items(created_at DESC);

-- Enable RLS
ALTER TABLE test_case_work_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view work item test links"
  ON test_case_work_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create work item test links"
  ON test_case_work_items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own work item test links"
  ON test_case_work_items FOR DELETE
  USING (auth.uid() = created_by);

COMMENT ON TABLE test_case_work_items IS 'Bidirectional linking between test cases and Catalyst work items';