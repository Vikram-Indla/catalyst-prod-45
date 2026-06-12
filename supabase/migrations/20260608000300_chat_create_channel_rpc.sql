-- Catalyst Chat — ad-hoc channel creation RPC
--
-- DockDirectory's "New channel" modal needs to create a free-standing
-- (non-project) channel by name. The existing chat_get_or_create_project_channel
-- RPC is keyed to a ph_projects row; this one creates a standalone channel.
--
-- Membership is populated by the existing AFTER INSERT trigger
-- chat_conversations_add_members → chat_add_members_on_create(), which for
-- kind = 'channel' adds the creator (role 'admin') plus every active
-- resource_inventory member. So this function only inserts the row.

CREATE OR REPLACE FUNCTION public.chat_create_channel(p_title text)
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
         ('channel', clean_title, false, me)
    RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.chat_create_channel(text) TO authenticated;
