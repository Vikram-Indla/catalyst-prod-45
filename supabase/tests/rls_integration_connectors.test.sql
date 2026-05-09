-- RLS tests for integration_connectors (Block 1, admin Phase C, 2026-05-09)
--
-- Run with: supabase test db
--
-- CURRENT STATE (failing): USING (true) lets any authenticated user
--   read auth_config_json (API secrets) and modify connectors.
-- DESIRED STATE (passing): admin-only via is_user_admin(auth.uid()).
--
-- These tests are RED against the current schema. They turn GREEN after
-- migration 20260509000001_fix_integration_connectors_rls.sql is applied.

BEGIN;
SELECT plan(6);

-- ── helpers ──────────────────────────────────────────────────────────────────

-- Creates a minimal auth.users row and returns its id.
CREATE OR REPLACE FUNCTION tests.make_user(p_email text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (v_id, p_email, 'authenticated', 'authenticated', now(), now(), '{}', '{}')
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END $$;

-- Switches the RLS evaluation context to a specific user.
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

-- Insert a connector row as service role (bypasses RLS).
SELECT tests.as_service();
INSERT INTO public.integration_connectors (id, name, type, endpoint, auth_method, auth_config_json, enabled)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Jira Connector',
  'jira',
  'https://test.atlassian.net',
  'basic',
  '{"token": "super-secret-api-token-12345"}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create a non-admin user (no row in user_roles).
SELECT tests.make_user('rls_test_regular@catalyst.test');

-- ── tests ─────────────────────────────────────────────────────────────────────

-- 1. Non-admin cannot SELECT connectors.
SELECT tests.as_user((SELECT id FROM auth.users WHERE email = 'rls_test_regular@catalyst.test'));

SELECT is_empty(
  $$ SELECT * FROM public.integration_connectors $$,
  'non-admin user cannot SELECT integration_connectors'
);

-- 2. auth_config_json is not reachable even by column projection.
SELECT is_empty(
  $$ SELECT auth_config_json FROM public.integration_connectors $$,
  'non-admin user cannot read auth_config_json'
);

-- 3. Non-admin cannot INSERT a connector.
SELECT throws_ok(
  $$ INSERT INTO public.integration_connectors (name, type, endpoint, auth_method, auth_config_json, enabled)
     VALUES ('evil', 'jira', 'https://evil.com', 'basic', '{}', true) $$,
  '42501',
  NULL,
  'non-admin user cannot INSERT into integration_connectors'
);

-- 4. Non-admin cannot UPDATE a connector.
SELECT throws_ok(
  $$ UPDATE public.integration_connectors SET enabled = false
     WHERE id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'non-admin user cannot UPDATE integration_connectors'
);

-- 5. Non-admin cannot DELETE a connector.
SELECT throws_ok(
  $$ DELETE FROM public.integration_connectors
     WHERE id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  NULL,
  'non-admin user cannot DELETE from integration_connectors'
);

-- 6. Admin CAN read connectors (service role represents admin for this check).
SELECT tests.as_service();
SELECT isnt_empty(
  $$ SELECT * FROM public.integration_connectors
     WHERE id = '00000000-0000-0000-0000-000000000001' $$,
  'service role (admin bypass) can SELECT integration_connectors'
);

SELECT * FROM finish();
ROLLBACK;
