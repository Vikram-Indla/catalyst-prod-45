-- chat_is_member compared m.user_id = user_id where the unqualified user_id
-- resolved to the COLUMN, not the parameter (always-true self-comparison).
-- Every authenticated user passed the membership check for any conversation
-- that had at least one member. Qualify with the function name.
CREATE OR REPLACE FUNCTION public.chat_is_member(convo_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_members m
    WHERE m.conversation_id = chat_is_member.convo_id
      AND m.user_id = chat_is_member.user_id
  );
$function$;
