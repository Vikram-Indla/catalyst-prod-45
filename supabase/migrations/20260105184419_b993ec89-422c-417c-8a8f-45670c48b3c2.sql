-- Add remaining test cases with proper UUID casting
INSERT INTO tm_test_cases (id, project_id, case_key, title, description, status, folder_id, automation_status, preconditions, estimated_time)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-011', 'Profile Update - Basic Info', 'Verify user can update basic profile information', 'approved', 'f1000000-0000-0000-0000-000000000005'::uuid, 'manual', 'User must be logged in', 10),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-012', 'Profile Photo Upload', 'Verify user can upload and crop profile photo', 'approved', 'f1000000-0000-0000-0000-000000000005'::uuid, 'manual', 'User logged in with valid session', 15),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-013', 'Role Assignment', 'Verify admin can assign roles to users', 'approved', 'f1000000-0000-0000-0000-000000000006'::uuid, 'automated', 'Admin user logged in', 20),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-014', 'Permission Inheritance', 'Verify child roles inherit parent permissions', 'ready', 'f1000000-0000-0000-0000-000000000006'::uuid, 'manual', 'Role hierarchy configured', 25),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-015', 'GET /users Endpoint', 'Verify users list API response', 'approved', 'f1000000-0000-0000-0000-000000000007'::uuid, 'automated', 'Valid API key', 5),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-016', 'POST /users Endpoint', 'Verify user creation via API', 'approved', 'f1000000-0000-0000-0000-000000000007'::uuid, 'automated', 'Admin API key', 8),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-017', 'PUT /users/:id Endpoint', 'Verify user update via API', 'approved', 'f1000000-0000-0000-0000-000000000007'::uuid, 'automated', 'Valid user ID', 8),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-018', 'DELETE /users/:id Endpoint', 'Verify user deletion via API', 'draft', 'f1000000-0000-0000-0000-000000000007'::uuid, 'manual', 'Valid user ID, admin key', 10),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-019', 'GraphQL User Query', 'Verify user query returns correct data', 'approved', 'f1000000-0000-0000-0000-000000000008'::uuid, 'automated', 'Valid auth token', 10),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-020', 'MFA TOTP Setup', 'Verify TOTP authenticator setup', 'approved', 'f1000000-0000-0000-0000-000000000004'::uuid, 'manual', 'User logged in, MFA not enabled', 15),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-021', 'MFA Recovery Codes', 'Verify recovery codes work', 'approved', 'f1000000-0000-0000-0000-000000000004'::uuid, 'manual', 'MFA enabled, recovery codes generated', 10),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-022', 'Session Expiry Test', 'Verify session expires after inactivity', 'ready', 'f0000000-0000-0000-0000-000000000001'::uuid, 'automated', 'Active user session', 5),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-023', 'Dashboard Load Perf', 'Verify dashboard loads within 2 seconds', 'approved', 'f0000000-0000-0000-0000-000000000005'::uuid, 'automated', 'User logged in', 3),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-024', 'Concurrent User Load', 'Verify system handles 100 concurrent users', 'draft', 'f0000000-0000-0000-0000-000000000005'::uuid, 'manual', 'Load testing environment', 60),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'TC-025', 'Widget Data Refresh', 'Verify dashboard widgets refresh correctly', 'approved', 'f0000000-0000-0000-0000-000000000003'::uuid, 'manual', 'Dashboard loaded with widgets', 10)
ON CONFLICT DO NOTHING;

-- Refresh folder counts
UPDATE tm_folders f SET case_count = (SELECT COUNT(*) FROM tm_test_cases tc WHERE tc.folder_id = f.id);