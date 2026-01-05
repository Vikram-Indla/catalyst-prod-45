-- ============================================================
-- SEED DEMO DATA FOR EXISTING TM TABLES
-- ============================================================

-- First create a demo project
INSERT INTO tm_projects (id, name, key, description)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Project', 'DEMO', 'Demo project for testing')
ON CONFLICT (id) DO NOTHING;

-- Ensure priority and type lookup tables have data
INSERT INTO tm_case_priorities (id, project_id, name, color, sort_order)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Critical', '#ef4444', 1),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'High', '#f97316', 2),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Medium', '#eab308', 3),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Low', '#22c55e', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tm_case_types (id, project_id, name, icon, color)
VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Functional', 'box', '#3b82f6'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'Performance', 'zap', '#f59e0b'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'Security', 'shield', '#ef4444'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'API', 'code', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

-- Test Cases (using correct enum: draft, ready, approved, deprecated)
INSERT INTO tm_test_cases (id, project_id, case_key, title, description, status, priority_id, case_type_id)
VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'TC-001', 'User Login - Valid Credentials', 'Verify user can login with valid credentials', 'approved', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'TC-002', 'User Login - Invalid Password', 'Verify error for invalid password', 'approved', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'TC-003', 'User Registration Flow', 'Complete registration process', 'approved', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'TC-004', 'Password Reset Email', 'Verify reset email delivery', 'ready', '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000001', 'TC-005', 'Dashboard Load Performance', 'Dashboard loads under 3 seconds', 'draft', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000001', 'TC-006', 'Profile Update', 'User can update profile', 'approved', '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000001', 'TC-007', 'Session Timeout', 'Session expires after inactivity', 'approved', '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0002-000000000003'),
  ('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0000-000000000001', 'TC-008', 'Multi-factor Auth Setup', 'MFA configuration flow', 'draft', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000003'),
  ('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0000-000000000001', 'TC-009', 'Data Export CSV', 'Export data to CSV', 'approved', '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0000-000000000001', 'TC-010', 'API Rate Limiting', 'Rate limits enforced', 'approved', '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000004')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Test Cycles (using: planned, in_progress, completed, archived)
INSERT INTO tm_test_cycles (id, project_id, cycle_key, name, description, status, planned_start, planned_end)
VALUES
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', 'CY-045', 'Sprint 45 - Auth Module', 'Authentication module testing', 'in_progress', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001', 'CY-044', 'Regression - v2.4 Release', 'Full regression for v2.4', 'in_progress', NOW() - INTERVAL '3 days', NOW() + INTERVAL '5 days'),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000001', 'CY-043', 'API Integration Tests', 'Third-party API testing', 'planned', NOW() + INTERVAL '1 day', NOW() + INTERVAL '12 days')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Cycle Scope (using: not_run, in_progress, passed, failed, blocked, skipped)
INSERT INTO tm_cycle_scope (cycle_id, test_case_id, current_status)
VALUES
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001', 'passed'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000002', 'passed'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000003', 'failed'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000004', 'blocked'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000005', 'not_run'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000006', 'passed'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000001', 'passed'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000002', 'not_run'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000007', 'failed'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000008', 'blocked'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000009', 'passed'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000010', 'not_run')
ON CONFLICT DO NOTHING;

-- Defects (using: open, in_progress, resolved, closed, reopened)
INSERT INTO tm_defects (id, project_id, defect_key, title, description, status, severity)
VALUES
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', 'DEF-089', 'Login button unresponsive on iOS Safari', 'Button does not respond to tap on iOS Safari 16+', 'open', 'critical'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000001', 'DEF-088', 'Payment fails on Safari browser', 'Timeout error during payment on Safari', 'open', 'critical'),
  ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-000000000001', 'DEF-087', 'Data loss on session timeout', 'Form data lost when session expires', 'in_progress', 'critical'),
  ('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-000000000001', 'DEF-086', 'Password briefly shows plain text', 'Password visible for 500ms', 'open', 'major'),
  ('00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-000000000001', 'DEF-085', 'Wrong date format in reports', 'Shows MM/DD/YYYY not configured format', 'open', 'major'),
  ('00000000-0000-0000-0005-000000000006', '00000000-0000-0000-0000-000000000001', 'DEF-084', 'Typo in error message', 'Says Invlaid instead of Invalid', 'open', 'minor'),
  ('00000000-0000-0000-0005-000000000007', '00000000-0000-0000-0000-000000000001', 'DEF-083', 'Icon misalignment', 'Bell icon 2px lower than others', 'open', 'trivial')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Activity Log - fresh data
DELETE FROM tm_activity_log;
INSERT INTO tm_activity_log (project_id, user_name, action_type, entity_type, entity_key, entity_title, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sarah Khan', 'PASSED', 'case', 'TC-234', 'User auth validation', NOW() - INTERVAL '30 seconds'),
  ('00000000-0000-0000-0000-000000000001', 'John Doe', 'CREATED', 'defect', 'DEF-089', 'Login button unresponsive', NOW() - INTERVAL '2 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'Mike Ahmed', 'COMPLETED', 'cycle', 'CY-042', 'Sprint 44 Regression', NOW() - INTERVAL '15 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'Lisa Wong', 'UPDATED', 'case', 'TC-847', 'Payment integration', NOW() - INTERVAL '32 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'Ahmed Rashid', 'ADDED_CASES', 'cycle', 'CY-045', 'Sprint 45 Auth Module', NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0000-000000000001', 'Sarah Khan', 'FAILED', 'case', 'TC-103', 'Session timeout test', NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000001', 'John Doe', 'BLOCKED', 'case', 'TC-156', 'Database migration', NOW() - INTERVAL '3 hours');

-- Update cycle counts
UPDATE tm_test_cycles SET 
  total_cases = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = tm_test_cycles.id),
  passed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = tm_test_cycles.id AND current_status = 'passed'),
  failed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = tm_test_cycles.id AND current_status = 'failed'),
  blocked_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = tm_test_cycles.id AND current_status = 'blocked'),
  not_run_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = tm_test_cycles.id AND current_status = 'not_run')
WHERE id IN ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0004-000000000003');