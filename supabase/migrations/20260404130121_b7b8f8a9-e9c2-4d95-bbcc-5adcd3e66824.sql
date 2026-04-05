ALTER TABLE tm_step_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON tm_step_results;

CREATE POLICY "authenticated_full_access"
  ON tm_step_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);