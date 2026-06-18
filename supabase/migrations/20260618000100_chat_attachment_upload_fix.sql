-- =====================================================================
-- Catalyst Chat — fix attachment uploads in public channels
-- =====================================================================
-- The previous storage.objects INSERT policy required `chat_is_member()`
-- to be true for the uploader. Users who BROWSE public channels (per
-- chat_conversations_select clause `kind = 'channel'`) but have not yet
-- been added to chat_conversation_members were blocked with:
--     new row violates row-level security policy
--
-- This migration:
--   1. Adds a `chat_can_post(convo_id, user_id)` SECURITY DEFINER helper
--      that returns true for explicit members OR for public channels
--      (kind='channel' AND NOT is_private). Matches Slack semantics.
--   2. Re-points the chat_messages INSERT policy and the chat-attachments
--      storage INSERT policy at the new helper.
--   3. Adds a BEFORE INSERT trigger on chat_messages that auto-adds the
--      author to chat_conversation_members on first post. This means
--      after the first message the user becomes a real member and all
--      existing reads/realtime/notifications work as expected.
-- =====================================================================

-- 1) Helper: can-post check (member OR public channel)
CREATE OR REPLACE FUNCTION public.chat_can_post(convo_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.chat_is_member(convo_id, uid)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = convo_id
        AND c.kind = 'channel'
        AND COALESCE(c.is_private, false) = false
    );
$$;

GRANT EXECUTE ON FUNCTION public.chat_can_post(uuid, uuid) TO authenticated;

-- 2a) chat_messages INSERT now uses chat_can_post
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.chat_can_post(conversation_id, auth.uid())
  );

-- 2b) Storage objects INSERT for chat-attachments — same broadened check.
DROP POLICY IF EXISTS chat_attachments_storage_insert ON storage.objects;
CREATE POLICY chat_attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.chat_can_post(
      (string_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  );

-- 2c) Storage objects SELECT — anyone who can post (member or public
--     channel viewer) should also be able to read their own uploads.
DROP POLICY IF EXISTS chat_attachments_storage_select ON storage.objects;
CREATE POLICY chat_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.chat_can_post(
      (string_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  );

-- 2d) chat_attachments TABLE INSERT/SELECT — same broadening. Without this
--     the storage file uploads succeed but the metadata row that links the
--     file to the message fails to insert, leaving the message with no
--     visible attachment.
DROP POLICY IF EXISTS chat_attachments_insert ON public.chat_attachments;
CREATE POLICY chat_attachments_insert ON public.chat_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND public.chat_can_post(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS chat_attachments_select ON public.chat_attachments;
CREATE POLICY chat_attachments_select ON public.chat_attachments
  FOR SELECT TO authenticated
  USING (
    uploader_id = auth.uid()
    OR public.chat_can_post(conversation_id, auth.uid())
  );

-- 3) Auto-join trigger: on first post, add the author to
--    chat_conversation_members if they are not already a member.
CREATE OR REPLACE FUNCTION public.chat_autojoin_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
       VALUES (NEW.conversation_id, NEW.author_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_autojoin ON public.chat_messages;
CREATE TRIGGER chat_messages_autojoin
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_autojoin_on_post();
