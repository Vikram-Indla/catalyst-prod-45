-- Board access follows source-filter visibility (Filters→Kanban vertical, point 5).
--
-- A board created from a saved filter must be visible to exactly the users who
-- can see that filter: "to give someone the Kanban, add them to the filter."
-- We layer ONE new clause onto can_view_board via a SECURITY DEFINER helper so
-- the check cannot recurse into RLS, and we qualify the helper's parameters
-- (p_*) so they can never shadow a column.
--   • CLAUDE.md 2026-06-03 — membership checks must route through SECURITY DEFINER.
--   • CLAUDE.md 2026-06-10 — never write `col = param`; qualify params (p_uid).
--
-- All six existing can_view_board clauses are preserved unchanged; this only ADDS
-- visibility, it never removes any. board_columns / board_status_mappings already
-- gate on board_not_deleted / open SELECT, so the board row (boards_select →
-- can_view_board) is the single access gate that needs the filter clause.

-- 1. Helper: can this user see this saved filter? Mirrors the ph_saved_filters
--    SELECT policy exactly (own ∪ shared ∪ assigned-owner).
CREATE OR REPLACE FUNCTION public.user_can_see_filter(p_filter_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ph_saved_filters f
    WHERE f.id = p_filter_id
      AND (f.user_id = p_uid OR f.is_shared = true OR f.owner_id = p_uid)
  );
$$;

-- 2. Extend board visibility with the filter clause. Full body is reproduced from
--    the current definition with only the final OR-clause added.
CREATE OR REPLACE FUNCTION public.can_view_board(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM boards b WHERE b.id = _board_id AND b.deleted_at IS NULL
      AND (
        b.visibility = 'global'
        OR (b.visibility = 'private' AND b.created_by = _user_id)
        OR (b.project_id IS NOT NULL AND b.visibility <> 'private' AND EXISTS (
          SELECT 1 FROM project_members pm WHERE pm.project_id = b.project_id AND pm.user_id = _user_id
        ))
        OR (b.project_id IS NOT NULL AND b.visibility <> 'private' AND EXISTS (
          SELECT 1 FROM ph_project_members ppm
          JOIN ph_projects pp ON pp.id = ppm.project_id
          JOIN projects p ON lower(p.name) = lower(pp.name)
          WHERE p.id = b.project_id AND ppm.user_id = _user_id
        ))
        OR EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = _user_id)
        OR (b.is_personal = true AND b.created_by = _user_id)
        -- NEW: a filter-backed board is visible to anyone who can see its filter.
        OR (b.filter_id IS NOT NULL AND public.user_can_see_filter(b.filter_id, _user_id))
      )
  );
$$;
