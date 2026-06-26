-- Story Workflow — add 4 missing post-dev statuses
-- Positions 10-13 appended after existing 10 statuses (0-9).
-- All 4 are in the 'done' category (post-integration delivery phases).
-- Mirrors naming from live Jira BAU statuses.

DO $$
DECLARE
  v_scheme_id  uuid;
  v_s_staging  uuid;
  v_s_beta     uuid;
  v_s_prodready uuid;
  v_s_inprod   uuid;
BEGIN
  SELECT id INTO v_scheme_id
  FROM catalyst_workflow_schemes
  WHERE issue_type = 'Story' AND is_default = true
  LIMIT 1;

  IF v_scheme_id IS NULL THEN
    RAISE EXCEPTION 'Story workflow scheme not found';
  END IF;

  -- ─── 1. Insert missing statuses (skip if already present) ────────────────
  INSERT INTO catalyst_workflow_statuses
    (scheme_id, name, slug, category, color, position, is_initial, is_final, is_active)
  VALUES
    (v_scheme_id, 'Staging/QA',       'staging-qa',       'done', '#16A34A', 10, false, false, true),
    (v_scheme_id, 'In BETA',          'in-beta',          'done', '#16A34A', 11, false, false, true),
    (v_scheme_id, 'Production Ready', 'production-ready', 'done', '#16A34A', 12, false, false, true),
    (v_scheme_id, 'In Production',    'in-production',    'done', '#16A34A', 13, false, true,  true)
  ON CONFLICT DO NOTHING;

  -- ─── 2. Fetch the new status IDs ─────────────────────────────────────────
  SELECT id INTO v_s_staging   FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'staging-qa'       LIMIT 1;
  SELECT id INTO v_s_beta      FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'in-beta'          LIMIT 1;
  SELECT id INTO v_s_prodready FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'production-ready' LIMIT 1;
  SELECT id INTO v_s_inprod    FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme_id AND slug = 'in-production'    LIMIT 1;

  -- ─── 3. Add global transitions (any → each new status) ───────────────────
  INSERT INTO catalyst_workflow_transitions
    (scheme_id, name, from_status_id, to_status_id, is_global, sort_order)
  VALUES
    (v_scheme_id, 'Staging/QA',       NULL, v_s_staging,   true, 11),
    (v_scheme_id, 'In BETA',          NULL, v_s_beta,      true, 12),
    (v_scheme_id, 'Production Ready', NULL, v_s_prodready, true, 13),
    (v_scheme_id, 'In Production',    NULL, v_s_inprod,    true, 14)
  ON CONFLICT DO NOTHING;

END;
$$;
