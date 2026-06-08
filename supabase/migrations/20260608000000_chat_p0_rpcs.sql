-- =============================================================================
-- Catalyst Chat — P0 RPCs + project-channel hardening
-- =============================================================================
-- Idempotent. CREATE OR REPLACE everywhere. EXECUTE granted to authenticated.
--
-- -----------------------------------------------------------------------------
-- PROJECT-ASSIGNMENT SOURCE OF TRUTH (investigated read-only 2026-06-08)
-- -----------------------------------------------------------------------------
-- The "assigned users of a project" must NOT come from the whole org. I probed
-- every candidate table for real per-project linkage:
--
--   * ph_project_members        — 1 row total, 1 distinct project (essentially
--                                 empty; the admin user only). NOT the source.
--                                 (Matches CLAUDE.md 2026-05-11 lesson.)
--   * resource_assignments      — project_id column EXISTS but is populated in
--                                 0 of 16 rows. Dead link. NOT the source.
--   * resource_inventory        — 76 rows; assignment_id resolves to
--                                 resource_assignments, but since
--                                 resource_assignments.project_id is all NULL,
--                                 the chain inventory -> assignment -> project
--                                 returns 0 rows per project. `assignments`
--                                 jsonb column is empty on all rows. NOT usable.
--   * ph_issues                 — assignee_account_id / reporter_account_id join
--                                 to profiles.jira_account_id and group cleanly
--                                 by project_key. BAU resolves to 22 distinct
--                                 assigned profiles. THIS IS THE ONLY TABLE that
--                                 actually maps users to a project today.
--
-- DECISION: the project-assignment source of truth is **public.ph_issues**
-- (assignee_account_id + reporter_account_id) joined to profiles via
-- jira_account_id, grouped by project_key. The channel branch and the
-- going-forward trigger both use this source.
--
-- ph_project_members is kept wired (its existing trigger
-- trg_chat_add_project_member_to_channel stays) for forward-compat, but because
-- it is effectively empty it is NOT the live source — so we ALSO add a trigger
-- on ph_issues so that whenever an issue is assigned/reported in a project,
-- that user is back-filled into the project channel going forward.
-- =============================================================================


-- =============================================================================
-- (1) RPC: chat_add_members — add people to a conversation (ticket/channel/DM)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.chat_add_members(
  p_conversation_id uuid,
  p_user_ids uuid[]
) RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_added integer;
BEGIN
  -- Caller must already be a member of the conversation.
  IF NOT public.chat_is_member(p_conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized: caller is not a member of conversation %', p_conversation_id;
  END IF;

  WITH ins AS (
    INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
    SELECT p_conversation_id, u, 'member'
      FROM unnest(p_user_ids) AS u
     WHERE u IS NOT NULL
    ON CONFLICT (conversation_id, user_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_added FROM ins;

  RETURN v_added;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_add_members(uuid, uuid[]) TO authenticated;


-- =============================================================================
-- (2) RPC: chat_search — global search across messages / conversations /
--     people / projects
-- =============================================================================
CREATE OR REPLACE FUNCTION public.chat_search(p_query text)
RETURNS TABLE(
  result_type text,
  ref_id text,
  title text,
  subtitle text,
  conversation_id uuid
)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_like text;
BEGIN
  IF p_query IS NULL OR btrim(p_query) = '' THEN
    RETURN;  -- empty/whitespace query -> no rows
  END IF;

  v_like := '%' || p_query || '%';

  -- ---- messages (full-text) ----
  -- websearch_to_tsquery tolerates arbitrary user input without raising, but we
  -- wrap defensively so a parse error can never abort the whole RPC.
  BEGIN
    RETURN QUERY
    SELECT 'message'::text,
           m.id::text,
           left(m.body_text, 80),
           c.title,
           m.conversation_id
      FROM public.chat_messages m
      JOIN public.chat_conversations c ON c.id = m.conversation_id
     WHERE m.deleted_at IS NULL
       AND m.body_text IS NOT NULL
       AND to_tsvector('english', m.body_text) @@ websearch_to_tsquery('english', p_query)
       AND public.chat_is_member(m.conversation_id, v_uid)
     ORDER BY m.created_at DESC
     LIMIT 8;
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- bad ts-query -> skip message results, keep the rest
  END;

  -- ---- conversations (title match) ----
  RETURN QUERY
  SELECT 'conversation'::text,
         c.id::text,
         c.title,
         c.kind,
         c.id
    FROM public.chat_conversations c
   WHERE c.title ILIKE v_like
     AND public.chat_is_member(c.id, v_uid)
   ORDER BY c.last_message_at DESC NULLS LAST
   LIMIT 8;

  -- ---- people (active resources only) ----
  RETURN QUERY
  SELECT 'person'::text,
         p.id::text,
         p.full_name,
         COALESCE(p.role, p.email),
         NULL::uuid
    FROM public.profiles p
    JOIN public.resource_inventory ri
      ON ri.profile_id = p.id AND ri.is_active = true
   WHERE p.full_name ILIKE v_like
   ORDER BY p.full_name
   LIMIT 8;

  -- ---- projects (key or name match) ----
  RETURN QUERY
  SELECT 'project'::text,
         pr.key::text,
         pr.name,
         pr.key,
         NULL::uuid
    FROM public.ph_projects pr
   WHERE pr.key ILIKE v_like OR pr.name ILIKE v_like
   ORDER BY pr.key
   LIMIT 8;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_search(text) TO authenticated;


-- =============================================================================
-- (3) Project-channel hardening
-- =============================================================================

-- 3a. Drop the duplicate channel-creation trigger. trg_chat_create_channel_for_project
--     (function chat_create_channel_for_project) is the keeper — it guards
--     created_by against a real profile. trg_chat_create_channel_for_new_project
--     fired the same INSERT a second time.
DROP TRIGGER IF EXISTS trg_chat_create_channel_for_new_project ON public.ph_projects;


-- 3b. Rewrite chat_add_members_on_create so the channel branch seeds ONLY the
--     project's assigned users (from ph_issues assignee/reporter -> profiles),
--     not the entire org. Creator is always added (unchanged). Ticket branch
--     and the exception wrapper are preserved verbatim.
CREATE OR REPLACE FUNCTION public.chat_add_members_on_create()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  BEGIN
    IF NEW.kind = 'ticket' AND NEW.ticket_key IS NOT NULL THEN
      INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
      SELECT NEW.id, p.id, 'member'
        FROM public.ph_issues i
        JOIN public.profiles p
          ON p.jira_account_id IN (i.assignee_account_id, i.reporter_account_id)
       WHERE i.issue_key = NEW.ticket_key
         AND p.jira_account_id IS NOT NULL
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    ELSIF NEW.kind = 'channel' THEN
      -- PROJECT-SCOPED: only users assigned/reporting on issues in this
      -- channel's project_key (source of truth = ph_issues; see header).
      -- Previously this added ALL active resource_inventory members (whole org).
      INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
      SELECT NEW.id, p.id, 'member'
        FROM public.ph_issues i
        JOIN public.profiles p
          ON p.jira_account_id IN (i.assignee_account_id, i.reporter_account_id)
       WHERE i.project_key = NEW.project_key
         AND NEW.project_key IS NOT NULL
         AND p.jira_account_id IS NOT NULL
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;


-- 3c. ph_project_members is effectively empty (1 row) and is NOT the live
--     assignment source, so its existing trigger (chat_add_project_member_to_channel)
--     will rarely fire. Add an equivalent trigger on the REAL source
--     (ph_issues) so that whenever an issue is assigned/reported, the
--     assignee/reporter is back-filled into that project's channel.
CREATE OR REPLACE FUNCTION public.chat_add_issue_user_to_channel()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.project_key IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.chat_conversation_members (conversation_id, user_id, role)
  SELECT c.id, p.id, 'member'
    FROM public.chat_conversations c
    JOIN public.profiles p
      ON p.jira_account_id IN (NEW.assignee_account_id, NEW.reporter_account_id)
   WHERE c.kind = 'channel'
     AND c.project_key = NEW.project_key
     AND p.jira_account_id IS NOT NULL
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_add_issue_user_to_channel ON public.ph_issues;
CREATE TRIGGER trg_chat_add_issue_user_to_channel
  AFTER INSERT OR UPDATE OF assignee_account_id, reporter_account_id ON public.ph_issues
  FOR EACH ROW EXECUTE FUNCTION public.chat_add_issue_user_to_channel();
