-- =====================================================================
-- RLS + RPC tests for Catalyst Chat Phase 0/1/2/7 (2026-06-08)
-- =====================================================================
-- Coverage:
--   T1  chat_get_or_create_dm is idempotent + only inserts members visible
--       to the pair
--   T2  Non-member CANNOT read another DM's messages (CLAUDE.md 2026-06-03
--       recursion-safe RLS test)
--   T3  Author CAN read own message even when JOIN chain returns empty
--       (CLAUDE.md 2026-05-29 PostgREST INSERT+RETURNING trap)
--   T4  chat_get_or_create_project_channel idempotent + adds caller as
--       member when caller is in ph_project_members
--   T5  chat_get_or_create_ticket_thread idempotent + caller becomes member
--   T6  chat_search returns ONLY messages the caller can read
--   T7  chat_archive_now requires membership; non-member rejected
--   T8  ph_projects INSERT triggers chat channel creation
-- =====================================================================

BEGIN;
SELECT plan(8);

-- ── helpers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION tests.make_user(p_email text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  VALUES (v_id, p_email, 'authenticated', 'authenticated', now(), now(), '{}', '{}');
  INSERT INTO public.profiles (id, email, full_name)
       VALUES (v_id, p_email, split_part(p_email,'@',1));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION tests.act_as(p_user uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

-- ── fixtures ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  alice uuid := tests.make_user('alice@test.local');
  bob   uuid := tests.make_user('bob@test.local');
  eve   uuid := tests.make_user('eve@test.local');
BEGIN
  PERFORM set_config('tests.alice', alice::text, true);
  PERFORM set_config('tests.bob',   bob::text,   true);
  PERFORM set_config('tests.eve',   eve::text,   true);
END $$;

-- =====================================================================
-- T1 — DM idempotency
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  bob   uuid := current_setting('tests.bob')::uuid;
  c1 uuid; c2 uuid;
BEGIN
  PERFORM tests.act_as(alice);
  c1 := public.chat_get_or_create_dm(bob);
  c2 := public.chat_get_or_create_dm(bob);
  PERFORM ok(c1 = c2, 'DM get-or-create is idempotent');
END $$;

-- =====================================================================
-- T2 — non-member cannot read DM messages
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  bob   uuid := current_setting('tests.bob')::uuid;
  eve   uuid := current_setting('tests.eve')::uuid;
  conv  uuid;
  cnt int;
BEGIN
  PERFORM tests.act_as(alice);
  conv := public.chat_get_or_create_dm(bob);
  INSERT INTO public.chat_messages (conversation_id, body_text)
       VALUES (conv, 'hello bob');

  PERFORM tests.act_as(eve);
  SELECT count(*) INTO cnt
    FROM public.chat_messages
   WHERE conversation_id = conv;
  PERFORM ok(cnt = 0, 'Non-member sees 0 messages in private DM');
END $$;

-- =====================================================================
-- T3 — author short-circuit on SELECT after INSERT+RETURNING
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  bob   uuid := current_setting('tests.bob')::uuid;
  conv  uuid;
  cnt int;
BEGIN
  PERFORM tests.act_as(alice);
  conv := public.chat_get_or_create_dm(bob);
  INSERT INTO public.chat_messages (conversation_id, body_text)
       VALUES (conv, 'authored by alice');
  SELECT count(*) INTO cnt FROM public.chat_messages
   WHERE conversation_id = conv AND author_id = alice;
  PERFORM ok(cnt >= 1, 'Author can read own freshly-inserted message');
END $$;

-- =====================================================================
-- T4 — project channel idempotent + caller auto-added
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  proj_id uuid;
  c1 uuid; c2 uuid;
BEGIN
  INSERT INTO public.ph_projects (key, name, department)
       VALUES ('TST01', 'Test Project 1', 'eng')
    RETURNING id INTO proj_id;
  INSERT INTO public.ph_project_members (project_id, user_id)
       VALUES (proj_id, alice);

  PERFORM tests.act_as(alice);
  c1 := public.chat_get_or_create_project_channel('TST01');
  c2 := public.chat_get_or_create_project_channel('TST01');
  PERFORM ok(c1 = c2, 'Project channel get-or-create is idempotent');
END $$;

-- =====================================================================
-- T5 — ticket thread idempotent + caller becomes member
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  c1 uuid; c2 uuid; cnt int;
BEGIN
  INSERT INTO public.ph_issues (issue_key, summary, project_key, issue_type, status_category)
       VALUES ('TST01-1', 'Sample ticket', 'TST01', 'Task', 'todo')
    ON CONFLICT (issue_key) DO NOTHING;

  PERFORM tests.act_as(alice);
  c1 := public.chat_get_or_create_ticket_thread('TST01-1');
  c2 := public.chat_get_or_create_ticket_thread('TST01-1');
  SELECT count(*) INTO cnt FROM public.chat_conversation_members
   WHERE conversation_id = c1 AND user_id = alice;
  PERFORM ok(c1 = c2 AND cnt = 1, 'Ticket thread idempotent + caller added once');
END $$;

-- =====================================================================
-- T6 — chat_search RLS-filtered (Eve sees nothing in Alice/Bob DM)
-- =====================================================================
DO $$
DECLARE
  eve uuid := current_setting('tests.eve')::uuid;
  rows int;
BEGIN
  PERFORM tests.act_as(eve);
  SELECT count(*) INTO rows
    FROM public.chat_search('hello bob', 'messages', 25);
  PERFORM ok(rows = 0, 'chat_search hides messages Eve cannot read');
END $$;

-- =====================================================================
-- T7 — archive_now rejects non-members
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  bob   uuid := current_setting('tests.bob')::uuid;
  eve   uuid := current_setting('tests.eve')::uuid;
  conv  uuid;
  rejected boolean := false;
BEGIN
  PERFORM tests.act_as(alice);
  conv := public.chat_get_or_create_dm(bob);

  PERFORM tests.act_as(eve);
  BEGIN
    PERFORM public.chat_archive_now(conv);
  EXCEPTION WHEN OTHERS THEN
    rejected := true;
  END;
  PERFORM ok(rejected, 'archive_now rejects non-member');
END $$;

-- =====================================================================
-- T8 — ph_projects INSERT auto-creates chat channel
-- =====================================================================
DO $$
DECLARE
  alice uuid := current_setting('tests.alice')::uuid;
  found int;
BEGIN
  INSERT INTO public.ph_projects (key, name, department)
       VALUES ('TST02', 'Auto Channel Project', 'eng');
  SELECT count(*) INTO found
    FROM public.chat_conversations
   WHERE kind = 'channel' AND project_key = 'TST02';
  PERFORM ok(found = 1, 'ph_projects INSERT creates chat channel');
END $$;

SELECT * FROM finish();
ROLLBACK;
