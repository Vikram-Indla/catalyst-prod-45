-- Drop existing restrictive policies
DROP POLICY IF EXISTS "tm_folders_insert" ON tm_folders;
DROP POLICY IF EXISTS "tm_folders_select" ON tm_folders;
DROP POLICY IF EXISTS "tm_folders_update" ON tm_folders;
DROP POLICY IF EXISTS "tm_folders_delete" ON tm_folders;

-- Create permissive policies for authenticated users
CREATE POLICY "tm_folders_select" ON tm_folders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tm_folders_insert" ON tm_folders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tm_folders_update" ON tm_folders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "tm_folders_delete" ON tm_folders
  FOR DELETE USING (auth.uid() IS NOT NULL);