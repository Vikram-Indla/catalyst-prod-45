-- CAT-BOARDS-REDESIGN-20260701-001
-- Extend create_board() RPC with p_is_default and p_primary_work_item_type.

CREATE OR REPLACE FUNCTION public.create_board(
  p_name                   TEXT,
  p_project_id             UUID    DEFAULT NULL,
  p_is_personal            BOOLEAN DEFAULT FALSE,
  p_visibility             TEXT    DEFAULT 'project',
  p_swimlane_type          TEXT    DEFAULT 'none',
  p_color                  TEXT    DEFAULT '#2563EB',
  p_columns                JSONB   DEFAULT NULL,
  p_user_id                UUID    DEFAULT NULL,
  p_board_type             TEXT    DEFAULT 'kanban',
  p_board_query            TEXT    DEFAULT NULL,
  p_is_default             BOOLEAN DEFAULT FALSE,
  p_primary_work_item_type TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_board_id      UUID;
  v_col           JSONB;
  v_pos           INT := 0;
  v_uid           UUID := COALESCE(p_user_id, auth.uid());
  v_default_cols  JSONB := COALESCE(p_columns, '[
    {"name":"To Do","is_backlog":true,"is_done":false},
    {"name":"In Progress","is_backlog":false,"is_done":false},
    {"name":"Done","is_backlog":false,"is_done":true}
  ]'::jsonb);
  v_board_query   TEXT := COALESCE(
    p_board_query,
    CASE
      WHEN p_board_type = 'scrum'
        THEN 'project = ' || COALESCE((SELECT key FROM public.ph_projects WHERE id = p_project_id), 'PROJECT') || ' AND sprint in openSprints() ORDER BY Rank ASC'
      ELSE
        'project = ' || COALESCE((SELECT key FROM public.ph_projects WHERE id = p_project_id), 'PROJECT') || ' ORDER BY Rank ASC'
    END
  );
BEGIN
  INSERT INTO public.boards(
    name, project_id, is_personal, visibility, swimlane_type,
    show_swimlanes, color, filter_project_ids, board_type, board_query,
    is_default, primary_work_item_type,
    created_by, updated_by
  )
  VALUES(
    p_name, p_project_id, p_is_personal, p_visibility, p_swimlane_type,
    TRUE, p_color,
    CASE WHEN p_project_id IS NOT NULL THEN ARRAY[p_project_id] ELSE '{}'::UUID[] END,
    p_board_type, v_board_query,
    p_is_default, p_primary_work_item_type,
    v_uid, v_uid
  )
  RETURNING id INTO v_board_id;

  FOR v_col IN SELECT * FROM jsonb_array_elements(v_default_cols) LOOP
    INSERT INTO public.board_columns(board_id, name, position, status_ids, is_backlog, is_done)
    VALUES(
      v_board_id, v_col->>'name', v_pos, '{}',
      COALESCE((v_col->>'is_backlog')::BOOLEAN, FALSE),
      COALESCE((v_col->>'is_done')::BOOLEAN, FALSE)
    );
    v_pos := v_pos + 1;
  END LOOP;

  INSERT INTO public.board_quick_filters(board_id, name, filter_type, is_system, sort_order) VALUES
    (v_board_id, 'All Issues',      'all',     TRUE, 0),
    (v_board_id, 'My Issues',       'mine',    TRUE, 1),
    (v_board_id, 'Current Release', 'release', TRUE, 2);

  INSERT INTO public.board_members(board_id, user_id, role)
  VALUES(v_board_id, v_uid, 'admin')
  ON CONFLICT(board_id, user_id) DO NOTHING;

  RETURN v_board_id;
END;
$$;
