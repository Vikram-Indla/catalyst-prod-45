-- Drop existing policies on tm_test_case_versions
DROP POLICY IF EXISTS "Users can create versions in their projects" ON tm_test_case_versions;
DROP POLICY IF EXISTS "Users can view version history in their projects" ON tm_test_case_versions;

-- Create new policies using existing security definer function
CREATE POLICY "Users can view version history"
ON tm_test_case_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tm_test_cases tc
    WHERE tc.id = tm_test_case_versions.test_case_id
      AND is_project_member(auth.uid(), tc.project_id)
  )
);

CREATE POLICY "Users can create versions"
ON tm_test_case_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tm_test_cases tc
    WHERE tc.id = tm_test_case_versions.test_case_id
      AND is_project_member(auth.uid(), tc.project_id)
  )
);