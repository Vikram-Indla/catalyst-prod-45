
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "space_members_select_same_space" ON public.space_members;

-- Create a security definer function to check space membership without recursion
CREATE OR REPLACE FUNCTION public.is_space_member(_user_id uuid, _space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE user_id = _user_id
      AND space_id = _space_id
  )
$$;

-- Create a function to get all space IDs a user is a member of
CREATE OR REPLACE FUNCTION public.get_user_space_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT space_id
  FROM public.space_members
  WHERE user_id = _user_id
$$;

-- Update the space_members SELECT policy to allow viewing members of spaces you belong to
-- Using the security definer function to avoid recursion
CREATE POLICY "space_members_select_same_space_v2"
ON public.space_members
FOR SELECT
USING (
  space_id IN (SELECT public.get_user_space_ids(auth.uid()))
);
