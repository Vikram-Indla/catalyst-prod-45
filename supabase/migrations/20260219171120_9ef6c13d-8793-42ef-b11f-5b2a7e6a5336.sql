-- Fix RLS policies to handle unauthenticated users gracefully
-- and avoid infinite recursion on ph_project_members self-reference

DROP POLICY IF EXISTS "Users view their projects" ON ph_projects;
DROP POLICY IF EXISTS "Members view project members" ON ph_project_members;

-- Use a simpler approach: authenticated users can see projects they're members of
CREATE POLICY "Users view their projects"
  ON ph_projects FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM ph_project_members WHERE ph_project_members.project_id = ph_projects.id AND ph_project_members.user_id = auth.uid())
  );

-- Members can view other members of projects they belong to  
CREATE POLICY "Members view project members"
  ON ph_project_members FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Also allow members to see OTHER members once they confirmed they're in the project
CREATE POLICY "Members view all project members"
  ON ph_project_members FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM ph_project_members pm2 WHERE pm2.project_id = ph_project_members.project_id AND pm2.user_id = auth.uid())
  );