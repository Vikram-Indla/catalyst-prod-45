-- =============================================================================
-- Catalyst Chat — manual archive/unarchive a conversation (idempotent)
-- Member-gated RPC so a user can archive (read-only, drops out of the active
-- inbox) or restore a conversation. Auto-archive (ticket-close + weekly cron)
-- is unchanged; this is the manual control.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.chat_set_archived(
  p_conversation_id uuid,
  p_archived boolean
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.chat_is_member(p_conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized: caller is not a member of conversation %', p_conversation_id;
  END IF;
  UPDATE public.chat_conversations
     SET is_archived = p_archived,
         archived_at  = CASE WHEN p_archived THEN now() ELSE NULL END,
         updated_at   = now()
   WHERE id = p_conversation_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.chat_set_archived(uuid, boolean) TO authenticated;
