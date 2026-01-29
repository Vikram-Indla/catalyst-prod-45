-- Fix INSERT policy for workstream_members to allow leads and program managers to add members
-- Currently only admins can add, but leads/program managers should also be able to add members to their workstreams

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Workstream members can be added by admins" ON public.workstream_members;

-- Create a more permissive INSERT policy that allows:
-- 1. Admins and super_admins (via can_access_all_workstreams)
-- 2. Program managers (via user_product_roles)
-- 3. Workstream leads (members with role='lead' for that workstream)
CREATE POLICY "Workstream members can be added by authorized users"
ON public.workstream_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins/super_admins can always add
  can_access_all_workstreams(auth.uid())
  OR
  -- Program managers can add
  EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code = 'program_manager'
  )
  OR
  -- Leads of the workstream can add members
  EXISTS (
    SELECT 1 FROM public.workstream_members wm
    WHERE wm.workstream_id = workstream_members.workstream_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'lead'
  )
);

-- Also update UPDATE policy to allow authorized users to update members (for role changes etc.)
DROP POLICY IF EXISTS "Workstream members can be updated by authorized users" ON public.workstream_members;

CREATE POLICY "Workstream members can be updated by authorized users"
ON public.workstream_members
FOR UPDATE
TO authenticated
USING (
  can_access_all_workstreams(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code = 'program_manager'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.workstream_members wm
    WHERE wm.workstream_id = workstream_members.workstream_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'lead'
  )
)
WITH CHECK (
  can_access_all_workstreams(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = auth.uid() AND pr.code = 'program_manager'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.workstream_members wm
    WHERE wm.workstream_id = workstream_members.workstream_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'lead'
  )
);