-- =====================================================================
-- Catalyst Chat — extend chat_create_channel with visibility
-- =====================================================================
-- The chat-v2 Create Channel modal (Slack-style) lets the user pick
-- public vs private at creation time. The existing RPC accepts only a
-- title and always inserts is_private = false. We extend the signature
-- to accept an optional p_private boolean (default false, preserving
-- existing chat-v1 callers).
-- =====================================================================

DROP FUNCTION IF EXISTS public.chat_create_channel(text);

CREATE OR REPLACE FUNCTION public.chat_create_channel(
  p_title   text,
  p_private boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  conv_id uuid;
  clean_title text := btrim(coalesce(p_title, ''));
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF length(clean_title) = 0 THEN
    RAISE EXCEPTION 'channel title required';
  END IF;

  INSERT INTO public.chat_conversations
         (kind, title, is_private, created_by)
       VALUES
         ('channel', clean_title, coalesce(p_private, false), me)
    RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.chat_create_channel(text, boolean) TO authenticated;
