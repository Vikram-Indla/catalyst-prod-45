-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice C3: atomic folder move
-- One RPC owns the move: circularity check, system-folder lock, depth-7 cap,
-- and ltree path + depth rewrite for the whole subtree.

CREATE OR REPLACE FUNCTION public.tm_move_folder(p_folder_id uuid, p_new_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder RECORD;
  v_parent RECORD;
  v_new_path ltree;
  v_new_depth integer;
  v_subtree_max_rel integer;
BEGIN
  SELECT * INTO v_folder FROM tm_folders WHERE id = p_folder_id;
  IF v_folder.id IS NULL THEN
    RAISE EXCEPTION 'tm_move_folder: unknown folder %', p_folder_id;
  END IF;
  IF v_folder.is_system THEN
    RAISE EXCEPTION 'SYSTEM_FOLDER_LOCKED: system folders cannot be moved' USING ERRCODE = 'check_violation';
  END IF;
  IF p_new_parent_id IS NOT NULL THEN
    SELECT * INTO v_parent FROM tm_folders WHERE id = p_new_parent_id;
    IF v_parent.id IS NULL THEN
      RAISE EXCEPTION 'tm_move_folder: unknown target parent %', p_new_parent_id;
    END IF;
    IF v_parent.project_id <> v_folder.project_id THEN
      RAISE EXCEPTION 'tm_move_folder: cannot move across projects';
    END IF;
    -- tm_check_circular_folder returns TRUE when the move IS circular
    IF tm_check_circular_folder(p_folder_id, p_new_parent_id) THEN
      RAISE EXCEPTION 'CIRCULAR_MOVE: folder cannot move under itself or its descendants' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  v_new_depth := COALESCE(v_parent.depth + 1, 0);

  -- Depth cap: deepest descendant after the move must stay <= 7
  SELECT COALESCE(MAX(depth) - v_folder.depth, 0) INTO v_subtree_max_rel
  FROM tm_folders
  WHERE project_id = v_folder.project_id
    AND (id = p_folder_id OR path <@ v_folder.path);
  IF v_new_depth + v_subtree_max_rel > 7 THEN
    RAISE EXCEPTION 'DEPTH_LIMIT: move would exceed the 7-level folder limit' USING ERRCODE = 'check_violation';
  END IF;

  v_new_path := COALESCE(v_parent.path || tm_ltree_label(v_folder.name)::ltree,
                         tm_ltree_label(v_folder.name)::ltree);

  -- Rewrite subtree paths/depths relative to the folder's old path, then the folder itself
  UPDATE tm_folders
  SET path = v_new_path || subpath(path, nlevel(v_folder.path)),
      depth = v_new_depth + (depth - v_folder.depth),
      updated_at = now()
  WHERE project_id = v_folder.project_id
    AND path <@ v_folder.path
    AND id <> p_folder_id;

  UPDATE tm_folders
  SET parent_id = p_new_parent_id,
      path = v_new_path,
      depth = v_new_depth,
      updated_at = now()
  WHERE id = p_folder_id;
END;
$$;
