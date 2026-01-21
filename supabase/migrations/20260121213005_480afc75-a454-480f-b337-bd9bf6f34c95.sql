
-- Add INSERT policy for space_features to allow auto-provisioning via trigger
-- The trigger runs as the user who creates the space, so we need to allow them to insert
CREATE POLICY "space_features_insert"
ON public.space_features
FOR INSERT
WITH CHECK (
  -- Allow if user is the creator of the space (for initial provisioning)
  EXISTS (
    SELECT 1 FROM public.spaces
    WHERE spaces.id = space_features.space_id
    AND spaces.created_by = auth.uid()
  )
  OR
  -- Or if user is an administrator of the space
  EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_members.space_id = space_features.space_id
    AND space_members.user_id = auth.uid()
    AND space_members.role = 'administrator'
  )
);

-- Also add INSERT policy for space_permissions which likely has the same issue
CREATE POLICY "space_permissions_insert"
ON public.space_permissions
FOR INSERT
WITH CHECK (
  -- Allow if user is the creator of the space (for initial provisioning)
  EXISTS (
    SELECT 1 FROM public.spaces
    WHERE spaces.id = space_permissions.space_id
    AND spaces.created_by = auth.uid()
  )
  OR
  -- Or if user is an administrator of the space
  EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_members.space_id = space_permissions.space_id
    AND space_members.user_id = auth.uid()
    AND space_members.role = 'administrator'
  )
);

-- Also add INSERT policy for space_members so the creator can add themselves
CREATE POLICY "space_members_insert_creator"
ON public.space_members
FOR INSERT
WITH CHECK (
  -- Allow if user is the creator of the space
  EXISTS (
    SELECT 1 FROM public.spaces
    WHERE spaces.id = space_members.space_id
    AND spaces.created_by = auth.uid()
  )
  OR
  -- Allow user to add themselves (for joining public spaces in future)
  user_id = auth.uid()
);

-- Drop the old insert policy if it's too restrictive
DROP POLICY IF EXISTS "space_members_insert" ON public.space_members;
