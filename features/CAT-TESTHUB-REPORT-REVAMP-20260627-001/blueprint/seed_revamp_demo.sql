-- SEED: Reporting Revamp demo data (D-007 / G-001 APPROVED)
-- Target: cyij (catalyst-staging / dev) ONLY. Anchor: Senaei BAU.
-- Tag: custom_fields.seed_batch='REVAMP-DEMO-20260627'; keys RVTC-/RVCYC-/RVDF-.
-- Rollback: blueprint/rollback_revamp_demo.sql
BEGIN;

-- 0) Mirror the real Senaei BAU project id into tm_projects so tm.project_id == ph_projects.id (joins align)
INSERT INTO tm_projects (id, key, name, description, settings, created_at, updated_at)
VALUES ('84f91caf-7511-470a-9a26-3e52e66258bf'::uuid, 'SENAEI-BAU', 'Senaei BAU',
        'Mirrors ph_projects Senaei BAU for reporting demo (seed)',
        jsonb_build_object('seed_batch','REVAMP-DEMO-20260627'), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 1) Test cases linked (logically) to real Senaei BAU stories
INSERT INTO tm_test_cases (id, project_id, case_key, title, status, priority_id, case_type_id, assigned_to, custom_fields, created_at)
SELECT gen_random_uuid(),
       '84f91caf-7511-470a-9a26-3e52e66258bf'::uuid,
       v.case_key, v.title, v.cstatus::tm_case_status, pr.id, ct.id, v.tester::uuid,
       jsonb_build_object('seed_batch','REVAMP-DEMO-20260627','story',v.story_key,'demo_run',v.run),
       now()
FROM (VALUES
  ('RVTC-001','BAU-6102','Verify Product Details survey update rules','approved','High','Functional','passed','9537a670-b73e-4905-9835-b68085478cbc'),
  ('RVTC-002','BAU-6039','Standard Incentive CR - modify existing flow','approved','Medium','Functional','passed','9d3d6a1d-825c-4dd2-8cb9-82ab57a78c5b'),
  ('RVTC-003','BAU-6075','MOI INT - license info + product validation','ready','High','Functional','failed','6bbd0863-2736-42e0-aa9b-c98e946c6fd4'),
  ('RVTC-004','BAU-6060','Update product details survey - tooltip copy','approved','Low','Functional','passed','13860d8f-2443-4925-a484-3797cf1b0d67'),
  ('RVTC-005','BAU-6017','Auto Approval Rules Management - API checks','ready','High','API','blocked','cb3b9d74-5b62-4b4d-9f0d-0cc7bbc99798'),
  ('RVTC-006','BAU-6019','Auto Approval Traceability and Reporting','approved','Medium','Functional','passed','9537a670-b73e-4905-9835-b68085478cbc'),
  ('RVTC-007','BAU-6018','Industrial Auditing Auto Approval Engine','ready','Critical','Functional','failed','9d3d6a1d-825c-4dd2-8cb9-82ab57a78c5b'),
  ('RVTC-008','BAU-6028','Returned Requests Transition - perf','approved','Medium','Performance','passed','6bbd0863-2736-42e0-aa9b-c98e946c6fd4'),
  ('RVTC-009','BAU-6027','Existing Requests Handling - regression','ready','High','Functional','not_run','13860d8f-2443-4925-a484-3797cf1b0d67'),
  ('RVTC-010','BAU-5967','Raw materials Challenges - submit solution','approved','Low','Functional','passed','cb3b9d74-5b62-4b4d-9f0d-0cc7bbc99798'),
  ('RVTC-011','BAU-5966','Raw materials Challenges - edit / cancel','ready','Medium','Functional','not_run','9537a670-b73e-4905-9835-b68085478cbc'),
  ('RVTC-012','BAU-5965','Raw material Challenges - challenges screen','approved','High','Security','passed','9d3d6a1d-825c-4dd2-8cb9-82ab57a78c5b'),
  ('RVTC-013','BAU-6003','Adding supporting doc + feasibility study','ready','High','Functional','failed','6bbd0863-2736-42e0-aa9b-c98e946c6fd4'),
  ('RVTC-014','BAU-75','Individuals Dashboard - smoke','approved','Medium','Functional','passed','13860d8f-2443-4925-a484-3797cf1b0d67')
) AS v(case_key, story_key, title, cstatus, prio, ctype, run, tester)
JOIN tm_case_priorities pr ON pr.name = v.prio
JOIN tm_case_types ct ON ct.name = v.ctype;

-- 2) Trace-To links: each seeded case -> its real ph_issues story
INSERT INTO tm_requirement_links (id, test_case_id, requirement_type, requirement_id, external_key, coverage_status, created_at)
SELECT gen_random_uuid(), c.id, 'story', i.id, i.issue_key, 'full', now()
FROM tm_test_cases c
JOIN ph_issues i ON i.issue_key = c.custom_fields->>'story'
WHERE c.custom_fields->>'seed_batch' = 'REVAMP-DEMO-20260627';

-- 3) Two cycles
INSERT INTO tm_test_cycles (id, project_id, cycle_key, name, created_at)
VALUES
 (gen_random_uuid(), '84f91caf-7511-470a-9a26-3e52e66258bf'::uuid, 'RVCYC-001', 'Senaei BAU - Sprint QA (seed)', now()),
 (gen_random_uuid(), '84f91caf-7511-470a-9a26-3e52e66258bf'::uuid, 'RVCYC-002', 'Senaei BAU - Regression (seed)', now());

-- 4) Cycle scope: all 14 cases into Sprint QA cycle, current_status = demo_run
INSERT INTO tm_cycle_scope (id, cycle_id, test_case_id, assigned_to, current_status, added_at, updated_at)
SELECT gen_random_uuid(), cy.id, c.id, c.assigned_to, (c.custom_fields->>'demo_run')::tm_execution_status, now(), now()
FROM tm_test_cases c
JOIN tm_test_cycles cy ON cy.cycle_key = 'RVCYC-001'
WHERE c.custom_fields->>'seed_batch' = 'REVAMP-DEMO-20260627';

-- 5) Runs for executed cases (skip not_run)
INSERT INTO tm_test_runs (id, cycle_scope_id, status, executed_by, created_at)
SELECT gen_random_uuid(), s.id, s.current_status, s.assigned_to, now()
FROM tm_cycle_scope s
JOIN tm_test_cases c ON c.id = s.test_case_id
JOIN tm_test_cycles cy ON cy.id = s.cycle_id AND cy.cycle_key = 'RVCYC-001'
WHERE c.custom_fields->>'seed_batch' = 'REVAMP-DEMO-20260627'
  AND s.current_status <> 'not_run';

-- 6) Defects for failed runs (tm_defects, test-linked) — Hybrid model detail (D-005)
INSERT INTO tm_defects (id, project_id, defect_key, title, severity, status, source_test_case_id, source_test_run_id, reporter_id, sprint, created_at)
SELECT gen_random_uuid(), '84f91caf-7511-470a-9a26-3e52e66258bf'::uuid,
       'RVDF-' || lpad((row_number() over (order by c.case_key))::text,3,'0'),
       'Failure in ' || c.title,
       (CASE WHEN c.priority_id = (select id from tm_case_priorities where name='Critical') THEN 'critical' ELSE 'major' END)::tm_defect_severity,
       'open'::tm_defect_status,
       c.id, r.id, c.assigned_to,
       c.custom_fields->>'story',
       now()
FROM tm_test_cases c
JOIN tm_cycle_scope s ON s.test_case_id = c.id
JOIN tm_test_runs r ON r.cycle_scope_id = s.id
WHERE c.custom_fields->>'seed_batch' = 'REVAMP-DEMO-20260627'
  AND r.status = 'failed';

COMMIT;

-- summary
SELECT 'cases' k, count(*) n FROM tm_test_cases WHERE custom_fields->>'seed_batch'='REVAMP-DEMO-20260627'
UNION ALL SELECT 'req_links', count(*) FROM tm_requirement_links WHERE external_key LIKE 'BAU-%' AND test_case_id IN (SELECT id FROM tm_test_cases WHERE custom_fields->>'seed_batch'='REVAMP-DEMO-20260627')
UNION ALL SELECT 'cycles', count(*) FROM tm_test_cycles WHERE cycle_key LIKE 'RVCYC-%'
UNION ALL SELECT 'scope', count(*) FROM tm_cycle_scope s JOIN tm_test_cases c ON c.id=s.test_case_id WHERE c.custom_fields->>'seed_batch'='REVAMP-DEMO-20260627'
UNION ALL SELECT 'runs', count(*) FROM tm_test_runs r JOIN tm_cycle_scope s ON s.id=r.cycle_scope_id JOIN tm_test_cases c ON c.id=s.test_case_id WHERE c.custom_fields->>'seed_batch'='REVAMP-DEMO-20260627'
UNION ALL SELECT 'defects', count(*) FROM tm_defects WHERE defect_key LIKE 'RVDF-%';
