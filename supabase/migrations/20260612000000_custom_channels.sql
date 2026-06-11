-- Custom user channels: any authenticated user can create up to 5 channels.
-- Separate from kind='channel' (project channels, admin-managed).
--
-- 1. Extend kind CHECK to include 'custom_channel'
ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_kind_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_kind_check
  CHECK (kind IN ('ticket', 'channel', 'dm', 'group_dm', 'custom_channel'));

-- 2. Tighten the base INSERT policy to exclude custom_channel
--    (custom_channel gets its own policy with the 5-limit below).
DROP POLICY IF EXISTS chat_conversations_insert ON public.chat_conversations;
CREATE POLICY chat_conversations_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    kind != 'custom_channel'
    AND (
      created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- 3. INSERT policy for custom_channel: any user, max 5 per user.
DROP POLICY IF EXISTS chat_conversations_insert_custom_channel ON public.chat_conversations;
CREATE POLICY chat_conversations_insert_custom_channel ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'custom_channel'
    AND created_by = auth.uid()
    AND (
      SELECT COUNT(*)
      FROM public.chat_conversations c
      WHERE c.kind = 'custom_channel'
        AND c.created_by = auth.uid()
    ) < 5
  );

-- 4. SELECT: custom_channel conversations are visible to their members.
--    (already covered by the chat_is_member branch of the existing SELECT policy —
--     creator is auto-added as a member by the after-insert trigger)
-- Update the SELECT policy to keep the existing browsable-channel clause working.
DROP POLICY IF EXISTS chat_conversations_select ON public.chat_conversations;
CREATE POLICY chat_conversations_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    kind = 'channel'
    OR public.chat_is_member(id, auth.uid())
  );
