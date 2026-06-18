-- Add generic navigable 'page' star type to user_starred_items.
--
-- Sidebar nav rows (Capacity Planner, Library, Reports, …) have no specific
-- surface type. They now write user_starred_items via useToggleStar so they
-- surface in the For You "Starred" tab (single source of truth). Without
-- 'page' in the CHECK, those inserts 400.
--
-- Keeps the existing 24 types unchanged; appends 'page' only.
ALTER TABLE public.user_starred_items
  DROP CONSTRAINT IF EXISTS user_starred_items_item_type_check;

ALTER TABLE public.user_starred_items
  ADD CONSTRAINT user_starred_items_item_type_check
  CHECK (item_type = ANY (ARRAY[
    'epic','feature','story','task','incident','defect','ph_issue',
    'business_request','change_request','production_incident','business_gap','idea',
    'project','product',
    'board','backlog','dashboard','filter','roadmap',
    'page',
    'document','theme','objective','dependency','risk'
  ]::text[]));
