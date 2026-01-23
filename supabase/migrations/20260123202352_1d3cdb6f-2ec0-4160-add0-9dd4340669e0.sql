-- Create a security definer function to check project membership
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  )
$$;

-- Create a function to check if user is project admin/owner
CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- Drop existing test_folders policies that use project_members directly
DROP POLICY IF EXISTS "Users can view folders in their projects" ON public.test_folders;
DROP POLICY IF EXISTS "Users can create folders in their projects" ON public.test_folders;
DROP POLICY IF EXISTS "Users can update folders in their projects" ON public.test_folders;
DROP POLICY IF EXISTS "Users can delete folders in their projects" ON public.test_folders;

-- Create new policies using the security definer functions
CREATE POLICY "Users can view folders in their projects"
ON public.test_folders
FOR SELECT
USING (
  public.is_project_member(project_id, auth.uid())
  OR EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folders_select' AND tablename = 'test_folders')
);

CREATE POLICY "Users can create folders in their projects"
ON public.test_folders
FOR INSERT
WITH CHECK (
  public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Users can update folders in their projects"
ON public.test_folders
FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.is_project_admin(project_id, auth.uid())
);

CREATE POLICY "Users can delete folders in their projects"
ON public.test_folders
FOR DELETE
USING (
  created_by = auth.uid()
  OR public.is_project_admin(project_id, auth.uid())
);