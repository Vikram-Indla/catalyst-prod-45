
-- CATALYST TESTS SEED DATA - PART 2 (Reports & Dashboards Only)

-- STEP 1: Create 30 saved reports
INSERT INTO test_reports (id, report_type, program_id, config, generated_at, generated_by, created_at)
SELECT gen_random_uuid(),
  CASE (n % 10) WHEN 0 THEN 'execution_summary' WHEN 1 THEN 'traceability_summary' WHEN 2 THEN 'case_distribution' WHEN 3 THEN 'defect_impact' WHEN 4 THEN 'execution_burndown' WHEN 5 THEN 'multi_cycle_summary' WHEN 6 THEN 'project_metrics' WHEN 7 THEN 'user_activity' WHEN 8 THEN 'automation_activity' ELSE 'execution_history' END,
  '22222222-2222-2222-2222-222222222222'::UUID,
  jsonb_build_object('name', CASE (n % 10) WHEN 0 THEN 'Sprint Execution Summary' WHEN 1 THEN 'Requirements Traceability' WHEN 2 THEN 'Case Distribution Report' WHEN 3 THEN 'Defect Impact Analysis' WHEN 4 THEN 'Execution Burndown' WHEN 5 THEN 'Multi-Cycle Summary' WHEN 6 THEN 'Project Metrics' WHEN 7 THEN 'User Activity Report' WHEN 8 THEN 'Automation Activity' ELSE 'Execution History' END || ' v' || n, 'filters', jsonb_build_object('dateRange', '30d'), 'format', CASE WHEN n % 3 = 0 THEN 'pdf' WHEN n % 3 = 1 THEN 'excel' ELSE 'csv' END),
  NOW() - (random() * 30)::INTEGER * INTERVAL '1 day',
  (SELECT id FROM auth.users LIMIT 1),
  NOW() - (random() * 30)::INTEGER * INTERVAL '1 day'
FROM generate_series(1, 30) AS n;

-- STEP 2: Create 15 dashboards
INSERT INTO test_dashboards (id, name, description, user_id, program_id, layout, is_default, visibility, created_at, updated_at)
SELECT gen_random_uuid(),
  CASE (n % 5) WHEN 0 THEN 'QA Manager Dashboard' WHEN 1 THEN 'Tester Dashboard' WHEN 2 THEN 'Sprint Overview' WHEN 3 THEN 'Admin Dashboard' ELSE 'Performance Dashboard' END || ' ' || ceil(n::NUMERIC / 5)::TEXT,
  'Dashboard for test management overview',
  (SELECT id FROM auth.users LIMIT 1),
  '22222222-2222-2222-2222-222222222222'::UUID,
  '{"columns": 12, "rowHeight": 80}'::jsonb,
  n = 1,
  CASE WHEN n % 3 = 0 THEN 'private' WHEN n % 3 = 1 THEN 'team' ELSE 'public' END,
  NOW() - (random() * 30)::INTEGER * INTERVAL '1 day',
  NOW()
FROM generate_series(1, 15) AS n;

-- STEP 3: Add gadgets to dashboards (6 per dashboard)
INSERT INTO test_dashboard_gadgets (id, dashboard_id, gadget_type, position, config, created_at)
SELECT gen_random_uuid(), d.id,
  CASE (g.n % 13) WHEN 0 THEN 'project_overview' WHEN 1 THEN 'top_contributors' WHEN 2 THEN 'execution_burndown' WHEN 3 THEN 'execution_burnup' WHEN 4 THEN 'execution_distribution' WHEN 5 THEN 'execution_overview' WHEN 6 THEN 'defect_summary' WHEN 7 THEN 'traceability_summary' WHEN 8 THEN 'case_distribution' WHEN 9 THEN 'user_activity' WHEN 10 THEN 'project_activity' WHEN 11 THEN 'project_activity_advanced' ELSE 'traceability_detail' END,
  jsonb_build_object('x', (g.n % 3) * 4, 'y', (g.n / 3) * 2, 'w', 4, 'h', 2),
  jsonb_build_object('title', 'Gadget ' || g.n, 'refreshInterval', 300),
  NOW()
FROM test_dashboards d CROSS JOIN generate_series(1, 6) AS g(n)
WHERE d.program_id = '22222222-2222-2222-2222-222222222222';
