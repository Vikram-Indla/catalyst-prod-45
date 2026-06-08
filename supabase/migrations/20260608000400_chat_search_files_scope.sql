-- =====================================================================
-- Catalyst Chat — chat_search 'files' scope (W8)
-- =====================================================================
-- Extends chat_search RPC to include attachment filename matches.
-- 'files' result rows: result_type='file', id=chat_attachments.id,
--   title=filename, subtitle=mime_type, conversation_id=chat_conversations.id.
-- RLS-gated via chat_is_member on the parent conversation.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.chat_search(
  p_query text,
  p_scope text DEFAULT 'all',
  p_max integer DEFAULT 25
)
RETURNS TABLE (
  result_type text,
  id uuid,
  title text,
  subtitle text,
  conversation_id uuid,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  q text;
BEGIN
  IF me IS NULL OR p_query IS NULL OR length(trim(p_query)) = 0 THEN
    RETURN;
  END IF;
  q := trim(p_query);

  IF p_scope IN ('all','messages') THEN
    RETURN QUERY
    SELECT 'message'::text,
           m.id,
           left(m.body_text, 140),
           c.title,
           c.id,
           ts_rank(to_tsvector('english', m.body_text), plainto_tsquery('english', q))::real
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
     WHERE m.deleted_at IS NULL
       AND public.chat_is_member(c.id, me)
       AND to_tsvector('english', m.body_text) @@ plainto_tsquery('english', q)
     ORDER BY ts_rank(to_tsvector('english', m.body_text), plainto_tsquery('english', q)) DESC
     LIMIT p_max;
  END IF;

  IF p_scope IN ('all','channels') THEN
    RETURN QUERY
    SELECT 'channel'::text,
           c.id,
           c.title,
           c.project_key,
           c.id,
           1.0::real
      FROM public.chat_conversations c
     WHERE c.kind = 'channel'
       AND public.chat_is_member(c.id, me)
       AND (c.title ILIKE '%' || q || '%' OR c.project_key ILIKE '%' || q || '%')
     LIMIT p_max;
  END IF;

  IF p_scope IN ('all','people') THEN
    RETURN QUERY
    SELECT 'person'::text,
           p.id,
           p.full_name,
           p.email,
           NULL::uuid,
           1.0::real
      FROM public.profiles p
     WHERE p.full_name ILIKE '%' || q || '%'
        OR p.email ILIKE '%' || q || '%'
     LIMIT p_max;
  END IF;

  IF p_scope IN ('all','projects') THEN
    RETURN QUERY
    SELECT 'project'::text,
           pr.id,
           pr.name::text,
           pr.key::text,
           NULL::uuid,
           1.0::real
      FROM public.ph_projects pr
     WHERE pr.name ILIKE '%' || q || '%' OR pr.key ILIKE '%' || q || '%'
     LIMIT p_max;
  END IF;

  IF p_scope IN ('all','files') THEN
    RETURN QUERY
    SELECT 'file'::text,
           a.id,
           a.filename,
           a.mime_type,
           a.conversation_id,
           1.0::real
      FROM public.chat_attachments a
     WHERE public.chat_is_member(a.conversation_id, me)
       AND a.filename ILIKE '%' || q || '%'
     ORDER BY a.created_at DESC
     LIMIT p_max;
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.chat_search(text, text, integer) TO authenticated;
