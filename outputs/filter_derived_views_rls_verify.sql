-- 2-user RLS isolation test for filter_derived_views
-- Run this AFTER applying 20260612130000_filter_derived_views.sql
-- and BEFORE declaring Step 3 done.
--
-- Pattern (CLAUDE.md 2026-06-03): SET LOCAL ROLE + request.jwt.claims swap
-- to simulate two distinct authenticated users without needing real sessions.
--
-- Expected results:
--   • user_a (owner)     → sees 1 row
--   • user_b (stranger)  → sees 0 rows (private view)
--   • After sharing (visibility='org', shared filter) → user_b sees 1 row
--   • Cleanup removes all seed rows

BEGIN;

-- ── Seed data ────────────────────────────────────────────────────────────────

-- Two synthetic UUIDs that will never collide with real data
\set user_a_id 'a0000000-0000-0000-0000-000000000001'
\set user_b_id 'b0000000-0000-0000-0000-000000000002'
\set filter_id 'f0000000-0000-0000-0000-000000000010'
\set view_id   'e0000000-0000-0000-0000-000000000020'

-- Seed the filter owned by user_a (shared=false so user_b cannot see it)
INSERT INTO public.ph_saved_filters (id, name, user_id, owner_id, is_shared,
  filter_config, page, jql_query, viewers_config, editors_config,
  starred_by_user_ids, subscriber_ids, used_by_board_ids, hub_scope,
  use_count, health_status)
VALUES (:'filter_id', 'Test Filter RLS', :'user_a_id', :'user_a_id', false,
  '{}', 'project', 'project = BAU',
  '{"type":"private"}'::jsonb, '{"type":"owner_only"}'::jsonb,
  '{}', '{}', '{}', 'project', 0, 'healthy')
ON CONFLICT (id) DO NOTHING;

-- Seed the derived view owned by user_a (private)
INSERT INTO public.filter_derived_views
  (id, source_filter_id, type, title, owner_id, shared_default_config, visibility)
VALUES
  (:'view_id', :'filter_id', 'roadmap', 'Test Roadmap',
   :'user_a_id', '{"date_field":"due_date","lane_by":"status"}'::jsonb, 'private')
ON CONFLICT (id) DO NOTHING;

-- ── Assert: user_a (owner) sees 1 row ────────────────────────────────────────

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.filter_derived_views
  WHERE id = 'e0000000-0000-0000-0000-000000000020';
  ASSERT cnt = 1, format('FAIL user_a_sees: expected 1 got %s', cnt);
  RAISE NOTICE 'PASS user_a_sees: owner sees their own private view (cnt=%)', cnt;
END;
$$;

-- ── Assert: user_b (stranger) sees 0 rows ─────────────────────────────────────

SET LOCAL "request.jwt.claims" = '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.filter_derived_views
  WHERE id = 'e0000000-0000-0000-0000-000000000020';
  ASSERT cnt = 0, format('FAIL user_b_blocked: expected 0 got %s', cnt);
  RAISE NOTICE 'PASS user_b_blocked: stranger cannot see private view (cnt=%)', cnt;
END;
$$;

-- ── Assert: after making view org-visible AND filter shared, user_b sees 1 ────

RESET ROLE;  -- use service role to bypass RLS for the update
UPDATE public.filter_derived_views SET visibility = 'org'
  WHERE id = 'e0000000-0000-0000-0000-000000000020';
UPDATE public.ph_saved_filters SET is_shared = true
  WHERE id = 'f0000000-0000-0000-0000-000000000010';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.filter_derived_views
  WHERE id = 'e0000000-0000-0000-0000-000000000020';
  ASSERT cnt = 1, format('FAIL user_b_shared: expected 1 got %s', cnt);
  RAISE NOTICE 'PASS user_b_shared: user_b sees view after filter shared + visibility=org (cnt=%)', cnt;
END;
$$;

-- ── Cleanup ───────────────────────────────────────────────────────────────────

RESET ROLE;
DELETE FROM public.filter_derived_views WHERE id = 'e0000000-0000-0000-0000-000000000020';
DELETE FROM public.ph_saved_filters      WHERE id = 'f0000000-0000-0000-0000-000000000010';

RAISE NOTICE 'Cleanup complete.';

ROLLBACK;  -- full rollback so nothing persists in prod (change to COMMIT for real runs)
