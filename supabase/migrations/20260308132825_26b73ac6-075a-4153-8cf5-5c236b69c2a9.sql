
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
      )
  );
$$;
