-- Restrict ph_jira_connection SELECT to admins only
DROP POLICY IF EXISTS "wh_jira_connection_select" ON ph_jira_connection;
CREATE POLICY "jira_connection_admin_select" 
  ON ph_jira_connection FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Restrict ph_jira_connection UPDATE to admins only
DROP POLICY IF EXISTS "wh_jira_connection_update" ON ph_jira_connection;
CREATE POLICY "jira_connection_admin_update" 
  ON ph_jira_connection FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );