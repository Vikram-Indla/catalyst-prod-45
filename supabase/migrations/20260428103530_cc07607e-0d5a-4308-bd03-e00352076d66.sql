
-- Rebuild Business Request workflow per new diagram
DO $$
DECLARE
  v_scheme uuid := 'a0000005-0000-0000-0000-000000000001';
  s_new uuid; s_intake uuid; s_validation uuid; s_pending uuid;
  s_analysis uuid; s_backlog uuid; s_impl uuid; s_review uuid;
  s_uat uuid; s_ready uuid; s_done uuid; s_hold uuid; s_cancel uuid;
BEGIN
  -- Wipe existing transitions and statuses for the scheme
  DELETE FROM catalyst_workflow_transitions WHERE scheme_id = v_scheme;
  DELETE FROM catalyst_workflow_statuses WHERE scheme_id = v_scheme;

  -- Insert statuses (todo = grey, in_progress = blue, done = green; on hold/cancel use neutral palette)
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme, 'New', 'new', 'todo', '#DFE1E6', 0, true, false) RETURNING id INTO s_new;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Demand Intake', 'demand_intake', 'todo', '#DFE1E6', 1, false, false) RETURNING id INTO s_intake;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Demand Validation', 'demand_validation', 'todo', '#DFE1E6', 2, false, false) RETURNING id INTO s_validation;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Pending Approval', 'pending_approval', 'todo', '#DFE1E6', 3, false, false) RETURNING id INTO s_pending;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Analysis & Design', 'analysis_design', 'in_progress', '#DEEBFF', 4, false, false) RETURNING id INTO s_analysis;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Prioritized Backlog', 'prioritized_backlog', 'in_progress', '#DEEBFF', 5, false, false) RETURNING id INTO s_backlog;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Implementation', 'implementation', 'in_progress', '#DEEBFF', 6, false, false) RETURNING id INTO s_impl;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Review & QA', 'review_qa', 'in_progress', '#DEEBFF', 7, false, false) RETURNING id INTO s_review;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Pending UAT/Beta', 'pending_uat_beta', 'in_progress', '#E3FCEF', 8, false, false) RETURNING id INTO s_uat;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Ready for Production', 'ready_for_production', 'in_progress', '#E3FCEF', 9, false, false) RETURNING id INTO s_ready;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Done', 'done', 'done', '#E3FCEF', 10, false, true) RETURNING id INTO s_done;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'On Hold', 'on_hold', 'todo', '#DFE1E6', 11, false, false) RETURNING id INTO s_hold;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES (v_scheme, 'Canceled', 'canceled', 'done', '#E3FCEF', 12, false, true) RETURNING id INTO s_cancel;

  -- Forward path
  INSERT INTO catalyst_workflow_transitions (scheme_id, name, from_status_id, to_status_id, is_global, sort_order) VALUES
    (v_scheme, 'Start Intake',          s_new,        s_intake,     false, 1),
    (v_scheme, 'Submit for Validation', s_intake,     s_validation, false, 2),
    (v_scheme, 'Return for Intake',     s_validation, s_intake,     false, 3),
    (v_scheme, 'Submit for Approval',   s_validation, s_pending,    false, 4),
    (v_scheme, 'Return for Validation', s_pending,    s_validation, false, 5),
    (v_scheme, 'Approve — Analysis',    s_pending,    s_analysis,   false, 6),
    (v_scheme, 'Approve — Backlog',     s_pending,    s_backlog,    false, 7),
    (v_scheme, 'Move to Backlog',       s_analysis,   s_backlog,    false, 8),
    (v_scheme, 'Back to Analysis',      s_backlog,    s_analysis,   false, 9),
    (v_scheme, 'Start Implementation',  s_backlog,    s_impl,       false, 10),
    (v_scheme, 'Submit for Review',     s_impl,       s_review,     false, 11),
    (v_scheme, 'Rework — Design',       s_review,     s_analysis,   false, 12),
    (v_scheme, 'Approve for UAT/Beta',  s_review,     s_uat,        false, 13),
    (v_scheme, 'Rework — QA',           s_uat,        s_review,     false, 14),
    (v_scheme, 'Mark Ready for Prod',   s_uat,        s_ready,      false, 15),
    (v_scheme, 'Mark Done',             s_ready,      s_done,       false, 16);

  -- On Hold (in)
  INSERT INTO catalyst_workflow_transitions (scheme_id, name, from_status_id, to_status_id, is_global, sort_order) VALUES
    (v_scheme, 'Put On Hold', s_intake,     s_hold, false, 20),
    (v_scheme, 'Put On Hold', s_validation, s_hold, false, 21),
    (v_scheme, 'Put On Hold', s_pending,    s_hold, false, 22),
    (v_scheme, 'Put On Hold', s_analysis,   s_hold, false, 23),
    (v_scheme, 'Put On Hold', s_backlog,    s_hold, false, 24),
    (v_scheme, 'Put On Hold', s_impl,       s_hold, false, 25);

  -- Resume from On Hold
  INSERT INTO catalyst_workflow_transitions (scheme_id, name, from_status_id, to_status_id, is_global, sort_order) VALUES
    (v_scheme, 'Resume — Demand Intake',      s_hold, s_intake,     false, 30),
    (v_scheme, 'Resume — Demand Validation',  s_hold, s_validation, false, 31),
    (v_scheme, 'Resume — Pending Approval',   s_hold, s_pending,    false, 32),
    (v_scheme, 'Resume — Analysis & Design',  s_hold, s_analysis,   false, 33),
    (v_scheme, 'Resume — Prioritized Backlog',s_hold, s_backlog,    false, 34),
    (v_scheme, 'Resume — Implementation',     s_hold, s_impl,       false, 35);

  -- Cancel
  INSERT INTO catalyst_workflow_transitions (scheme_id, name, from_status_id, to_status_id, is_global, sort_order) VALUES
    (v_scheme, 'Cancel', s_intake,     s_cancel, false, 40),
    (v_scheme, 'Cancel', s_validation, s_cancel, false, 41),
    (v_scheme, 'Cancel', s_pending,    s_cancel, false, 42),
    (v_scheme, 'Cancel', s_hold,       s_cancel, false, 43);
END $$;
