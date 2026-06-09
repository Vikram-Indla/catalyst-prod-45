-- Migration: chat_get_conversation_threads RPC for ChatRightPane aggregation (Phase A)
-- Purpose: Fetch all parent messages with aggregated reply counts, last-reply timestamps, unread badges
-- RLS: Only conversation members can query threads from their conversation
-- Soft-delete aware: excludes deleted parent messages and replies

CREATE OR REPLACE FUNCTION public.chat_get_conversation_threads(
  conv_uuid uuid,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  parent_id uuid,
  author_id uuid,
  author_name text,
  author_avatar_url text,
  content_snippet text,
  reply_count integer,
  unread_reply_count integer,
  last_reply_at timestamptz,
  last_reply_author_id uuid,
  last_reply_author_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM chat_conversation_members cm
    WHERE cm.conversation_id = conv_uuid
      AND cm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this conversation';
  END IF;

  RETURN QUERY
  SELECT
    pm.id::uuid AS parent_id,
    pm.author_id::uuid,
    u_parent.full_name::text AS author_name,
    u_parent.avatar_url::text AS author_avatar_url,
    SUBSTRING(pm.content, 1, 120)::text AS content_snippet,
    (
      SELECT COUNT(*)::integer FROM chat_messages rm
      WHERE rm.parent_message_id = pm.id
        AND rm.deleted_at IS NULL
    ) AS reply_count,
    (
      SELECT COUNT(*)::integer FROM chat_messages rm
      WHERE rm.parent_message_id = pm.id
        AND rm.deleted_at IS NULL
        AND rm.created_at > COALESCE(
          (SELECT last_read_at FROM chat_conversation_members
           WHERE conversation_id = pm.conversation_id
             AND user_id = auth.uid()),
          pm.created_at
        )
    ) AS unread_reply_count,
    (
      SELECT MAX(rm.created_at) FROM chat_messages rm
      WHERE rm.parent_message_id = pm.id
        AND rm.deleted_at IS NULL
    )::timestamptz AS last_reply_at,
    (
      SELECT author_id FROM chat_messages rm
      WHERE rm.parent_message_id = pm.id
        AND rm.deleted_at IS NULL
      ORDER BY rm.created_at DESC
      LIMIT 1
    )::uuid AS last_reply_author_id,
    (
      SELECT u_reply.full_name FROM chat_messages rm
      INNER JOIN profiles u_reply ON u_reply.id = rm.author_id
      WHERE rm.parent_message_id = pm.id
        AND rm.deleted_at IS NULL
      ORDER BY rm.created_at DESC
      LIMIT 1
    )::text AS last_reply_author_name,
    pm.created_at::timestamptz
  FROM chat_messages pm
  INNER JOIN profiles u_parent ON u_parent.id = pm.author_id
  WHERE pm.conversation_id = conv_uuid
    AND pm.parent_message_id IS NULL
    AND pm.deleted_at IS NULL
  ORDER BY COALESCE(
    (SELECT MAX(rm.created_at) FROM chat_messages rm
     WHERE rm.parent_message_id = pm.id AND rm.deleted_at IS NULL),
    pm.created_at
  ) DESC
  LIMIT limit_count;
END $$;

-- RLS: Function is SECURITY DEFINER so RLS is bypassed inside, but we do membership check above
-- Grant to authenticated users (gated by membership query inside function)
GRANT EXECUTE ON FUNCTION public.chat_get_conversation_threads(uuid, integer) TO authenticated;

-- Soft-delete gate: ensures deleted_at IS NULL is enforced at query time
COMMENT ON FUNCTION public.chat_get_conversation_threads(uuid, integer) IS
  'Fetch all parent messages + thread aggregates (reply count, unread badges, timestamps) for a conversation. '
  'Excludes soft-deleted messages. RLS: membership verified inside function via chat_conversation_members.';
