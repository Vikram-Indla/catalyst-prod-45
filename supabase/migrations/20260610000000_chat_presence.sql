-- =====================================================================
-- Chat Presence System — online status, typing indicators, last-seen
-- =====================================================================

-- ph_presence: user activity tracking per conversation
-- Replicated via Supabase Realtime broadcasts on insert/update/delete
CREATE TABLE IF NOT EXISTS public.ph_presence (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  last_heartbeat   timestamptz NOT NULL DEFAULT now(),
  typing_until     timestamptz,
  last_message_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

COMMENT ON TABLE public.ph_presence IS
  'Presence tracking: online status (heartbeat-based), typing indicators (3s timeout), last-seen timestamps.';
COMMENT ON COLUMN public.ph_presence.status IS
  'online | offline. Set to online on heartbeat; set to offline if last_heartbeat > 5min old.';
COMMENT ON COLUMN public.ph_presence.typing_until IS
  'Timestamp when typing indicator expires (now() + 3s). NULL = not typing.';
COMMENT ON COLUMN public.ph_presence.last_message_at IS
  'Updated when user sends a message; used for "Last seen Xh ago" display.';

-- Indexes
CREATE INDEX IF NOT EXISTS ph_presence_conversation_idx
  ON public.ph_presence (conversation_id);
CREATE INDEX IF NOT EXISTS ph_presence_user_idx
  ON public.ph_presence (user_id);
CREATE INDEX IF NOT EXISTS ph_presence_heartbeat_idx
  ON public.ph_presence (last_heartbeat)
  WHERE status = 'online';
CREATE INDEX IF NOT EXISTS ph_presence_typing_idx
  ON public.ph_presence (typing_until)
  WHERE typing_until IS NOT NULL;

-- =====================================================================
-- RLS Policies — members can see presence within their conversations
-- =====================================================================
ALTER TABLE public.ph_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view presence" ON public.ph_presence;
CREATE POLICY "Members can view presence" ON public.ph_presence
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = ph_presence.conversation_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own presence" ON public.ph_presence;
CREATE POLICY "Users can insert own presence" ON public.ph_presence
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own presence" ON public.ph_presence;
CREATE POLICY "Users can update own presence" ON public.ph_presence
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own presence" ON public.ph_presence;
CREATE POLICY "Users can delete own presence" ON public.ph_presence
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================================
-- Realtime Replication — enable broadcast on ph_presence
-- =====================================================================
ALTER TABLE public.ph_presence REPLICA IDENTITY FULL;
GRANT SELECT ON TABLE public.ph_presence TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- Helper RPC: ensure_presence — upsert presence row for current user
-- =====================================================================
CREATE OR REPLACE FUNCTION public.ensure_presence(
  conv_uuid uuid,
  heartbeat_interval_seconds integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  user_id uuid,
  status text,
  typing_until timestamptz,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO ph_presence (conversation_id, user_id, status, last_heartbeat)
  VALUES (conv_uuid, auth.uid(), 'online', now())
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET
    status = 'online',
    last_heartbeat = now()
  RETURNING
    ph_presence.id,
    ph_presence.conversation_id,
    ph_presence.user_id,
    ph_presence.status,
    ph_presence.typing_until,
    ph_presence.last_message_at;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_presence(uuid, integer) TO authenticated;

-- =====================================================================
-- Helper RPC: set_typing — broadcast typing indicator
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_typing(
  conv_uuid uuid,
  is_typing boolean
)
RETURNS TABLE (
  id uuid,
  typing_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE ph_presence
  SET typing_until = CASE
    WHEN is_typing THEN now() + interval '3 seconds'
    ELSE NULL
  END
  WHERE conversation_id = conv_uuid
    AND user_id = auth.uid()
  RETURNING ph_presence.id, ph_presence.typing_until;
END $$;

GRANT EXECUTE ON FUNCTION public.set_typing(uuid, boolean) TO authenticated;

-- =====================================================================
-- Helper RPC: record_last_message — update last_message_at on send
-- =====================================================================
CREATE OR REPLACE FUNCTION public.record_last_message(
  conv_uuid uuid
)
RETURNS TABLE (
  id uuid,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE ph_presence
  SET
    last_message_at = now(),
    typing_until = NULL
  WHERE conversation_id = conv_uuid
    AND user_id = auth.uid()
  RETURNING ph_presence.id, ph_presence.last_message_at;
END $$;

GRANT EXECUTE ON FUNCTION public.record_last_message(uuid) TO authenticated;

-- =====================================================================
-- Helper RPC: get_conversation_presence — fetch all presences for UI
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_conversation_presence(conv_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_avatar text,
  status text,
  is_typing boolean,
  last_message_at timestamptz,
  last_seen_text text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM chat_conversation_members m
    WHERE m.conversation_id = conv_uuid AND m.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this conversation';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    u.full_name::text AS user_name,
    u.avatar_url::text AS user_avatar,
    CASE
      WHEN (now() - p.last_heartbeat) > interval '5 minutes' THEN 'offline'
      ELSE p.status
    END AS status,
    p.typing_until IS NOT NULL AND p.typing_until > now() AS is_typing,
    p.last_message_at,
    CASE
      WHEN p.last_message_at IS NULL THEN NULL
      WHEN (now() - p.last_message_at) < interval '1 minute' THEN 'just now'
      WHEN (now() - p.last_message_at) < interval '1 hour' THEN
        to_char((now() - p.last_message_at)::interval, 'MI') || 'm ago'
      WHEN (now() - p.last_message_at) < interval '1 day' THEN
        to_char((now() - p.last_message_at)::interval, 'HH') || 'h ago'
      ELSE
        to_char((now() - p.last_message_at)::interval, 'DD') || 'd ago'
    END AS last_seen_text
  FROM ph_presence p
  INNER JOIN profiles u ON u.id = p.user_id
  WHERE p.conversation_id = conv_uuid
    AND p.user_id != auth.uid()
  ORDER BY u.full_name;
END $$;

GRANT EXECUTE ON FUNCTION public.get_conversation_presence(uuid) TO authenticated;
