-- Unify the star model on user_starred_items.
-- Phase 1 of the Starred-hub unification (CLAUDE.md /start session 2026-06-18).
--
-- Context: Catalyst had THREE disconnected star stores (user_starred_items,
-- starred_items rooms table, sidebar surface flags). The For You "Starred" tab
-- read user_starred_items while the sidebar star badge read another source, so
-- the tab showed empty while the sidebar showed a star. We consolidate on
-- user_starred_items as the single source of truth.
--
-- Blocker this fixes: the old CHECK constraint only allowed
--   ['epic','feature','story','task','incident','defect','ph_issue']
-- so starring a filter/board/dashboard/project/product silently failed the
-- INSERT — even though the TS union already claimed project/board were valid.
--
-- 1) Widen item_type CHECK to the full taxonomy (surfaces + work items + containers + knowledge).
-- 2) Add metadata jsonb so navigable surfaces carry { label, subtitle, route, icon }.
--    Work items leave metadata null and resolve via item_id (issue_key).

ALTER TABLE public.user_starred_items
  DROP CONSTRAINT IF EXISTS user_starred_items_item_type_check;

ALTER TABLE public.user_starred_items
  ADD CONSTRAINT user_starred_items_item_type_check
  CHECK (item_type = ANY (ARRAY[
    -- work items
    'epic','feature','story','task','incident','defect','ph_issue',
    'business_request','change_request','production_incident','business_gap','idea',
    -- containers
    'project','product',
    -- surfaces (navigable)
    'board','backlog','dashboard','filter','roadmap',
    -- knowledge
    'document','theme','objective','dependency','risk'
  ]));

ALTER TABLE public.user_starred_items
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.user_starred_items.metadata IS
  'Optional nav payload for non-issue stars: { label, subtitle, route, icon }. Work items leave this null and resolve via item_id (issue_key). Zero-assumption: render nothing when absent, never a typed default.';
