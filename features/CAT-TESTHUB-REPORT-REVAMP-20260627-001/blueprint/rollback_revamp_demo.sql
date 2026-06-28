-- ROLLBACK seed REVAMP-DEMO-20260627 (cyij dev). Reverse FK order.
BEGIN;
DELETE FROM tm_defects WHERE defect_key LIKE 'RVDF-%';
DELETE FROM tm_test_runs r USING tm_cycle_scope s, tm_test_cases c
  WHERE r.cycle_scope_id=s.id AND s.test_case_id=c.id AND c.custom_fields->>'seed_batch'='REVAMP-DEMO-20260627';
DELETE FROM tm_cycle_scope s USING tm_test_cases c
  WHERE s.test_case_id=c.id AND c.custom_fields->>'seed_batch'='REVAMP-DEMO-20260627';
DELETE FROM tm_requirement_links rl USING tm_test_cases c
  WHERE rl.test_case_id=c.id AND c.custom_fields->>'seed_batch'='REVAMP-DEMO-20260627';
DELETE FROM tm_test_cycles WHERE cycle_key LIKE 'RVCYC-%';
DELETE FROM tm_test_cases WHERE custom_fields->>'seed_batch'='REVAMP-DEMO-20260627';
DELETE FROM tm_projects WHERE settings->>'seed_batch'='REVAMP-DEMO-20260627';
COMMIT;
