
-- CATALYST TESTS SEED DATA - PART 3 (Additional Cases & Executions)

-- Add 500 more test cases
INSERT INTO test_cases (id, title, description, status, priority, test_type, folder_id, program_id, created_by, created_at, updated_at, preconditions, expected_result, estimated_effort, automation_status)
SELECT 
  gen_random_uuid(),
  'TC-' || (500 + n)::TEXT || ' ' || CASE (n % 10) 
    WHEN 0 THEN 'Verify user profile update functionality'
    WHEN 1 THEN 'Validate search results pagination'
    WHEN 2 THEN 'Test file upload with large files'
    WHEN 3 THEN 'Verify notification delivery timing'
    WHEN 4 THEN 'Test concurrent user session handling'
    WHEN 5 THEN 'Validate data export to CSV format'
    WHEN 6 THEN 'Test password complexity requirements'
    WHEN 7 THEN 'Verify audit log entry creation'
    WHEN 8 THEN 'Test API rate limiting behavior'
    ELSE 'Validate form field validation rules'
  END,
  'Detailed test case description with preconditions and expected outcomes.',
  (CASE (n % 4) WHEN 0 THEN 'draft' WHEN 1 THEN 'approved' WHEN 2 THEN 'published' ELSE 'deprecated' END)::test_case_status,
  (CASE (n % 4) WHEN 0 THEN 'critical' WHEN 1 THEN 'high' WHEN 2 THEN 'medium' ELSE 'low' END)::test_priority,
  (CASE (n % 3) WHEN 0 THEN 'manual' WHEN 1 THEN 'automated' ELSE 'bdd' END)::test_type,
  (SELECT id FROM test_folders WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 1),
  '22222222-2222-2222-2222-222222222222'::UUID,
  (SELECT id FROM auth.users LIMIT 1),
  NOW() - (random() * 60)::INTEGER * INTERVAL '1 day',
  NOW() - (random() * 30)::INTEGER * INTERVAL '1 day',
  'User must be logged in. Test environment must be configured.',
  'Expected behavior documented for validation.',
  CASE (n % 5) WHEN 0 THEN 10 WHEN 1 THEN 15 WHEN 2 THEN 30 WHEN 3 THEN 45 ELSE 60 END,
  CASE WHEN n % 3 = 0 THEN 'automated' ELSE 'manual' END
FROM generate_series(1, 500) AS n;

-- Add test steps
INSERT INTO test_steps (id, test_case_id, step_order, action, expected_result, created_at)
SELECT gen_random_uuid(), tc.id, s.n,
  CASE (s.n % 4) 
    WHEN 1 THEN 'Navigate to the target page and verify it loads'
    WHEN 2 THEN 'Enter test data into the required fields'
    WHEN 3 THEN 'Click the submit/action button'
    ELSE 'Verify the response or result displayed'
  END,
  CASE (s.n % 4)
    WHEN 1 THEN 'Page loads within acceptable time'
    WHEN 2 THEN 'Data is accepted without errors'
    WHEN 3 THEN 'Action is triggered successfully'
    ELSE 'Expected result is displayed'
  END,
  NOW()
FROM test_cases tc
CROSS JOIN generate_series(1, 4) AS s(n)
WHERE tc.title LIKE 'TC-5%' OR tc.title LIKE 'TC-6%' OR tc.title LIKE 'TC-7%' OR tc.title LIKE 'TC-8%' OR tc.title LIKE 'TC-9%';

-- Add 2000 more executions (using correct column names)
INSERT INTO test_executions (id, test_case_id, test_cycle_id, status, executed_by, execution_date, execution_time_seconds, actual_result, program_id, created_at)
SELECT gen_random_uuid(),
  (SELECT id FROM test_cases WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 1),
  (SELECT id FROM test_cycles WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 1),
  (CASE (n % 10) WHEN 0 THEN 'blocked' WHEN 1 THEN 'failed' WHEN 2 THEN 'failed' WHEN 3 THEN 'skipped' ELSE 'passed' END)::test_execution_status,
  (SELECT id FROM auth.users LIMIT 1),
  NOW() - (random() * 30)::INTEGER * INTERVAL '1 day',
  (random() * 600 + 60)::INTEGER,
  CASE (n % 5) WHEN 0 THEN 'Test executed successfully' WHEN 1 THEN 'Found minor issue' WHEN 2 THEN 'Blocked by environment' WHEN 3 THEN 'Skipped' ELSE 'Passed all validations' END,
  '22222222-2222-2222-2222-222222222222'::UUID,
  NOW() - (random() * 30)::INTEGER * INTERVAL '1 day'
FROM generate_series(1, 2000) AS n;
