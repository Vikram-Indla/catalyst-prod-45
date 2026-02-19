
-- 1. Create security definer function to check project membership
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

-- 2. Create security definer function to check admin role
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

-- 3. Drop old recursive policies on ph_project_members
DROP POLICY IF EXISTS "Members view all project members" ON ph_project_members;
DROP POLICY IF EXISTS "Members view project members" ON ph_project_members;
DROP POLICY IF EXISTS "Admins add members" ON ph_project_members;
DROP POLICY IF EXISTS "Admins remove members" ON ph_project_members;
DROP POLICY IF EXISTS "Admins update member roles" ON ph_project_members;

-- 4. Recreate non-recursive policies on ph_project_members
CREATE POLICY "Members view project members"
  ON ph_project_members FOR SELECT
  USING (public.is_ph_project_member(auth.uid(), project_id));

CREATE POLICY "Admins add members"
  ON ph_project_members FOR INSERT
  WITH CHECK (public.is_ph_project_admin(auth.uid(), project_id));

CREATE POLICY "Admins update member roles"
  ON ph_project_members FOR UPDATE
  USING (public.is_ph_project_admin(auth.uid(), project_id));

CREATE POLICY "Admins remove members"
  ON ph_project_members FOR DELETE
  USING (public.is_ph_project_admin(auth.uid(), project_id));

-- 5. Drop old recursive policy on ph_projects
DROP POLICY IF EXISTS "Users view their projects" ON ph_projects;

-- 6. Recreate non-recursive policy on ph_projects
CREATE POLICY "Users view their projects"
  ON ph_projects FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_ph_project_member(auth.uid(), id));
