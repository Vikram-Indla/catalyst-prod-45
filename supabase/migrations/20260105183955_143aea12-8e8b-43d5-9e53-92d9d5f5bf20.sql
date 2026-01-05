-- ============================================================
-- MODULE 2: TEST CASES - SEED DATA (with project_id)
-- ============================================================

-- 1. ADD DEMO FOLDERS (with project_id)
INSERT INTO tm_folders (id, project_id, name, path, depth, sort_order) VALUES
  ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Authentication', 'authentication', 0, 1),
  ('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'User Management', 'user_management', 0, 2),
  ('f0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Dashboard', 'dashboard', 0, 3),
  ('f0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'API', 'api', 0, 4),
  ('f0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Performance', 'performance', 0, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tm_folders (id, project_id, parent_id, name, path, depth, sort_order) VALUES
  ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Login', 'authentication.login', 1, 1),
  ('f1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Registration', 'authentication.registration', 1, 2),
  ('f1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Password Reset', 'authentication.password_reset', 1, 3),
  ('f1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'MFA', 'authentication.mfa', 1, 4),
  ('f1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'Profile', 'user_management.profile', 1, 1),
  ('f1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'Permissions', 'user_management.permissions', 1, 2),
  ('f1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'REST Endpoints', 'api.rest_endpoints', 1, 1),
  ('f1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'GraphQL', 'api.graphql', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- 2. UPDATE EXISTING CASES WITH FOLDERS
UPDATE tm_test_cases SET folder_id = 'f1000000-0000-0000-0000-000000000001' WHERE case_key IN ('TC-001', 'TC-002');
UPDATE tm_test_cases SET folder_id = 'f1000000-0000-0000-0000-000000000002' WHERE case_key = 'TC-003';
UPDATE tm_test_cases SET folder_id = 'f1000000-0000-0000-0000-000000000003' WHERE case_key = 'TC-004';
UPDATE tm_test_cases SET folder_id = 'f0000000-0000-0000-0000-000000000005' WHERE case_key = 'TC-005';
UPDATE tm_test_cases SET folder_id = 'f1000000-0000-0000-0000-000000000005' WHERE case_key = 'TC-006';
UPDATE tm_test_cases SET folder_id = 'f0000000-0000-0000-0000-000000000001' WHERE case_key = 'TC-007';
UPDATE tm_test_cases SET folder_id = 'f1000000-0000-0000-0000-000000000004' WHERE case_key = 'TC-008';
UPDATE tm_test_cases SET folder_id = 'f0000000-0000-0000-0000-000000000003' WHERE case_key = 'TC-009';
UPDATE tm_test_cases SET folder_id = 'f0000000-0000-0000-0000-000000000004' WHERE case_key = 'TC-010';

-- 3. REFRESH FOLDER COUNTS
UPDATE tm_folders f SET case_count = (SELECT COUNT(*) FROM tm_test_cases tc WHERE tc.folder_id = f.id);

-- 4. ADD TEST STEPS (using test_case_id)
INSERT INTO tm_test_steps (test_case_id, step_number, action, expected_result, test_data) VALUES
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-001'), 1, 'Navigate to login page', 'Login form is displayed with email and password fields', 'URL: /login'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-001'), 2, 'Enter valid email address', 'Email is accepted and validated', 'Email: test@example.com'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-001'), 3, 'Enter valid password', 'Password is masked and accepted', 'Password: ValidPass123!'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-001'), 4, 'Click Login button', 'User is redirected to dashboard', NULL),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-002'), 1, 'Navigate to login page', 'Login form is displayed', 'URL: /login'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-002'), 2, 'Enter invalid password', 'Password field accepts input', 'Password: wrong123'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-002'), 3, 'Click Login button', 'Error message shows invalid credentials', NULL),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-003'), 1, 'Navigate to registration page', 'Registration form is displayed', 'URL: /register'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-003'), 2, 'Fill in all required fields', 'Form validates each field', 'Name: Test User, Email: newuser@test.com'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-003'), 3, 'Submit registration form', 'Success message and verification email sent', NULL),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-006'), 1, 'Navigate to Profile Settings', 'Profile form loads with current user data', 'URL: /settings/profile'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-006'), 2, 'Modify first name field', 'Field accepts new value', 'New value: UpdatedName'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-006'), 3, 'Click Save Changes', 'Success toast appears, data persisted', NULL),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-008'), 1, 'Navigate to Security Settings', 'MFA section visible with Enable button', 'URL: /settings/security'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-008'), 2, 'Click Enable MFA', 'QR code and secret key displayed', NULL),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-008'), 3, 'Scan QR with authenticator app', 'App shows 6-digit code', 'App: Google Authenticator'),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-008'), 4, 'Enter verification code', 'Code field accepts 6 digits', NULL),
  ((SELECT id FROM tm_test_cases WHERE case_key = 'TC-008'), 5, 'Click Verify', 'MFA enabled, recovery codes shown', NULL)
ON CONFLICT DO NOTHING;