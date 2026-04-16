
-- Phase 1: Replace placeholder statuses with actual demand process steps

-- First, delete existing transitions for the Business Request scheme
DELETE FROM catalyst_workflow_transitions
WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001';

-- Delete existing placeholder statuses
DELETE FROM catalyst_workflow_statuses
WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001';

-- Insert the 10 actual demand process step statuses
INSERT INTO catalyst_workflow_statuses (id, scheme_id, name, slug, category, color, position, is_initial, is_final) VALUES
  ('b0000005-1001-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'New Demand',           'new_request',          'todo',        '#DFE1E6', 0,  true,  false),
  ('b0000005-1002-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'Under Review',         'in_review',            'in_progress', '#DEEBFF', 1,  false, false),
  ('b0000005-1003-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'EA Review',            'ea_review',            'in_progress', '#DEEBFF', 2,  false, false),
  ('b0000005-1004-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'Analysis',             'analyse',              'in_progress', '#DEEBFF', 3,  false, false),
  ('b0000005-1005-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'Approved',             'approved',             'in_progress', '#DEEBFF', 4,  false, false),
  ('b0000005-1006-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'Ready to Implement',   'ready_to_implement',   'in_progress', '#DEEBFF', 5,  false, false),
  ('b0000005-1007-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'In Progress',          'implement',            'in_progress', '#DEEBFF', 6,  false, false),
  ('b0000005-1008-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'Completed',            'closed',               'done',        '#E3FCEF', 7,  false, true),
  ('b0000005-1009-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'Rejected',             'rejected',             'done',        '#E3FCEF', 8,  false, true),
  ('b0000005-1010-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'On Hold',              'on_hold',              'todo',        '#DFE1E6', 9,  false, false);

-- Create open transitions (any status → any status) 
-- We insert transitions from each status to every other status
INSERT INTO catalyst_workflow_transitions (scheme_id, from_status_id, to_status_id, name, is_global, sort_order)
SELECT
  'a0000005-0000-0000-0000-000000000001',
  f.id,
  t.id,
  t.name,
  false,
  t.position
FROM catalyst_workflow_statuses f
CROSS JOIN catalyst_workflow_statuses t
WHERE f.scheme_id = 'a0000005-0000-0000-0000-000000000001'
  AND t.scheme_id = 'a0000005-0000-0000-0000-000000000001'
  AND f.id != t.id;
