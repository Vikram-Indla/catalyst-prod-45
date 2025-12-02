
-- CATALYST TESTS SEED DATA (SIMPLIFIED)
-- Create folders, cases, steps, sets, cycles, executions

-- STEP 1: Folders
DO $$
DECLARE
  v_program_id UUID := '22222222-2222-2222-2222-222222222222';
  v_user_id UUID;
  v_root_id UUID;
  v_sub_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  INSERT INTO test_folders (id, name, program_id, parent_folder_id, entity_type, created_by, is_system)
  VALUES (gen_random_uuid(), 'Smoke Tests', v_program_id, NULL, 'test_cases', v_user_id, false) RETURNING id INTO v_root_id;
  INSERT INTO test_folders (name, program_id, parent_folder_id, entity_type, created_by, is_system) VALUES 
    ('Login Tests', v_program_id, v_root_id, 'test_cases', v_user_id, false),
    ('Dashboard Tests', v_program_id, v_root_id, 'test_cases', v_user_id, false);

  INSERT INTO test_folders (id, name, program_id, parent_folder_id, entity_type, created_by, is_system)
  VALUES (gen_random_uuid(), 'Regression Tests', v_program_id, NULL, 'test_cases', v_user_id, false) RETURNING id INTO v_root_id;
  INSERT INTO test_folders (id, name, program_id, parent_folder_id, entity_type, created_by, is_system)
  VALUES (gen_random_uuid(), 'Feature A', v_program_id, v_root_id, 'test_cases', v_user_id, false) RETURNING id INTO v_sub_id;
  INSERT INTO test_folders (name, program_id, parent_folder_id, entity_type, created_by, is_system) VALUES 
    ('Positive Tests', v_program_id, v_sub_id, 'test_cases', v_user_id, false),
    ('Negative Tests', v_program_id, v_sub_id, 'test_cases', v_user_id, false);

  INSERT INTO test_folders (id, name, program_id, parent_folder_id, entity_type, created_by, is_system)
  VALUES (gen_random_uuid(), 'API Tests', v_program_id, NULL, 'test_cases', v_user_id, false) RETURNING id INTO v_root_id;
  INSERT INTO test_folders (name, program_id, parent_folder_id, entity_type, created_by, is_system) VALUES 
    ('Auth API', v_program_id, v_root_id, 'test_cases', v_user_id, false),
    ('Data API', v_program_id, v_root_id, 'test_cases', v_user_id, false);

  INSERT INTO test_folders (id, name, program_id, parent_folder_id, entity_type, created_by, is_system)
  VALUES (gen_random_uuid(), 'Performance Tests', v_program_id, NULL, 'test_cases', v_user_id, false);
  INSERT INTO test_folders (id, name, program_id, parent_folder_id, entity_type, created_by, is_system)
  VALUES (gen_random_uuid(), 'Security Tests', v_program_id, NULL, 'test_cases', v_user_id, false);
END $$;

-- STEP 2: 500 Test Cases
INSERT INTO test_cases (id, title, description, preconditions, expected_result, test_type, priority, status, folder_id, program_id, objective, case_type, automation_status, estimated_effort, version, created_by)
SELECT gen_random_uuid(),
  CASE (n % 10) WHEN 0 THEN 'Verify login with valid credentials' WHEN 1 THEN 'Verify error for invalid email' WHEN 2 THEN 'Verify password reset' WHEN 3 THEN 'Verify user registration' WHEN 4 THEN 'Verify dashboard load time' WHEN 5 THEN 'Verify API response 200' WHEN 6 THEN 'Verify form validation' WHEN 7 THEN 'Verify search results' WHEN 8 THEN 'Verify pagination' ELSE 'Verify file upload' END || ' - TC' || LPAD(n::TEXT, 4, '0'),
  'Test case description', 'User logged in', 'Success',
  CASE (n % 3) WHEN 0 THEN 'manual' WHEN 1 THEN 'automated' ELSE 'bdd' END::test_type,
  CASE (n % 4) WHEN 0 THEN 'critical' WHEN 1 THEN 'high' WHEN 2 THEN 'medium' ELSE 'low' END::test_priority,
  CASE (n % 4) WHEN 0 THEN 'draft' WHEN 1 THEN 'approved' WHEN 2 THEN 'published' ELSE 'under_review' END::test_case_status,
  (SELECT id FROM test_folders WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 1),
  '22222222-2222-2222-2222-222222222222'::UUID, 'Validate functionality',
  CASE (n % 3) WHEN 0 THEN 'Functional' WHEN 1 THEN 'Regression' ELSE 'Smoke' END,
  CASE WHEN n % 3 = 0 THEN 'automated' ELSE 'manual' END, 15 + (n % 45), 1, (SELECT id FROM auth.users LIMIT 1)
FROM generate_series(1, 500) AS n;

-- STEP 3: Steps
INSERT INTO test_steps (id, test_case_id, step_order, action, expected_result, is_shared)
SELECT gen_random_uuid(), tc.id, s.n, 'Step ' || s.n || ': Perform action', 'Expected result', false
FROM test_cases tc CROSS JOIN generate_series(1, 4) AS s(n) WHERE tc.program_id = '22222222-2222-2222-2222-222222222222';

-- STEP 4: 50 Sets
INSERT INTO test_sets (id, key, name, objective, program_id, owner_id, status, version, created_by)
SELECT gen_random_uuid(), 'SET-' || LPAD(n::TEXT, 3, '0'),
  CASE (n % 5) WHEN 0 THEN 'Smoke Suite' WHEN 1 THEN 'Regression Suite' WHEN 2 THEN 'API Tests' WHEN 3 THEN 'Security Tests' ELSE 'E2E Tests' END || ' v' || n,
  'Test suite', '22222222-2222-2222-2222-222222222222'::UUID, (SELECT id FROM auth.users LIMIT 1), 'active', 1, (SELECT id FROM auth.users LIMIT 1)
FROM generate_series(1, 50) AS n;

-- STEP 5: Link cases to sets
INSERT INTO test_set_cases (id, set_id, case_id, case_version, sort_order, added_by)
SELECT gen_random_uuid(), s.id, c.id, 1, row_number() OVER (PARTITION BY s.id), (SELECT id FROM auth.users LIMIT 1)
FROM test_sets s CROSS JOIN LATERAL (SELECT id FROM test_cases WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 20) c
WHERE s.program_id = '22222222-2222-2222-2222-222222222222';

-- STEP 6: 100 Cycles
INSERT INTO test_cycles (id, key, name, objective, program_id, owner_id, status, start_date, end_date, environment, is_adhoc, created_by)
SELECT gen_random_uuid(), 'CYC-' || LPAD(n::TEXT, 3, '0'),
  CASE (n % 5) WHEN 0 THEN 'Smoke Test' WHEN 1 THEN 'Sprint Regression' WHEN 2 THEN 'API Test' WHEN 3 THEN 'UAT' ELSE 'Release' END || ' - Run ' || n,
  'Test cycle', '22222222-2222-2222-2222-222222222222'::UUID, (SELECT id FROM auth.users LIMIT 1),
  CASE (n % 4) WHEN 0 THEN 'not_started' WHEN 1 THEN 'active' WHEN 2 THEN 'completed' ELSE 'on_hold' END,
  CURRENT_DATE - (30 - n % 30), CURRENT_DATE + (n % 15),
  CASE (n % 4) WHEN 0 THEN 'development' WHEN 1 THEN 'staging' WHEN 2 THEN 'production' ELSE 'uat' END, false, (SELECT id FROM auth.users LIMIT 1)
FROM generate_series(1, 100) AS n;

-- STEP 7: 1000 Executions
INSERT INTO test_executions (id, test_case_id, test_cycle_id, executed_by, execution_date, status, actual_result, execution_time_seconds, program_id)
SELECT gen_random_uuid(),
  (SELECT id FROM test_cases WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 1),
  (SELECT id FROM test_cycles WHERE program_id = '22222222-2222-2222-2222-222222222222' ORDER BY random() LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1), CURRENT_TIMESTAMP - (random() * 30)::INTEGER * INTERVAL '1 day',
  CASE (n % 5) WHEN 0 THEN 'passed' WHEN 1 THEN 'passed' WHEN 2 THEN 'failed' WHEN 3 THEN 'blocked' ELSE 'not_run' END::test_execution_status,
  CASE (n % 5) WHEN 2 THEN 'Bug found' WHEN 3 THEN 'Blocked' ELSE 'Passed' END, 60 + (random() * 300)::INTEGER, '22222222-2222-2222-2222-222222222222'::UUID
FROM generate_series(1, 1000) AS n;
