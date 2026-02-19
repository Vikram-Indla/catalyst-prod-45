
-- Fix infinite recursion: ph_project_members SELECT policy calls is_ph_project_member
-- which queries ph_project_members, triggering the same SELECT policy again.
-- Solution: ph_project_members SELECT should use a direct auth.uid() check, not the function.

-- Drop existing policies on ph_project_members
DROP POLICY IF EXISTS "Members view project members" ON ph_project_members;

-- Recreate: members can see other members of projects they belong to.
-- We use a subquery but wrap it in a SECURITY DEFINER function to avoid recursion.
-- Actually, simplest fix: allow users to see rows where they are a member of the same project.
-- But we can't subquery ph_project_members from its own policy.
-- Best approach: just let authenticated users see members of projects they belong to,
-- using the security definer function BUT the function must bypass RLS.

-- First, ensure the functions are SECURITY DEFINER (they should be, but let's recreate to be sure)
CREATE OR REPLACE FUNCTION public.is_ph_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ph_project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_ph_project_admin(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ph_project_members
    WHERE user_id = _user_id AND project_id = _project_id AND role = 'admin'
  )
$$;

-- Now recreate the SELECT policy using the security definer function
-- The function bypasses RLS so no recursion
CREATE POLICY "Members view project members"
ON ph_project_members
FOR SELECT
TO authenticated
USING (public.is_ph_project_member(auth.uid(), project_id));

-- Also fix ph_projects UPDATE and DELETE to use security definer functions
DROP POLICY IF EXISTS "Project admins update" ON ph_projects;
DROP POLICY IF EXISTS "Project admins delete" ON ph_projects;

CREATE POLICY "Project admins update"
ON ph_projects
FOR UPDATE
TO authenticated
USING (public.is_ph_project_admin(auth.uid(), id));

CREATE POLICY "Project admins delete"
ON ph_projects
FOR DELETE
TO authenticated
USING (public.is_ph_project_admin(auth.uid(), id));
