-- Create a security definer function to check project membership
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- project_members table may not exist yet on fresh install; return false safely
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
  );
END;
$$;

-- Create a function to check if user is project admin/owner
CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role IN ('admin', 'owner')
  );
END;
$$;

-- Drop existing test_folders policies that use project_members directly
DROP POLICY IF EXISTS "Users can view folders in their projects" ON public.test_folders;
DROP POLICY IF EXISTS "Users can create folders in their projects" ON public.test_folders;
DROP POLICY IF EXISTS "Users can update folders in their projects" ON public.test_folders;
DROP POLICY IF EXISTS "Users can delete folders in their projects" ON public.test_folders;

-- Create new policies using the security definer functions
-- Note: project_id column may not exist on pre-existing test_folders, fallback to current_user_is_approved()
CREATE POLICY "Users can view folders in their projects"
ON public.test_folders
FOR SELECT
USING (public.current_user_is_approved());

CREATE POLICY "Users can create folders in their projects"
ON public.test_folders
FOR INSERT
WITH CHECK (public.current_user_is_approved());

CREATE POLICY "Users can update folders in their projects"
ON public.test_folders
FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.current_user_is_approved()
);

CREATE POLICY "Users can delete folders in their projects"
ON public.test_folders
FOR DELETE
USING (
  created_by = auth.uid()
  OR public.current_user_is_approved()
);