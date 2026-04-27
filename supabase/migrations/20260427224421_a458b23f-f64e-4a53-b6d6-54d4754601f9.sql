
-- ============================================================
-- 1) Catalyst workflow: Business Request scheme rebuild
-- ============================================================
DO $$
DECLARE
  v_scheme_id uuid := 'a0000005-0000-0000-0000-000000000001';
  s_new uuid;
  s_demand_approved uuid;
  s_analysis uuid;
  s_ready_dev uuid;
  s_under_impl uuid;
  s_impl_review uuid;
  s_pending_test uuid;
  s_done uuid;
  s_on_hold uuid;
  s_canceled uuid;
BEGIN
  -- Wipe existing transitions + statuses for this scheme
  DELETE FROM catalyst_workflow_transitions WHERE scheme_id = v_scheme_id;
  DELETE FROM catalyst_workflow_statuses    WHERE scheme_id = v_scheme_id;

  -- Insert canonical statuses
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'New',                    'new',                    'todo',        '#DFE1E6', 0, true,  false) RETURNING id INTO s_new;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Demand Approved',        'demand_approved',        'in_progress', '#DEEBFF', 1, false, false) RETURNING id INTO s_demand_approved;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Analysis',               'analysis',               'in_progress', '#DEEBFF', 2, false, false) RETURNING id INTO s_analysis;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Ready for Development',  'ready_for_development',  'in_progress', '#DEEBFF', 3, false, false) RETURNING id INTO s_ready_dev;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Under Implementation',   'under_implementation',   'in_progress', '#DEEBFF', 4, false, false) RETURNING id INTO s_under_impl;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Implementation Review',  'implementation_review',  'in_progress', '#DEEBFF', 5, false, false) RETURNING id INTO s_impl_review;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Pending Testing',        'pending_testing',        'in_progress', '#DEEBFF', 6, false, false) RETURNING id INTO s_pending_test;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Done',                   'done',                   'done',        '#E3FCEF', 7, false, true)  RETURNING id INTO s_done;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'On Hold',                'on_hold',                'todo',        '#DFE1E6', 8, false, false) RETURNING id INTO s_on_hold;
  INSERT INTO catalyst_workflow_statuses (scheme_id, name, slug, category, color, position, is_initial, is_final)
  VALUES
    (v_scheme_id, 'Canceled',               'canceled',               'done',        '#E3FCEF', 9, false, true)  RETURNING id INTO s_canceled;

  -- Transitions (per approved diagram)
  -- New → Demand Approved, On Hold, Canceled
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_new, s_demand_approved, 'Approve Demand', false, 1),
    (v_scheme_id, s_new, s_on_hold,         'Put On Hold',    false, 2),
    (v_scheme_id, s_new, s_canceled,        'Cancel',         false, 3);

  -- Demand Approved → Analysis, Ready for Development, On Hold, Canceled
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_demand_approved, s_analysis,  'Start Analysis',          false, 1),
    (v_scheme_id, s_demand_approved, s_ready_dev, 'Mark Ready for Dev',      false, 2),
    (v_scheme_id, s_demand_approved, s_on_hold,   'Put On Hold',             false, 3),
    (v_scheme_id, s_demand_approved, s_canceled,  'Cancel',                  false, 4);

  -- Analysis → Ready for Development, On Hold, Canceled
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_analysis, s_ready_dev, 'Mark Ready for Dev', false, 1),
    (v_scheme_id, s_analysis, s_on_hold,   'Put On Hold',        false, 2),
    (v_scheme_id, s_analysis, s_canceled,  'Cancel',             false, 3);

  -- Ready for Development → Under Implementation, On Hold, Canceled
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_ready_dev, s_under_impl, 'Start Implementation', false, 1),
    (v_scheme_id, s_ready_dev, s_on_hold,    'Put On Hold',          false, 2),
    (v_scheme_id, s_ready_dev, s_canceled,   'Cancel',               false, 3);

  -- Under Implementation → Implementation Review, On Hold, Canceled
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_under_impl, s_impl_review, 'Submit for Review', false, 1),
    (v_scheme_id, s_under_impl, s_on_hold,     'Put On Hold',       false, 2),
    (v_scheme_id, s_under_impl, s_canceled,    'Cancel',            false, 3);

  -- Implementation Review → Pending Testing, Under Implementation (rework), On Hold
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_impl_review, s_pending_test, 'Approve for Testing',  false, 1),
    (v_scheme_id, s_impl_review, s_under_impl,   'Reject — Rework',      false, 2),
    (v_scheme_id, s_impl_review, s_on_hold,      'Put On Hold',          false, 3);

  -- Pending Testing → Done, Under Implementation (failed test rework)
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_pending_test, s_done,       'Mark Done',         false, 1),
    (v_scheme_id, s_pending_test, s_under_impl, 'Failed — Rework',   false, 2);

  -- Done → Pending Testing (reopen)
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_done, s_pending_test, 'Reopen', false, 1);

  -- On Hold → New, Demand Approved, Analysis, Ready for Development (resume)
  INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order) VALUES
    (v_scheme_id, s_on_hold, s_new,             'Resume — New',                   false, 1),
    (v_scheme_id, s_on_hold, s_demand_approved, 'Resume — Demand Approved',       false, 2),
    (v_scheme_id, s_on_hold, s_analysis,        'Resume — Analysis',              false, 3),
    (v_scheme_id, s_on_hold, s_ready_dev,       'Resume — Ready for Development', false, 4);

  -- Canceled is terminal: no outgoing transitions
END$$;

-- ============================================================
-- 2) Product Hub Kanban: rebuild demand_process_steps to match
-- ============================================================
DELETE FROM demand_process_steps;

INSERT INTO demand_process_steps (value, label, sort_order, is_active) VALUES
  ('new',                    'New',                    1,  true),
  ('demand_approved',        'Demand Approved',        2,  true),
  ('analysis',               'Analysis',               3,  true),
  ('ready_for_development',  'Ready for Development',  4,  true),
  ('under_implementation',   'Under Implementation',   5,  true),
  ('implementation_review',  'Implementation Review',  6,  true),
  ('pending_testing',        'Pending Testing',        7,  true),
  ('done',                   'Done',                   8,  true),
  ('on_hold',                'On Hold',                9,  true),
  ('canceled',               'Canceled',              10,  true);

-- ============================================================
-- 3) Migrate existing business_requests.process_step values
-- ============================================================
UPDATE business_requests SET process_step = CASE lower(trim(coalesce(process_step,'')))
  WHEN 'new_request'         THEN 'new'
  WHEN 'new'                 THEN 'new'
  WHEN 'in_review'           THEN 'analysis'
  WHEN 'ea_review'           THEN 'analysis'
  WHEN 'technical_validation' THEN 'analysis'
  WHEN 'analyse'             THEN 'analysis'
  WHEN 'analysis'            THEN 'analysis'
  WHEN 'approved'            THEN 'demand_approved'
  WHEN 'demand_approved'     THEN 'demand_approved'
  WHEN 'ready_to_implement'  THEN 'ready_for_development'
  WHEN 'ready_for_development' THEN 'ready_for_development'
  WHEN 'implement'           THEN 'under_implementation'
  WHEN 'under_implementation' THEN 'under_implementation'
  WHEN 'implementation_review' THEN 'implementation_review'
  WHEN 'pending_testing'     THEN 'pending_testing'
  WHEN 'closed'              THEN 'done'
  WHEN 'done'                THEN 'done'
  WHEN 'rejected'            THEN 'canceled'
  WHEN 'canceled'            THEN 'canceled'
  WHEN 'cancelled'           THEN 'canceled'
  WHEN 'on_hold'             THEN 'on_hold'
  WHEN 'on-hold'             THEN 'on_hold'
  ELSE process_step
END
WHERE process_step IS NOT NULL;
