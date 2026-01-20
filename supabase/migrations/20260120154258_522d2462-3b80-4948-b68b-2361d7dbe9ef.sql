-- ============================================================
-- MODULE 3A-4: DEFECT LINKING & QUICK CREATE
-- Database Functions for Test Execution Runner
-- ============================================================

-- ============================================================
-- Function 1: link_defect_to_step_v2
-- Links an existing defect to a failed step result
-- ============================================================
CREATE OR REPLACE FUNCTION link_defect_to_step_v2(
  p_defect_id UUID,
  p_step_result_id UUID,
  p_run_id UUID DEFAULT NULL,
  p_link_type TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
  v_actor UUID := auth.uid();
  v_defect_key TEXT;
BEGIN
  -- Validate defect exists
  SELECT key INTO v_defect_key
  FROM tm_defects
  WHERE id = p_defect_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Defect not found');
  END IF;

  -- Validate step result exists
  IF NOT EXISTS (SELECT 1 FROM tm_step_results WHERE id = p_step_result_id) THEN
    RETURN jsonb_build_object('error', 'Step result not found');
  END IF;

  -- Check if already linked
  IF EXISTS (
    SELECT 1 FROM tm_defect_links 
    WHERE defect_id = p_defect_id AND step_result_id = p_step_result_id
  ) THEN
    RETURN jsonb_build_object('error', 'Defect is already linked to this step');
  END IF;

  -- Create link
  INSERT INTO tm_defect_links (
    defect_id,
    step_result_id,
    run_id,
    linked_by,
    link_type
  ) VALUES (
    p_defect_id,
    p_step_result_id,
    p_run_id,
    v_actor,
    COALESCE(p_link_type, 'manual')
  )
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'success', true,
    'link_id', v_link_id,
    'defect_key', v_defect_key
  );
END;
$$;


-- ============================================================
-- Function 2: unlink_defect_from_step_v2
-- Removes a defect link from a step
-- ============================================================
CREATE OR REPLACE FUNCTION unlink_defect_from_step_v2(
  p_defect_id UUID,
  p_step_result_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Find and delete link
  DELETE FROM tm_defect_links
  WHERE defect_id = p_defect_id AND step_result_id = p_step_result_id
  RETURNING id INTO v_link_id;

  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Link not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ============================================================
-- Function 3: get_linked_defects_for_step
-- Retrieves all defects linked to a step result
-- ============================================================
CREATE OR REPLACE FUNCTION get_linked_defects_for_step(p_step_result_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_defects JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'key', d.key,
        'title', d.title,
        'status', d.status,
        'severity', d.severity,
        'assignee', CASE 
          WHEN d.assigned_to IS NOT NULL THEN jsonb_build_object(
            'id', p.id,
            'name', p.full_name,
            'avatar', p.avatar_url
          )
          ELSE NULL
        END,
        'link_type', l.link_type,
        'linked_at', l.created_at,
        'created_at', d.created_at
      ) ORDER BY l.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_defects
  FROM tm_defect_links l
  JOIN tm_defects d ON l.defect_id = d.id
  LEFT JOIN profiles p ON d.assigned_to = p.id
  WHERE l.step_result_id = p_step_result_id;

  RETURN jsonb_build_object(
    'defects', v_defects,
    'count', jsonb_array_length(v_defects)
  );
END;
$$;


-- ============================================================
-- Function 4: search_tm_defects
-- Full-text search for defects
-- ============================================================
CREATE OR REPLACE FUNCTION search_tm_defects(
  p_project_id UUID,
  p_query TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results JSONB;
BEGIN
  -- Handle defect key search (DEF-XXXX or similar)
  IF p_query IS NOT NULL AND TRIM(p_query) != '' AND p_query ~* '^[A-Z]+-\d+$' THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'key', d.key,
          'title', d.title,
          'status', d.status,
          'severity', d.severity,
          'assignee', CASE 
            WHEN d.assigned_to IS NOT NULL THEN jsonb_build_object(
              'id', p.id,
              'name', p.full_name
            )
            ELSE NULL
          END,
          'created_at', d.created_at
        )
      ),
      '[]'::jsonb
    ) INTO v_results
    FROM tm_defects d
    LEFT JOIN profiles p ON d.assigned_to = p.id
    WHERE d.project_id = p_project_id
      AND d.key ILIKE p_query || '%'
      AND (p_status IS NULL OR d.status = ANY(p_status))
    LIMIT p_limit;
  ELSIF p_query IS NOT NULL AND TRIM(p_query) != '' THEN
    -- Text search on title/description
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'key', d.key,
          'title', d.title,
          'status', d.status,
          'severity', d.severity,
          'assignee', CASE 
            WHEN d.assigned_to IS NOT NULL THEN jsonb_build_object(
              'id', p.id,
              'name', p.full_name
            )
            ELSE NULL
          END,
          'created_at', d.created_at
        ) ORDER BY d.created_at DESC
      ),
      '[]'::jsonb
    ) INTO v_results
    FROM tm_defects d
    LEFT JOIN profiles p ON d.assigned_to = p.id
    WHERE d.project_id = p_project_id
      AND (
        d.title ILIKE '%' || p_query || '%'
        OR d.description ILIKE '%' || p_query || '%'
      )
      AND (p_status IS NULL OR d.status = ANY(p_status))
    LIMIT p_limit;
  ELSE
    -- Return recent defects if no query
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'key', d.key,
          'title', d.title,
          'status', d.status,
          'severity', d.severity,
          'assignee', CASE 
            WHEN d.assigned_to IS NOT NULL THEN jsonb_build_object(
              'id', p.id,
              'name', p.full_name
            )
            ELSE NULL
          END,
          'created_at', d.created_at
        ) ORDER BY d.created_at DESC
      ),
      '[]'::jsonb
    ) INTO v_results
    FROM tm_defects d
    LEFT JOIN profiles p ON d.assigned_to = p.id
    WHERE d.project_id = p_project_id
      AND (p_status IS NULL OR d.status = ANY(p_status))
    LIMIT p_limit;
  END IF;

  RETURN jsonb_build_object(
    'results', v_results,
    'count', jsonb_array_length(v_results)
  );
END;
$$;


-- ============================================================
-- Function 5: quick_create_defect_v2
-- Creates a new defect and auto-links to step
-- ============================================================
CREATE OR REPLACE FUNCTION quick_create_defect_v2(
  p_project_id UUID,
  p_step_result_id UUID,
  p_run_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'major',
  p_assigned_to UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_defect_id UUID;
  v_defect_key TEXT;
  v_link_id UUID;
  v_actor UUID := auth.uid();
  v_next_number INTEGER;
BEGIN
  -- Validate project
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;

  -- Validate title
  IF TRIM(COALESCE(p_title, '')) = '' THEN
    RETURN jsonb_build_object('error', 'Defect title is required');
  END IF;

  -- Generate defect key
  SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM tm_defects
  WHERE project_id = p_project_id;

  v_defect_key := 'DEF-' || LPAD(v_next_number::TEXT, 4, '0');

  -- Create defect
  INSERT INTO tm_defects (
    project_id,
    key,
    title,
    description,
    severity,
    status,
    assigned_to,
    reported_by,
    auto_created
  ) VALUES (
    p_project_id,
    v_defect_key,
    TRIM(p_title),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    COALESCE(p_severity, 'major'),
    'open',
    p_assigned_to,
    v_actor,
    true
  )
  RETURNING id INTO v_defect_id;

  -- Auto-link to step if provided
  IF p_step_result_id IS NOT NULL THEN
    INSERT INTO tm_defect_links (
      defect_id,
      step_result_id,
      run_id,
      linked_by,
      link_type
    ) VALUES (
      v_defect_id,
      p_step_result_id,
      p_run_id,
      v_actor,
      'auto'
    )
    RETURNING id INTO v_link_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'defect_id', v_defect_id,
    'defect_key', v_defect_key,
    'link_id', v_link_id
  );
END;
$$;