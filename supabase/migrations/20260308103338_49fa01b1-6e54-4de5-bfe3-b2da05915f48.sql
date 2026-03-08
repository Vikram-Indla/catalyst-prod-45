
-- Fix infinite recursion in boards RLS policies
-- The issue: boards_select references board_members, and board_members_select references boards

-- Step 1: Create a SECURITY DEFINER function to check board visibility without triggering RLS
CREATE OR REPLACE FUNCTION public.can_view_board(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = _board_id
      AND b.deleted_at IS NULL
      AND (
        -- Global boards
        b.visibility = 'global'
        -- Private boards owned by user
        OR (b.visibility = 'private' AND b.created_by = _user_id)
        -- Project boards where user is a project member
        OR (b.project_id IS NOT NULL AND b.visibility <> 'private' AND EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = b.project_id AND pm.user_id = _user_id
        ))
        -- Explicit board member
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id AND bm.user_id = _user_id
        )
      )
  );
$$;

-- Step 2: Create a function to check if a board exists and is not deleted (for child table policies)
CREATE OR REPLACE FUNCTION public.board_not_deleted(_board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM boards WHERE id = _board_id AND deleted_at IS NULL
  );
$$;

-- Step 3: Drop and recreate boards SELECT policy
DROP POLICY IF EXISTS boards_select ON boards;
CREATE POLICY boards_select ON boards
  FOR SELECT TO authenticated
  USING (can_view_board(id, auth.uid()));

-- Step 4: Fix board_members SELECT policy (was referencing boards causing recursion)
DROP POLICY IF EXISTS board_members_select ON board_members;
CREATE POLICY board_members_select ON board_members
  FOR SELECT TO authenticated
  USING (board_not_deleted(board_id));

-- Step 5: Fix board_columns SELECT policy
DROP POLICY IF EXISTS board_columns_select ON board_columns;
CREATE POLICY board_columns_select ON board_columns
  FOR SELECT TO authenticated
  USING (board_not_deleted(board_id));

-- Step 6: Fix board_issue_rank SELECT policy
DROP POLICY IF EXISTS issue_rank_select ON board_issue_rank;
CREATE POLICY issue_rank_select ON board_issue_rank
  FOR SELECT TO authenticated
  USING (board_not_deleted(board_id));
