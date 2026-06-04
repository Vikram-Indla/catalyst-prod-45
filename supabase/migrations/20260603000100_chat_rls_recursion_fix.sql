-- =====================================================================
-- Catalyst Chat — RLS recursion fix (42P17)
-- The membership-check EXISTS subqueries referenced chat_conversation_members
-- from within policies on that same table (and on chat_messages /
-- chat_conversations), causing infinite recursion on every read. Replace the
-- inline EXISTS with a SECURITY DEFINER helper that checks membership while
-- bypassing RLS (the function owner is not subject to RLS), breaking the cycle.
-- Idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.chat_is_member(conv uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_members m
    WHERE m.conversation_id = conv AND m.user_id = uid
  );
$fn$;

COMMENT ON FUNCTION public.chat_is_member(uuid, uuid) IS 'SECURITY DEFINER membership check used by chat RLS policies to avoid self-referential recursion (42P17).';

-- chat_conversation_members — self-reference was the recursion source.
DROP POLICY IF EXISTS chat_conversation_members_select ON public.chat_conversation_members;
CREATE POLICY chat_conversation_members_select ON public.chat_conversation_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.chat_is_member(conversation_id, auth.uid())
  );

-- chat_conversations
DROP POLICY IF EXISTS chat_conversations_select ON public.chat_conversations;
CREATE POLICY chat_conversations_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.chat_is_member(id, auth.uid())
  );

DROP POLICY IF EXISTS chat_conversations_update ON public.chat_conversations;
CREATE POLICY chat_conversations_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.chat_is_member(id, auth.uid())
  );

-- chat_messages — author short-circuit retained (PostgREST INSERT+RETURNING trap).
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR public.chat_is_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.chat_is_member(conversation_id, auth.uid())
  );
