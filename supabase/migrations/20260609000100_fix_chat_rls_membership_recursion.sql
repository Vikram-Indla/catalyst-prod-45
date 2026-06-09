-- Fix chat_conversation_members SELECT policy infinite recursion
-- CLAUDE.md 2026-06-03: use SECURITY DEFINER helper to break RLS cycle

DROP FUNCTION IF EXISTS public.chat_is_member(uuid, uuid) CASCADE;

CREATE FUNCTION public.chat_is_member(convo_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_members m
    WHERE m.conversation_id = convo_id AND m.user_id = user_id
  );
$$;

-- Drop the broken policy
DROP POLICY IF EXISTS chat_conversation_members_select ON public.chat_conversation_members;

-- Create new policy using the SECURITY DEFINER function (avoids recursion)
CREATE POLICY chat_conversation_members_select ON public.chat_conversation_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.chat_is_member(conversation_id, auth.uid())
  );
