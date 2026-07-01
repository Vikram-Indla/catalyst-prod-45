-- Fix boards_update RLS policy to allow ph_project members to update/delete boards
-- in their project, including boards linked via jira_project_key (null project_id).
--
-- Previous policy only allowed: board creator OR board_members admin.
-- Missing: project-level membership check for soft-delete and settings edits.

DROP POLICY IF EXISTS boards_update ON boards;

CREATE POLICY boards_update ON boards
FOR UPDATE
USING (
  -- Board creator
  (created_by = auth.uid())
  -- Board-level admin member
  OR (EXISTS (
    SELECT 1 FROM board_members bm
    WHERE bm.board_id = boards.id
      AND bm.user_id = auth.uid()
      AND bm.role = 'admin'
  ))
  -- ph_project member (project_id-linked boards)
  OR (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM ph_project_members pm
    WHERE pm.project_id = boards.project_id
      AND pm.user_id = auth.uid()
  ))
  -- ph_project member (jira_project_key-linked boards, project_id is null)
  OR (jira_project_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM ph_project_members pm
    JOIN ph_projects p ON p.id = pm.project_id
    WHERE p.key = boards.jira_project_key
      AND pm.user_id = auth.uid()
  ))
);
