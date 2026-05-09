-- RLS tests for activity_logs (Block 1, admin Phase C, 2026-05-09)
--
-- Run with: supabase test db
--
-- CURRENT STATE (failing): USING (true) / WITH CHECK (true) lets any
--   authenticated user read all audit logs and insert fabricated entries.
-- DESIRED STATE (passing):
--   SELECT → admin-only (is_user_admin).
--   INSERT → service_role only (no authenticated policy → JS SDK cannot insert).
--   UPDATE / DELETE → nobody.
--
-- These tests are RED against the current schema. They turn GREEN after
-- migration 20260509000001_fix_activity_logs_rls.sql is applied.

BEGIN;
SELECT plan(5);

-- ── helpers (reuse pattern from rls_integration_connectors.test.sql) ──────────

CREATE OR REPLACE FUNCTION tests.make_user(p_email text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (v_id, p_email, 'authenticated', 'authenticated', now(), now(), '{}', '{}')
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION tests.as_user(p_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true);
  SET LOCAL ROLE authenticated;
END $$;

CREATE OR REPLACE FUNCTION tests.as_service()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  RESET ROLE;
END $$;

-- ── seed ─────────────────────────────────────────────────────────────────────

SELECT tests.as_service();

-- Seed a real user id so actor_id FK is satisfied.
SELECT tests.make_user('rls_al_regular@catalyst.test');

INSERT INTO public.activity_logs (id, actor_id, entity_type, entity_id, action, before_json, after_json)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM auth.users WHERE email = 'rls_al_regular@catalyst.test'),
  'issue',
  gen_random_uuid(),
  'update',
  '{"status": "To Do"}'::jsonb,
  '{"status": "In Progress"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ── tests ─────────────────────────────────────────────────────────────────────

-- 1. Non-admin cannot SELECT audit logs.
SELECT tests.as_user((SELECT id FROM auth.users WHERE email = 'rls_al_regular@catalyst.test'));

SELECT is_empty(
  $$ SELECT * FROM public.activity_logs $$,
  'non-admin user cannot SELECT activity_logs'
);

-- 2. Non-admin cannot INSERT a fabricated audit entry.
SELECT throws_ok(
  $$ INSERT INTO public.activity_logs (actor_id, entity_type, entity_id, action)
     VALUES (auth.uid(), 'issue', gen_random_uuid(), 'fabricated') $$,
  '42501',
  NULL,
  'non-admin user cannot INSERT into activity_logs'
);

-- 3. Non-admin cannot UPDATE audit entries (audit trail must be immutable).
SELECT throws_ok(
  $$ UPDATE public.activity_logs SET action = 'tampered'
     WHERE id = '00000000-0000-0000-0000-000000000002' $$,
  '42501',
  NULL,
  'non-admin user cannot UPDATE activity_logs'
);

-- 4. Non-admin cannot DELETE audit entries.
SELECT throws_ok(
  $$ DELETE FROM public.activity_logs
     WHERE id = '00000000-0000-0000-0000-000000000002' $$,
  '42501',
  NULL,
  'non-admin user cannot DELETE from activity_logs'
);

-- 5. Service role CAN read audit logs (edge functions / admin backend).
SELECT tests.as_service();
SELECT isnt_empty(
  $$ SELECT * FROM public.activity_logs
     WHERE id = '00000000-0000-0000-0000-000000000002' $$,
  'service role can SELECT activity_logs'
);

SELECT * FROM finish();
ROLLBACK;
