-- =====================================================================
-- Catalyst Chat — Phase 0 schema
-- Ticket-bound conversations + project channels. NO direct messages (deferred).
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS guards throughout.
-- RLS policies live in the same migration as table creation (CLAUDE.md rule).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) chat_conversations — one row per ticket conversation or project channel
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('ticket','channel')),
  ticket_key      text REFERENCES public.ph_issues(issue_key) ON DELETE CASCADE,
  project_key     text,
  title           text,
  is_archived     boolean NOT NULL DEFAULT false,
  archived_at     timestamptz,
  last_message_at timestamptz,
  created_by      uuid DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_conversations IS 'Catalyst Chat conversations: ticket-bound or project channel. No DMs in Phase 0.';

-- At most one conversation per ticket, and one channel per project.
CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_one_per_ticket
  ON public.chat_conversations (ticket_key) WHERE kind = 'ticket';
CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_one_per_channel
  ON public.chat_conversations (project_key) WHERE kind = 'channel';

-- Archive sweep / list queries.
CREATE INDEX IF NOT EXISTS chat_conversations_archived_last_msg
  ON public.chat_conversations (is_archived, last_message_at);
-- FK-backing.
CREATE INDEX IF NOT EXISTS chat_conversations_ticket_key_idx
  ON public.chat_conversations (ticket_key);

-- ---------------------------------------------------------------------
-- 2) chat_conversation_members — membership + per-user read/mute state
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  role            text NOT NULL DEFAULT 'member',
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  is_muted        boolean NOT NULL DEFAULT false,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE public.chat_conversation_members IS 'Membership rows for chat conversations with read-state and mute flags.';

-- FK-backing + "my conversations" lookups.
CREATE INDEX IF NOT EXISTS chat_conversation_members_user_id_idx
  ON public.chat_conversation_members (user_id);

-- ---------------------------------------------------------------------
-- 3) chat_messages — threaded messages, soft-delete only
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  author_id       uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
  body_text       text NOT NULL,
  body_adf        jsonb,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_messages IS 'Chat messages. Threading via parent_id. deleted_at = soft delete (never hard-deleted by users).';

-- Primary read path: messages in a conversation in time order.
CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx
  ON public.chat_messages (conversation_id, created_at);
-- Thread reply lookups (partial — only threaded replies).
CREATE INDEX IF NOT EXISTS chat_messages_parent_idx
  ON public.chat_messages (parent_id) WHERE parent_id IS NOT NULL;
-- FK-backing for author.
CREATE INDEX IF NOT EXISTS chat_messages_author_idx
  ON public.chat_messages (author_id);
-- Full-text search over message bodies.
CREATE INDEX IF NOT EXISTS chat_messages_body_fts_idx
  ON public.chat_messages USING gin (to_tsvector('english', body_text));

-- ---------------------------------------------------------------------
-- 4) chat_message_reactions — one emoji per (message, user, emoji)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id    uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

COMMENT ON TABLE public.chat_message_reactions IS 'Emoji reactions on chat messages.';

-- FK-backing.
CREATE INDEX IF NOT EXISTS chat_message_reactions_message_idx
  ON public.chat_message_reactions (message_id);
CREATE INDEX IF NOT EXISTS chat_message_reactions_user_idx
  ON public.chat_message_reactions (user_id);

-- ---------------------------------------------------------------------
-- 5) chat_messages_archive — cold storage for archived conversations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages_archive (
  id              uuid PRIMARY KEY,
  conversation_id uuid NOT NULL,
  parent_id       uuid,
  author_id       uuid,
  body_text       text NOT NULL,
  body_adf        jsonb,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz,
  archived_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_messages_archive IS 'Cold storage for messages of archived conversations. Read-only after archive.';

CREATE INDEX IF NOT EXISTS chat_messages_archive_conversation_idx
  ON public.chat_messages_archive (conversation_id);

-- =====================================================================
-- RLS — enable on all tables
-- =====================================================================
ALTER TABLE public.chat_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages_archive     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- chat_conversations policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS chat_conversations_select ON public.chat_conversations;
CREATE POLICY chat_conversations_select ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = chat_conversations.id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_conversations_insert ON public.chat_conversations;
CREATE POLICY chat_conversations_insert ON public.chat_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS chat_conversations_update ON public.chat_conversations;
CREATE POLICY chat_conversations_update ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = chat_conversations.id
        AND m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- chat_conversation_members policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS chat_conversation_members_select ON public.chat_conversation_members;
CREATE POLICY chat_conversation_members_select ON public.chat_conversation_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversation_members me
      WHERE me.conversation_id = chat_conversation_members.conversation_id
        AND me.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_conversation_members_insert ON public.chat_conversation_members;
CREATE POLICY chat_conversation_members_insert ON public.chat_conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ---------------------------------------------------------------------
-- chat_messages policies
-- Author short-circuit on SELECT is MANDATORY to avoid the PostgREST v12
-- INSERT+RETURNING 403 trap (CLAUDE.md 2026-05-29).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = chat_messages.conversation_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = chat_messages.conversation_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_update ON public.chat_messages;
CREATE POLICY chat_messages_update ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS chat_messages_delete ON public.chat_messages;
CREATE POLICY chat_messages_delete ON public.chat_messages
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- ---------------------------------------------------------------------
-- chat_message_reactions policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS chat_message_reactions_select ON public.chat_message_reactions;
CREATE POLICY chat_message_reactions_select ON public.chat_message_reactions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS chat_message_reactions_insert ON public.chat_message_reactions;
CREATE POLICY chat_message_reactions_insert ON public.chat_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_message_reactions_delete ON public.chat_message_reactions;
CREATE POLICY chat_message_reactions_delete ON public.chat_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- chat_messages_archive policies — read-only to authenticated; writes via
-- SECURITY DEFINER archive function / service role only (admin for direct writes).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS chat_messages_archive_select ON public.chat_messages_archive;
CREATE POLICY chat_messages_archive_select ON public.chat_messages_archive
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS chat_messages_archive_write ON public.chat_messages_archive;
CREATE POLICY chat_messages_archive_write ON public.chat_messages_archive
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =====================================================================
-- TRIGGERS / FUNCTIONS
-- =====================================================================

-- Bump conversation.last_message_at when a new message is inserted.
CREATE OR REPLACE FUNCTION public.chat_touch_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.chat_conversations
     SET last_message_at = NEW.created_at,
         updated_at      = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS chat_messages_touch_conversation ON public.chat_messages;
CREATE TRIGGER chat_messages_touch_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_touch_last_message_at();

-- Idle-archive sweep: archive conversations untouched for 21+ days, move their
-- messages to cold storage, then delete the live rows. Read-only after archive.
CREATE OR REPLACE FUNCTION public.chat_archive_idle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  -- Mark idle conversations as archived.
  UPDATE public.chat_conversations
     SET is_archived = true,
         archived_at = now(),
         updated_at  = now()
   WHERE is_archived = false
     AND last_message_at IS NOT NULL
     AND last_message_at < now() - interval '21 days';

  -- Move messages of all archived (and not-yet-copied) conversations to cold storage.
  INSERT INTO public.chat_messages_archive (
    id, conversation_id, parent_id, author_id, body_text, body_adf,
    edited_at, deleted_at, created_at, archived_at
  )
  SELECT m.id, m.conversation_id, m.parent_id, m.author_id, m.body_text, m.body_adf,
         m.edited_at, m.deleted_at, m.created_at, now()
    FROM public.chat_messages m
    JOIN public.chat_conversations c ON c.id = m.conversation_id
   WHERE c.is_archived = true
  ON CONFLICT (id) DO NOTHING;

  -- Remove the live messages for archived conversations.
  DELETE FROM public.chat_messages m
   USING public.chat_conversations c
   WHERE m.conversation_id = c.id
     AND c.is_archived = true;
END;
$fn$;

COMMENT ON FUNCTION public.chat_archive_idle() IS 'Archives conversations idle >21 days, moves messages to chat_messages_archive, deletes live rows.';

-- When a ticket transitions to the "done" status category, immediately archive
-- its linked conversation (and move its messages to cold storage).
CREATE OR REPLACE FUNCTION public.chat_archive_done_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status_category = 'done'
     AND (OLD.status_category IS DISTINCT FROM NEW.status_category) THEN

    UPDATE public.chat_conversations
       SET is_archived = true,
           archived_at = now(),
           updated_at  = now()
     WHERE kind = 'ticket'
       AND ticket_key = NEW.issue_key
       AND is_archived = false;

    INSERT INTO public.chat_messages_archive (
      id, conversation_id, parent_id, author_id, body_text, body_adf,
      edited_at, deleted_at, created_at, archived_at
    )
    SELECT m.id, m.conversation_id, m.parent_id, m.author_id, m.body_text, m.body_adf,
           m.edited_at, m.deleted_at, m.created_at, now()
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
     WHERE c.kind = 'ticket'
       AND c.ticket_key = NEW.issue_key
       AND c.is_archived = true
    ON CONFLICT (id) DO NOTHING;

    DELETE FROM public.chat_messages m
     USING public.chat_conversations c
     WHERE m.conversation_id = c.id
       AND c.kind = 'ticket'
       AND c.ticket_key = NEW.issue_key
       AND c.is_archived = true;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS ph_issues_chat_archive_on_done ON public.ph_issues;
CREATE TRIGGER ph_issues_chat_archive_on_done
  AFTER UPDATE OF status_category ON public.ph_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_archive_done_ticket();

-- =====================================================================
-- pg_cron — weekly idle-archive sweep (Sundays 02:00). pg_cron enabled in this project.
-- =====================================================================
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('chat-archive-weekly')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat-archive-weekly');
    PERFORM cron.schedule(
      'chat-archive-weekly',
      '0 2 * * 0',
      $$ SELECT public.chat_archive_idle(); $$
    );
  END IF;
END;
$cron$;
