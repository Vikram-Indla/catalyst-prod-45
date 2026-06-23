-- Jira Integration RLS Tests
-- Test environment-specific data isolation and role-based access control

-- Test 1: Admin can INSERT/UPDATE/DELETE in jira_project_sync_filters (own environment)
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"admin-uuid","role":"admin"}';

  INSERT INTO jira_project_sync_filters (id, environment, project_key, date_mode, created_at)
  VALUES (gen_random_uuid(), 'staging', 'BAU', 'last_30_days', now());

  SELECT COUNT(*) AS inserted FROM jira_project_sync_filters WHERE project_key = 'BAU' AND environment = 'staging';
  -- Expected: 1
ROLLBACK;

-- Test 2: Non-admin user can SELECT config only (not write)
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"user-uuid","role":"user"}';

  SELECT COUNT(*) FROM jira_sync_mappings WHERE environment = 'staging';
  -- Expected: should succeed (SELECT)

  INSERT INTO jira_sync_mappings (id, environment, mapping_type, jira_value, catalyst_value)
  VALUES (gen_random_uuid(), 'staging', 'issue_type', 'Story', 'Story');
  -- Expected: FAIL (403 - should be blocked by RLS)
ROLLBACK;

-- Test 3: Data strictly environment-scoped (staging vs production)
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"admin-uuid","role":"admin"}';

  -- Insert into staging
  INSERT INTO jira_project_sync_filters (id, environment, project_key, date_mode)
  VALUES (gen_random_uuid(), 'staging', 'BAU', 'last_30_days');

  -- Insert into production
  INSERT INTO jira_project_sync_filters (id, environment, project_key, date_mode)
  VALUES (gen_random_uuid(), 'production', 'BAU', 'last_30_days');

  -- Verify both exist
  SELECT environment, COUNT(*) FROM jira_project_sync_filters WHERE project_key = 'BAU' GROUP BY environment;
  -- Expected: staging = 1, production = 1
ROLLBACK;

-- Test 4: Webhook control is environment-specific singleton
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"admin-uuid","role":"admin"}';

  -- Insert staging webhook control
  INSERT INTO jira_webhook_control (id, environment, listening_enabled)
  VALUES (gen_random_uuid(), 'staging', true)
  ON CONFLICT (environment) DO NOTHING;

  -- Insert production webhook control
  INSERT INTO jira_webhook_control (id, environment, listening_enabled)
  VALUES (gen_random_uuid(), 'production', false)
  ON CONFLICT (environment) DO NOTHING;

  -- Verify each environment has exactly 1 row
  SELECT environment, COUNT(*) FROM jira_webhook_control GROUP BY environment;
  -- Expected: staging = 1, production = 1
ROLLBACK;

-- Test 5: MDT contract is enforced (module_target = 'product')
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"admin-uuid","role":"admin"}';

  -- Try to insert with wrong module_target
  INSERT INTO ph_jira_projects (id, key, name, environment, module_target)
  VALUES (gen_random_uuid(), 'TEST', 'Test Project', 'staging', 'project');
  -- Expected: FAIL (trigger enforces module_target = 'product')
ROLLBACK;

-- Test 6: Audit logs are immutable by non-admin
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"user-uuid","role":"user"}';

  DELETE FROM jira_refresh_data_audit;
  -- Expected: FAIL (403 - delete not allowed)
ROLLBACK;

-- Test 7: jira_sync_mappings UNIQUE constraint per environment
BEGIN;
  SET ROLE authenticated;
  SET request.jwt.claims = '{"sub":"admin-uuid","role":"admin"}';

  INSERT INTO jira_sync_mappings (id, environment, mapping_type, jira_value, catalyst_value)
  VALUES (gen_random_uuid(), 'staging', 'issue_type', 'Story', 'Story');

  INSERT INTO jira_sync_mappings (id, environment, mapping_type, jira_value, catalyst_value)
  VALUES (gen_random_uuid(), 'staging', 'issue_type', 'Story', 'Epic');
  -- Expected: FAIL (UNIQUE constraint: environment, mapping_type, jira_value)
ROLLBACK;
