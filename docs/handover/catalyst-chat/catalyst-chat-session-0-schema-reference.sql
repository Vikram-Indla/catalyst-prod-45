-- ================================================================
-- CATALYST CHAT — COMPLETE SCHEMA REFERENCE
-- Run via Supabase MCP in Session 2 (Slice 1.1 + 1.2)
-- ================================================================

-- ── Utility ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ── conversations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             text NOT NULL CHECK (kind IN ('project','channel','dm')),
  is_project_channel boolean NOT NULL DEFAULT false,
  project_id       uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name             text,
  color            text,
  is_archived      boolean NOT NULL DEFAULT false,
  muted_by         uuid[] NOT NULL DEFAULT '{}',
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON public.conversations(project_id) WHERE project_id IS NOT NULL;
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── conversation_members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  last_read_message_id  uuid,
  last_read_at          timestamptz,
  sort_order            int4 NOT NULL DEFAULT 0,
  joined_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON public.conversation_members(conversation_id);

-- ── messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id      uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  thread_root_id       uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  author_id            uuid NOT NULL REFERENCES auth.users(id),
  body                 text NOT NULL DEFAULT '',
  body_tsvector        tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED,
  metadata             jsonb DEFAULT '{}',  -- { type: 'system_huddle' | null, is_forwarded: bool, etc }
  edited_at            timestamptz,
  deleted_at           timestamptz,
  reply_count          int4 NOT NULL DEFAULT 0,
  last_reply_at        timestamptz,
  is_also_in_channel   boolean NOT NULL DEFAULT false,
  delivery_status      text DEFAULT 'sent' CHECK (delivery_status IN ('sending','sent','failed')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_time
  ON public.messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON public.messages(thread_root_id, created_at ASC) WHERE deleted_at IS NULL AND thread_root_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_tsvector ON public.messages USING GIN(body_tsvector);
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- reply_count denormalisation
CREATE OR REPLACE FUNCTION handle_reply_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.thread_root_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = reply_count + 1, last_reply_at = NEW.created_at
    WHERE id = NEW.thread_root_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
     AND NEW.thread_root_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = NEW.thread_root_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_reply_count AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION handle_reply_count();

-- archived conversation guard
CREATE OR REPLACE FUNCTION check_conversation_archived()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT is_archived FROM public.conversations WHERE id = NEW.conversation_id) THEN
    RAISE EXCEPTION 'conversation_archived';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_block_archived_insert BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION check_conversation_archived();

-- ── message_attachments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  filename      text NOT NULL,
  mime_type     text,
  size_bytes    int8,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON public.message_attachments(message_id);

-- ── message_reactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);

-- ── message_pins ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_pins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned_by       uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id)
);

-- ── saved_items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  remind_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_user ON public.saved_items(user_id, created_at DESC);

-- ── activity_items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('mention','thread','reaction','dm')),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id      uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES auth.users(id),
  emoji           text,
  is_read         boolean NOT NULL DEFAULT false,
  is_cleared      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_items(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_cleared ON public.activity_items(user_id, is_cleared, created_at DESC);

-- activity fan-out trigger
CREATE OR REPLACE FUNCTION activity_fan_out()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  mention_pattern text := '@([A-Za-z]+ [A-Za-z]+)';
  mentioned_name  text;
  mentioned_uid   uuid;
  follower        record;
BEGIN
  -- @mentions
  FOR mentioned_name IN SELECT (regexp_matches(NEW.body, mention_pattern, 'g'))[1] LOOP
    SELECT id INTO mentioned_uid FROM auth.users WHERE raw_user_meta_data->>'full_name' = mentioned_name LIMIT 1;
    IF mentioned_uid IS NOT NULL AND mentioned_uid != NEW.author_id THEN
      INSERT INTO public.activity_items(user_id, type, conversation_id, message_id, actor_id)
      VALUES (mentioned_uid, 'mention', NEW.conversation_id, NEW.id, NEW.author_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  -- thread reply → notify followers (all prior participants in thread)
  IF NEW.thread_root_id IS NOT NULL THEN
    FOR follower IN
      SELECT DISTINCT author_id AS uid FROM public.messages
      WHERE (id = NEW.thread_root_id OR thread_root_id = NEW.thread_root_id)
        AND author_id != NEW.author_id AND deleted_at IS NULL
    LOOP
      INSERT INTO public.activity_items(user_id, type, conversation_id, message_id, actor_id)
      VALUES (follower.uid, 'thread', NEW.conversation_id, NEW.thread_root_id, NEW.author_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  -- DM
  IF (SELECT kind FROM public.conversations WHERE id = NEW.conversation_id) = 'dm' THEN
    INSERT INTO public.activity_items(user_id, type, conversation_id, message_id, actor_id)
    SELECT cm.user_id, 'dm', NEW.conversation_id, NEW.id, NEW.author_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id AND cm.user_id != NEW.author_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_activity_fan_out AFTER INSERT ON public.messages
  FOR EACH ROW WHEN (NEW.deleted_at IS NULL) EXECUTE FUNCTION activity_fan_out();

-- ── message_drafts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  thread_root_id  uuid,
  body            text NOT NULL DEFAULT '',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, conversation_id, COALESCE(thread_root_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
CREATE INDEX IF NOT EXISTS idx_drafts_user_conv ON public.message_drafts(user_id, conversation_id);
CREATE TRIGGER trg_drafts_updated_at BEFORE UPDATE ON public.message_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── search function ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_messages(
  p_conv_id uuid, p_query text, p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid, body text, author_id uuid, created_at timestamptz,
  thread_root_id uuid, rank real
)
SECURITY DEFINER
LANGUAGE sql AS $$
  SELECT id, body, author_id, created_at, thread_root_id,
    ts_rank(body_tsvector, plainto_tsquery('english', p_query)) AS rank
  FROM public.messages
  WHERE conversation_id = p_conv_id
    AND deleted_at IS NULL
    AND body_tsvector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit;
$$;

-- ── project provisioning functions ───────────────────────────────
CREATE OR REPLACE FUNCTION create_project_conversation(
  p_project_id uuid, p_name text, p_created_by uuid
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_conv_id uuid;
BEGIN
  INSERT INTO public.conversations(kind, is_project_channel, project_id, name, created_by)
  VALUES ('project', true, p_project_id, p_name, p_created_by)
  RETURNING id INTO v_conv_id;
  RETURN v_conv_id;
END; $$;

CREATE OR REPLACE FUNCTION sync_project_members(p_project_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_conv_id uuid;
BEGIN
  SELECT id INTO v_conv_id FROM public.conversations
  WHERE project_id = p_project_id AND is_project_channel = true LIMIT 1;
  IF v_conv_id IS NULL THEN RETURN; END IF;
  -- add missing members
  INSERT INTO public.conversation_members(conversation_id, user_id)
  SELECT v_conv_id, pm.user_id FROM public.project_members pm
  WHERE pm.project_id = p_project_id
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = v_conv_id AND cm.user_id = pm.user_id)
  ON CONFLICT DO NOTHING;
  -- Note: do not remove members on project removal (preserve read history)
END; $$;

-- ================================================================
-- RLS POLICIES
-- Enable RLS on every table before adding policies
-- ================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;

-- conversations
CREATE POLICY conv_select ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY conv_insert ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY conv_update ON public.conversations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid() AND role = 'admin')
    OR created_by = auth.uid());

-- conversation_members
CREATE POLICY cm_select ON public.conversation_members FOR SELECT
  USING (user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.conversation_members cm2 WHERE cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid()));
CREATE POLICY cm_insert ON public.conversation_members FOR INSERT
  WITH CHECK (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.conversation_members cm2 WHERE cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid() AND cm2.role = 'admin'));
CREATE POLICY cm_update ON public.conversation_members FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY cm_delete ON public.conversation_members FOR DELETE
  USING (user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.conversation_members cm2 WHERE cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid() AND cm2.role = 'admin'));

-- messages
CREATE POLICY msg_select ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY msg_insert ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()) AND
    NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND is_archived = true));
CREATE POLICY msg_update ON public.messages FOR UPDATE
  USING (author_id = auth.uid() AND deleted_at IS NULL);
CREATE POLICY msg_delete ON public.messages FOR UPDATE  -- soft delete only
  USING (author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND role = 'admin'));

-- attachments (membership of parent conversation)
CREATE POLICY att_select ON public.message_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m JOIN public.conversation_members cm
    ON cm.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cm.user_id = auth.uid()));
CREATE POLICY att_insert ON public.message_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.messages WHERE id = message_id AND author_id = auth.uid()));

-- reactions
CREATE POLICY rx_select ON public.message_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m JOIN public.conversation_members cm
    ON cm.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cm.user_id = auth.uid()));
CREATE POLICY rx_insert ON public.message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY rx_delete ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- pins
CREATE POLICY pin_select ON public.message_pins FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m JOIN public.conversation_members cm
    ON cm.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cm.user_id = auth.uid()));
CREATE POLICY pin_insert ON public.message_pins FOR INSERT
  WITH CHECK (pinned_by = auth.uid());
CREATE POLICY pin_delete ON public.message_pins FOR DELETE
  USING (pinned_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = conversation_id AND user_id = auth.uid() AND role = 'admin'));

-- saved_items, activity_items, message_drafts — scoped to auth.uid()
CREATE POLICY si_all ON public.saved_items USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY act_all ON public.activity_items USING (user_id = auth.uid());
CREATE POLICY draft_all ON public.message_drafts USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ================================================================
-- Supabase Storage bucket
-- Run via Supabase Storage API or MCP
-- ================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false);
-- CREATE POLICY storage_read ON storage.objects FOR SELECT
--   USING (bucket_id = 'chat-attachments' AND
--     EXISTS (SELECT 1 FROM public.conversation_members
--       WHERE conversation_id = (storage.foldername(name))[1]::uuid AND user_id = auth.uid()));
-- CREATE POLICY storage_insert ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[2]);
