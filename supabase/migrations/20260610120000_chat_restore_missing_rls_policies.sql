-- Restore RLS policies lost in the membership-recursion fix (2026-06-09).
-- Found 2026-06-10 by live probe: chat_conversations had ONLY an INSERT policy
-- (every read returned null → empty chat UI despite 13 conversations);
-- chat_messages had no SELECT/INSERT (nobody could read or send);
-- chat_conversation_members had no UPDATE (mark-read/mute broken).
-- All membership checks go through the SECURITY DEFINER helper
-- chat_is_member(convo_id, user_id) — never inline (CLAUDE.md 2026-06-03).

-- chat_conversations: members read their conversations; channels are
-- browsable by all authenticated users (Slack public-channel directory).
DROP POLICY IF EXISTS chat_conversations_select ON public.chat_conversations;
CREATE POLICY chat_conversations_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    kind = 'channel'
    OR public.chat_is_member(id, auth.uid())
  );

DROP POLICY IF EXISTS chat_conversations_update ON public.chat_conversations;
CREATE POLICY chat_conversations_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (public.chat_is_member(id, auth.uid()))
  WITH CHECK (public.chat_is_member(id, auth.uid()));

-- chat_messages: members read; authors insert into their conversations.
-- author_id = auth.uid() short-circuit on SELECT (PostgREST INSERT+RETURNING
-- trap, CLAUDE.md 2026-05-29).
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
    author_id = auth.uid()
    AND public.chat_is_member(conversation_id, auth.uid())
  );

-- chat_conversation_members: own-row updates (last_read_at, mute, prefs)
-- and own-row deletes (leave conversation).
DROP POLICY IF EXISTS chat_conversation_members_update ON public.chat_conversation_members;
CREATE POLICY chat_conversation_members_update ON public.chat_conversation_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_conversation_members_delete ON public.chat_conversation_members;
CREATE POLICY chat_conversation_members_delete ON public.chat_conversation_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
