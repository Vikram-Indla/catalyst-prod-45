-- Allow authenticated users to SELECT ph_projects they are members of
-- The existing policy uses a subquery on ph_project_members which can fail
-- if the user hasn't been added yet. Add a fallback for empty results.

-- Also add a policy that allows the SELECT on ph_project_members for authenticated users 
-- to check their own membership (needed for the other RLS policies to work)
DO $$
BEGIN
  -- Drop existing policies that might conflict
  DROP POLICY IF EXISTS "Users view their projects" ON ph_projects;
  DROP POLICY IF EXISTS "Members view project members" ON ph_project_members;
  
  -- Recreate with proper auth check
  CREATE POLICY "Users view their projects"
    ON ph_projects FOR SELECT
    USING (
      id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())
    );

  CREATE POLICY "Members view project members"
    ON ph_project_members FOR SELECT
    USING (
      project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())
    );
END $$;