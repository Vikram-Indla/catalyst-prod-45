-- Feature Workflow — clone of Epic Workflow
-- 4 statuses (Backlog, On Hold, In Progress, Done) + 4 global transitions (any → any)
-- Mirrors the Epic Workflow pattern exactly, per 2026-05-17 requirement.

DO $$
DECLARE
  v_scheme_id  uuid;
  v_s_backlog  uuid;
  v_s_onhold   uuid;
  v_s_progress uuid;
  v_s_done     uuid;
BEGIN
  -- ─── 1. Scheme ───────────────────────────────────────────────────────────
  INSERT INTO catalyst_workflow_schemes
    (name, issue_type, is_active, is_default)
  VALUES
    ('Feature Workflow', 'Feature', true, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_scheme_id;

  -- If scheme already exists, fetch its id
  IF v_scheme_id IS NULL THEN
    SELECT id INTO v_scheme_id
    FROM catalyst_workflow_schemes
    WHERE issue_type = 'Feature' AND is_default = true
    LIMIT 1;
  END IF;

  IF v_scheme_id IS NULL THEN
    RAISE EXCEPTION 'Could not create or find Feature workflow scheme';
  END IF;

  -- ─── 2. Statuses (mirror Epic's 4 statuses exactly) ──────────────────────
  INSERT INTO catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final, is_active)
  VALUES
    (v_scheme_id, 'Backlog',     'backlog',     'todo',        '#64748B', 0, true,  false, true),
    (v_scheme_id, 'On Hold',     'on-hold',     'todo',        '#64748B', 1, false, false, true),
    (v_scheme_id, 'In Progress', 'in-progress', 'in_progress', '#2563EB', 2, false, false, true),
    (v_scheme_id, 'Done',        'done',        'done',        '#16A34A', 3, false, true,  true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_s_backlog;  -- only first row; we'll fetch all below

  -- Fetch status IDs for transition wiring
  SELECT id INTO v_s_backlog  FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'backlog'     LIMIT 1;
  SELECT id INTO v_s_onhold   FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'on-hold'     LIMIT 1;
  SELECT id INTO v_s_progress FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'in-progress' LIMIT 1;
  SELECT id INTO v_s_done     FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'done'        LIMIT 1;

  -- ─── 3. Transitions (4 global — any → each status, mirrors Epic) ─────────
  INSERT INTO catalyst_workflow_transitions
    (scheme_id, name, from_status_id, to_status_id, is_global, sort_order)
  VALUES
    (v_scheme_id, 'Backlog',     NULL, v_s_backlog,  true, 1),
    (v_scheme_id, 'On Hold',     NULL, v_s_onhold,   true, 2),
    (v_scheme_id, 'In Progress', NULL, v_s_progress, true, 3),
    (v_scheme_id, 'Done',        NULL, v_s_done,     true, 4)
  ON CONFLICT DO NOTHING;

END;
$$;
