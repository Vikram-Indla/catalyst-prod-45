-- =============================================================================
-- Catalyst Chat — chat_search type fix (idempotent)
-- ph_projects.name is varchar(200); the RETURNS TABLE declares text columns, so
-- the project branch raised 42804 "structure of query does not match function
-- result type". Cast every projected string column to ::text in all four
-- branches. No behaviour change otherwise.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.chat_search(p_query text)
RETURNS TABLE(result_type text, ref_id text, title text, subtitle text, conversation_id uuid)
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_like text;
BEGIN
  IF p_query IS NULL OR btrim(p_query) = '' THEN RETURN; END IF;
  v_like := '%' || p_query || '%';

  BEGIN
    RETURN QUERY
    SELECT 'message'::text, m.id::text, left(m.body_text, 80)::text, c.title::text, m.conversation_id
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
     WHERE m.deleted_at IS NULL AND m.body_text IS NOT NULL
       AND to_tsvector('english', m.body_text) @@ websearch_to_tsquery('english', p_query)
       AND public.chat_is_member(m.conversation_id, v_uid)
     ORDER BY m.created_at DESC LIMIT 8;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN QUERY
  SELECT 'conversation'::text, c.id::text, c.title::text, c.kind::text, c.id
    FROM public.chat_conversations c
   WHERE c.title ILIKE v_like AND public.chat_is_member(c.id, v_uid)
   ORDER BY c.last_message_at DESC NULLS LAST LIMIT 8;

  RETURN QUERY
  SELECT 'person'::text, p.id::text, p.full_name::text, COALESCE(p.role, p.email)::text, NULL::uuid
    FROM public.profiles p
    JOIN public.resource_inventory ri ON ri.profile_id = p.id AND ri.is_active = true
   WHERE p.full_name ILIKE v_like ORDER BY p.full_name LIMIT 8;

  RETURN QUERY
  SELECT 'project'::text, pr.key::text, pr.name::text, pr.key::text, NULL::uuid
    FROM public.ph_projects pr
   WHERE pr.key ILIKE v_like OR pr.name ILIKE v_like ORDER BY pr.key LIMIT 8;
END;
$$;
GRANT EXECUTE ON FUNCTION public.chat_search(text) TO authenticated;
