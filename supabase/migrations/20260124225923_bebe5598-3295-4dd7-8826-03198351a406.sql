-- Fix infinite recursion in project_members RLS policies
-- The problem: policies reference project_members from within project_members policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Members can view project members" ON project_members;
DROP POLICY IF EXISTS "Admins can delete members" ON project_members;
DROP POLICY IF EXISTS "Admins can insert members" ON project_members;
DROP POLICY IF EXISTS "Admins can update members" ON project_members;

-- Keep "Admins can manage program members" as it uses has_role() which doesn't self-reference
-- Keep "Users can view program members" as it uses a simple `true` condition

-- Create non-recursive SELECT policy using a security definer function
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id 
    AND user_id = p_user_id 
    AND role = 'admin'
  );
$$;

-- Recreate policies using the security definer functions (avoids recursion)
CREATE POLICY "Members can view project members" 
ON project_members FOR SELECT 
USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Admins can delete members" 
ON project_members FOR DELETE 
USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "Admins can insert members" 
ON project_members FOR INSERT 
WITH CHECK (public.is_project_admin(project_id, auth.uid()) OR added_by = auth.uid());

CREATE POLICY "Admins can update members" 
ON project_members FOR UPDATE 
USING (public.is_project_admin(project_id, auth.uid()));