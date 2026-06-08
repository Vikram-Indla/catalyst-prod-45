-- =====================================================================
-- Catalyst Chat P2-A — Pin (channel-scoped) + Bookmark (per-user)
-- =====================================================================
-- chat_pinned_messages: shared per conversation, visible to members
-- chat_bookmarks:       personal "save for later", only the author sees
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.chat_pinned_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id      uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  pinned_by       uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
  pinned_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, message_id)
);

CREATE INDEX IF NOT EXISTS chat_pinned_conv_idx
  ON public.chat_pinned_messages (conversation_id, pinned_at DESC);

ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_pinned_select ON public.chat_pinned_messages;
CREATE POLICY chat_pinned_select ON public.chat_pinned_messages
  FOR SELECT TO authenticated
  USING (public.chat_is_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS chat_pinned_insert ON public.chat_pinned_messages;
CREATE POLICY chat_pinned_insert ON public.chat_pinned_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    pinned_by = auth.uid()
    AND public.chat_is_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS chat_pinned_delete ON public.chat_pinned_messages;
CREATE POLICY chat_pinned_delete ON public.chat_pinned_messages
  FOR DELETE TO authenticated
  USING (
    pinned_by = auth.uid()
    OR public.chat_is_member(conversation_id, auth.uid())
  );

-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_bookmarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id      uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS chat_bookmarks_user_idx
  ON public.chat_bookmarks (user_id, created_at DESC);

ALTER TABLE public.chat_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_bookmarks_select ON public.chat_bookmarks;
CREATE POLICY chat_bookmarks_select ON public.chat_bookmarks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS chat_bookmarks_insert ON public.chat_bookmarks;
CREATE POLICY chat_bookmarks_insert ON public.chat_bookmarks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_bookmarks_update ON public.chat_bookmarks;
CREATE POLICY chat_bookmarks_update ON public.chat_bookmarks
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS chat_bookmarks_delete ON public.chat_bookmarks;
CREATE POLICY chat_bookmarks_delete ON public.chat_bookmarks
  FOR DELETE TO authenticated USING (user_id = auth.uid());
