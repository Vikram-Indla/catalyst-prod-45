-- =====================================================================
-- Catalyst Chat Phase 1 — RPCs
-- =====================================================================
-- All RPCs SECURITY DEFINER with search_path locked. Membership checks
-- route through public.chat_is_member to avoid RLS recursion (CLAUDE.md
-- 2026-06-03). Author short-circuit on SELECT remains in place from the
-- 2026-05-29 lesson.
-- =====================================================================

-- ---------------------------------------------------------------------
-- R1. chat_get_or_create_dm(target_user_id)
--     Resolves the 1:1 DM between auth.uid() and target. Idempotent.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_get_or_create_dm(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  pair_hash text;
  conv_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null — must be authenticated';
  END IF;
  IF target_user_id IS NULL OR target_user_id = me THEN
    RAISE EXCEPTION 'invalid target_user_id';
  END IF;

  pair_hash := public.chat_compute_pair_hash(ARRAY[me, target_user_id]);

  SELECT id INTO conv_id
    FROM public.chat_conversations
   WHERE kind = 'dm' AND dm_pair_hash = pair_hash
   LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO public.chat_conversations (kind, dm_pair_hash, is_private, created_by)
       VALUES ('dm', pair_hash, true, me)
    RETURNING id INTO conv_id;

  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
       VALUES (conv_id, me, 'member'),
              (conv_id, target_user_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R2. chat_get_or_create_group_dm(user_ids[])
--     Resolves a group DM (≥3 participants including caller). Idempotent.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_get_or_create_group_dm(p_user_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  members uuid[];
  pair_hash text;
  conv_id uuid;
  u uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  -- Caller always part of the set; dedupe.
  members := ARRAY(SELECT DISTINCT unnest(p_user_ids || ARRAY[me]));
  IF array_length(members, 1) < 3 THEN
    RAISE EXCEPTION 'group DM requires at least 3 distinct users';
  END IF;
  IF array_length(members, 1) > 8 THEN
    RAISE EXCEPTION 'group DM capped at 8 members';
  END IF;

  pair_hash := public.chat_compute_pair_hash(members);

  SELECT id INTO conv_id
    FROM public.chat_conversations
   WHERE kind = 'group_dm' AND dm_pair_hash = pair_hash
   LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO public.chat_conversations (kind, dm_pair_hash, is_private, created_by)
       VALUES ('group_dm', pair_hash, true, me)
    RETURNING id INTO conv_id;

  FOREACH u IN ARRAY members LOOP
    INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
         VALUES (conv_id, u, CASE WHEN u = me THEN 'admin' ELSE 'member' END)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN conv_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R3. chat_get_or_create_project_channel(project_key)
--     Restricted to ph_project_members (Q2 decision). Idempotent.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_get_or_create_project_channel(p_project_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  proj_id uuid;
  proj_name text;
  conv_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF p_project_key IS NULL OR length(p_project_key) = 0 THEN
    RAISE EXCEPTION 'project_key required';
  END IF;

  SELECT id, name INTO proj_id, proj_name
    FROM public.ph_projects
   WHERE key = p_project_key;

  IF proj_id IS NULL THEN
    RAISE EXCEPTION 'project % not found', p_project_key;
  END IF;

  SELECT id INTO conv_id
    FROM public.chat_conversations
   WHERE kind = 'channel' AND project_key = p_project_key
   LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.chat_conversations
           (kind, project_key, title, is_private, created_by)
         VALUES
           ('channel', p_project_key, proj_name, true, me)
      RETURNING id INTO conv_id;
  END IF;

  -- Reconcile members from ph_project_members.
  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
       SELECT conv_id, pm.user_id, 'member'
         FROM public.ph_project_members pm
        WHERE pm.project_id = proj_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R4. chat_get_or_create_ticket_thread(issue_key)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_get_or_create_ticket_thread(p_issue_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  conv_id uuid;
  issue_summary text;
  issue_proj_key text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF p_issue_key IS NULL THEN
    RAISE EXCEPTION 'issue_key required';
  END IF;

  SELECT summary, project_key INTO issue_summary, issue_proj_key
    FROM public.ph_issues
   WHERE issue_key = p_issue_key;

  IF issue_summary IS NULL THEN
    RAISE EXCEPTION 'ticket % not found', p_issue_key;
  END IF;

  SELECT id INTO conv_id
    FROM public.chat_conversations
   WHERE kind = 'ticket' AND ticket_key = p_issue_key
   LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.chat_conversations
           (kind, ticket_key, project_key, title, is_private, created_by)
         VALUES
           ('ticket', p_issue_key, issue_proj_key,
            p_issue_key || ' · ' || issue_summary, true, me)
      RETURNING id INTO conv_id;
    -- chat_add_members_on_create trigger handles assignee+reporter auto-join.
  END IF;

  -- Always ensure caller is a member (anyone with access to the ticket can join).
  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
       VALUES (conv_id, me, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R5. chat_add_member(conv_id, user_id)
--     Caller must be admin or existing member.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_add_member(p_conv uuid, p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF NOT public.chat_is_member(p_conv, me)
     AND NOT public.has_role(me, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'caller is not a member of this conversation';
  END IF;

  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
       VALUES (p_conv, p_user, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R6. chat_remove_member(conv_id, user_id) — admin or self
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_remove_member(p_conv uuid, p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
  caller_role text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  SELECT role INTO caller_role
    FROM public.chat_conversation_members
   WHERE conversation_id = p_conv AND user_id = me;

  IF p_user = me THEN
    -- self-leave
    DELETE FROM public.chat_conversation_members
     WHERE conversation_id = p_conv AND user_id = me;
    RETURN;
  END IF;

  IF caller_role <> 'admin'
     AND NOT public.has_role(me, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'only admins can remove other members';
  END IF;

  DELETE FROM public.chat_conversation_members
   WHERE conversation_id = p_conv AND user_id = p_user;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R7. chat_leave_conversation(conv_id) — convenience over R6
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_leave_conversation(p_conv uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.chat_remove_member(p_conv, auth.uid());
END;
$fn$;

-- ---------------------------------------------------------------------
-- R8. chat_set_mute(conv_id, muted)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_set_mute(p_conv uuid, p_muted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  UPDATE public.chat_conversation_members
     SET is_muted = p_muted
   WHERE conversation_id = p_conv AND user_id = auth.uid();
END;
$fn$;

-- ---------------------------------------------------------------------
-- R9. chat_mark_read(conv_id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_mark_read(p_conv uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  UPDATE public.chat_conversation_members
     SET last_read_at = now()
   WHERE conversation_id = p_conv AND user_id = auth.uid();
END;
$fn$;

-- ---------------------------------------------------------------------
-- R10. chat_archive_now(conv_id) — admin or member
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_archive_now(p_conv uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF NOT public.chat_is_member(p_conv, me)
     AND NOT public.has_role(me, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'caller cannot archive this conversation';
  END IF;

  UPDATE public.chat_conversations
     SET is_archived = true,
         archived_at = now(),
         updated_at  = now()
   WHERE id = p_conv;

  INSERT INTO public.chat_messages_archive (
    id, conversation_id, parent_id, author_id, body_text, body_adf,
    edited_at, deleted_at, created_at, archived_at
  )
  SELECT m.id, m.conversation_id, m.parent_id, m.author_id, m.body_text,
         m.body_adf, m.edited_at, m.deleted_at, m.created_at, now()
    FROM public.chat_messages m
   WHERE m.conversation_id = p_conv
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.chat_messages WHERE conversation_id = p_conv;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R11. chat_unarchive(conv_id) — restores live rows from archive
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_unarchive(p_conv uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;
  IF NOT public.chat_is_member(p_conv, me)
     AND NOT public.has_role(me, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'caller cannot unarchive this conversation';
  END IF;

  INSERT INTO public.chat_messages (
    id, conversation_id, parent_id, author_id, body_text, body_adf,
    edited_at, deleted_at, created_at
  )
  SELECT id, conversation_id, parent_id, author_id, body_text, body_adf,
         edited_at, deleted_at, created_at
    FROM public.chat_messages_archive
   WHERE conversation_id = p_conv
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.chat_messages_archive WHERE conversation_id = p_conv;

  UPDATE public.chat_conversations
     SET is_archived = false,
         archived_at = NULL,
         updated_at  = now()
   WHERE id = p_conv;
END;
$fn$;

-- ---------------------------------------------------------------------
-- R12. chat_search(q, scope, max_results)
--     scope ∈ ('all','messages','channels','people','projects')
--     Returns one row per hit with type discriminator.
--     RLS-filtered: SECURITY DEFINER but uses chat_is_member for messages.
-- ---------------------------------------------------------------------
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

  -- Messages (FTS gated to member-visible conversations)
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

  -- Channels (member-visible only)
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

  -- People (org-wide profile match)
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

  -- Projects (org-wide)
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
END;
$fn$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.chat_get_or_create_dm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_get_or_create_group_dm(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_get_or_create_project_channel(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_get_or_create_ticket_thread(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_add_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_leave_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_set_mute(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_mark_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_archive_now(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_unarchive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_search(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_compute_pair_hash(uuid[]) TO authenticated;
