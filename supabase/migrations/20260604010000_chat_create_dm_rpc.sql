-- =====================================================================
-- Catalyst Chat — chat_create_dm RPC (idempotent)
-- Client-side createDM added only the creator: the second member's row
-- violated chat_conversation_members_insert WITH CHECK under a non-admin
-- creator's RLS, and the swallowed error left a half-built DM. This
-- SECURITY DEFINER function creates the DM and adds BOTH members atomically
-- (bypassing per-row RLS), with pair-dedup. Returns the conversation id.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.chat_create_dm(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  existing uuid;
  new_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'invalid dm target';
  END IF;

  -- Dedup: an existing dm where BOTH users are members.
  SELECT c.id INTO existing
    FROM public.chat_conversations c
   WHERE c.kind = 'dm'
     AND EXISTS (SELECT 1 FROM public.chat_conversation_members m
                  WHERE m.conversation_id = c.id AND m.user_id = me)
     AND EXISTS (SELECT 1 FROM public.chat_conversation_members m
                  WHERE m.conversation_id = c.id AND m.user_id = other_user_id)
   LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.chat_conversations (kind, title, created_by)
  VALUES ('dm', NULL, me)
  RETURNING id INTO new_id;

  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role) VALUES
    (new_id, me, 'admin'),
    (new_id, other_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN new_id;
END;
$fn$;

COMMENT ON FUNCTION public.chat_create_dm(uuid)
  IS 'Creates (or returns existing) a 1:1 DM and adds BOTH members atomically. SECURITY DEFINER so the second member is added regardless of the creator''s role.';

GRANT EXECUTE ON FUNCTION public.chat_create_dm(uuid) TO authenticated;
