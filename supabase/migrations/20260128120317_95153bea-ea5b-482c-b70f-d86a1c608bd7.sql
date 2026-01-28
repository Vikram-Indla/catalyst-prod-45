-- ============================================================
-- WORKSTREAM ACCESS CONTROL MIGRATION
-- Restricts task access to workstream members only
-- Management and super_admin roles bypass restrictions
-- ============================================================

-- 1. Add user_id column to workstream_members to link auth users
ALTER TABLE public.workstream_members 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workstream_members_user ON public.workstream_members(user_id);

-- 2. Security definer function to check if user can access all workstreams
-- Returns true for super_admin product role or admin user role
CREATE OR REPLACE FUNCTION public.can_access_all_workstreams(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check for admin role in user_roles
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR EXISTS (
    -- Check for super_admin in user_product_roles
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = _user_id AND pr.code = 'super_admin'
  )
$$;

-- 3. Security definer function to check if user is a member of a workstream
CREATE OR REPLACE FUNCTION public.is_workstream_member(_user_id uuid, _workstream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workstream_members
    WHERE workstream_id = _workstream_id
    AND user_id = _user_id
  )
$$;

-- 4. Security definer function to get accessible workstream IDs for a user
CREATE OR REPLACE FUNCTION public.get_accessible_workstreams(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- If user can access all, return all workstream IDs
  SELECT id FROM public.planner_workstreams
  WHERE public.can_access_all_workstreams(_user_id)
  UNION
  -- Otherwise return only workstreams they are members of
  SELECT workstream_id FROM public.workstream_members
  WHERE user_id = _user_id
$$;

-- 5. Drop existing permissive policies on planner_tasks
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON public.planner_tasks;
DROP POLICY IF EXISTS "Tasks can be created by authenticated users" ON public.planner_tasks;
DROP POLICY IF EXISTS "Tasks can be updated by authenticated users" ON public.planner_tasks;
DROP POLICY IF EXISTS "Tasks can be deleted by authenticated users" ON public.planner_tasks;

-- 6. Create new RLS policies on planner_tasks with workstream access control
-- SELECT: User can view tasks if:
--   - They can access all workstreams (admin/super_admin), OR
--   - The task has no workstream (null), OR
--   - They are a member of the task's workstream
CREATE POLICY "Tasks viewable by workstream members or admins" 
ON public.planner_tasks FOR SELECT TO authenticated
USING (
  public.can_access_all_workstreams(auth.uid())
  OR workstream_id IS NULL
  OR public.is_workstream_member(auth.uid(), workstream_id)
);

-- INSERT: Same logic for creating tasks
CREATE POLICY "Tasks can be created by workstream members or admins" 
ON public.planner_tasks FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_all_workstreams(auth.uid())
  OR workstream_id IS NULL
  OR public.is_workstream_member(auth.uid(), workstream_id)
);

-- UPDATE: Same logic for updating tasks
CREATE POLICY "Tasks can be updated by workstream members or admins" 
ON public.planner_tasks FOR UPDATE TO authenticated
USING (
  public.can_access_all_workstreams(auth.uid())
  OR workstream_id IS NULL
  OR public.is_workstream_member(auth.uid(), workstream_id)
);

-- DELETE: Same logic for deleting tasks
CREATE POLICY "Tasks can be deleted by workstream members or admins" 
ON public.planner_tasks FOR DELETE TO authenticated
USING (
  public.can_access_all_workstreams(auth.uid())
  OR workstream_id IS NULL
  OR public.is_workstream_member(auth.uid(), workstream_id)
);

-- 7. Update workstream_members RLS policies to also filter by membership
DROP POLICY IF EXISTS "Workstream members are viewable by authenticated users" ON public.workstream_members;
DROP POLICY IF EXISTS "Workstream members can be added by authenticated users" ON public.workstream_members;
DROP POLICY IF EXISTS "Workstream members can be removed by authenticated users" ON public.workstream_members;

-- Members can view their own workstream memberships, admins can see all
CREATE POLICY "Workstream members viewable by members or admins" 
ON public.workstream_members FOR SELECT TO authenticated
USING (
  public.can_access_all_workstreams(auth.uid())
  OR user_id = auth.uid()
  OR public.is_workstream_member(auth.uid(), workstream_id)
);

-- Only admins can add members
CREATE POLICY "Workstream members can be added by admins" 
ON public.workstream_members FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_all_workstreams(auth.uid())
);

-- Only admins can remove members
CREATE POLICY "Workstream members can be removed by admins" 
ON public.workstream_members FOR DELETE TO authenticated
USING (
  public.can_access_all_workstreams(auth.uid())
);

-- 8. Create a view to expose accessible workstreams for current user
CREATE OR REPLACE VIEW public.my_accessible_workstreams AS
SELECT pw.*
FROM public.planner_workstreams pw
WHERE public.can_access_all_workstreams(auth.uid())
   OR EXISTS (
     SELECT 1 FROM public.workstream_members wm
     WHERE wm.workstream_id = pw.id AND wm.user_id = auth.uid()
   );