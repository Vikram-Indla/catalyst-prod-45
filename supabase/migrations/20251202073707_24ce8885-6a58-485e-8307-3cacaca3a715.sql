-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view work item links in their program" ON test_case_work_item_links;
DROP POLICY IF EXISTS "Users can create work item links" ON test_case_work_item_links;
DROP POLICY IF EXISTS "Users can delete work item links" ON test_case_work_item_links;

-- Create RLS Policies
CREATE POLICY "Users can view work item links in their program"
  ON test_case_work_item_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM test_cases tc
      WHERE tc.id = test_case_work_item_links.case_id
    )
  );

CREATE POLICY "Users can create work item links"
  ON test_case_work_item_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM test_cases tc
      WHERE tc.id = test_case_work_item_links.case_id
    )
  );

CREATE POLICY "Users can delete work item links"
  ON test_case_work_item_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM test_cases tc
      WHERE tc.id = test_case_work_item_links.case_id
    )
  );