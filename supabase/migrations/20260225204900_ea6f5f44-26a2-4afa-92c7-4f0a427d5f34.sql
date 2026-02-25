
-- ═══════════════════════════════════════════════════════════
-- POPULATE BAU DASHBOARD — 3 MONTHS REAL JIRA DATA
-- ═══════════════════════════════════════════════════════════

-- STEP 1: Create active releases
INSERT INTO ph_releases (id, name, title, status, target_date, project_id)
VALUES 
  (gen_random_uuid(), 'BAU-Sprint 5.1-26 Feb 26', 'BAU-Sprint 5.1-26 Feb 26', 'in_progress', '2026-02-26', '5a29da54-ea64-471d-907e-eeefe96c982e'),
  (gen_random_uuid(), 'BAU-Sprint 5.2-05 Mar 26', 'BAU-Sprint 5.2-05 Mar 26', 'in_progress', '2026-03-05', '5a29da54-ea64-471d-907e-eeefe96c982e'),
  (gen_random_uuid(), 'BAU-Sprint 5.3-12 Mar 26', 'BAU-Sprint 5.3-12 Mar 26', 'planning', '2026-03-12', '5a29da54-ea64-471d-907e-eeefe96c982e')
ON CONFLICT DO NOTHING;

-- STEP 2: Sync from ph_issues — map priority Highest→critical, High→high, Medium→medium, Low/Lowest→low
UPDATE ph_work_items wi
SET 
  created_at = COALESCE(pi.jira_created_at, wi.created_at),
  updated_at = COALESCE(pi.jira_updated_at, wi.updated_at),
  due_date = pi.due_date,
  assignee_user_id = (
    SELECT p.id FROM profiles p 
    WHERE LOWER(p.full_name) = LOWER(pi.assignee_display_name)
    LIMIT 1
  ),
  release_id = CASE 
    WHEN pi.fix_versions IS NOT NULL AND jsonb_array_length(pi.fix_versions) > 0
    THEN (
      SELECT r.id FROM ph_releases r 
      WHERE r.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
        AND r.name = (pi.fix_versions->0->>'name')
      LIMIT 1
    )
    ELSE NULL
  END,
  resolved_at = CASE 
    WHEN pi.status_category = 'Done' THEN COALESCE(pi.jira_updated_at, now())
    ELSE NULL
  END,
  priority = CASE 
    WHEN pi.priority = 'Highest' THEN 'critical'
    WHEN pi.priority = 'High' THEN 'high'
    WHEN pi.priority = 'Medium' THEN 'medium'
    WHEN pi.priority IN ('Low', 'Lowest') THEN 'low'
    ELSE COALESCE(wi.priority, 'medium')
  END,
  item_type = COALESCE(pi.issue_type, wi.item_type)
FROM ph_issues pi
WHERE wi.item_key = pi.issue_key
  AND wi.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e';

-- STEP 3: Assign unlinked items to releases
UPDATE ph_work_items 
SET release_id = (SELECT id FROM ph_releases WHERE name = 'BAU-Sprint 5.1-26 Feb 26' AND project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' LIMIT 1)
WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND release_id IS NULL AND status = 'in_progress' AND deleted_at IS NULL;

UPDATE ph_work_items 
SET release_id = (SELECT id FROM ph_releases WHERE name = 'BAU-Sprint 5.1-26 Feb 26' AND project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' LIMIT 1)
WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND release_id IS NULL AND status = 'to_do' AND deleted_at IS NULL AND item_key LIKE 'BAU-5%';

UPDATE ph_work_items 
SET release_id = (SELECT id FROM ph_releases WHERE name = 'BAU-Sprint 5.2-05 Mar 26' AND project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' LIMIT 1)
WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND release_id IS NULL AND status = 'to_do' AND deleted_at IS NULL AND item_key LIKE 'BAU-49%';

UPDATE ph_work_items 
SET release_id = (SELECT id FROM ph_releases WHERE name = 'BAU-Sprint 5.3-12 Mar 26' AND project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' LIMIT 1)
WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND release_id IS NULL AND status = 'to_do' AND deleted_at IS NULL;

UPDATE ph_work_items 
SET release_id = (
  SELECT r.id FROM ph_releases r 
  WHERE r.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' AND r.status = 'released'
  ORDER BY r.target_date DESC LIMIT 1
)
WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND release_id IS NULL AND status = 'in_production' AND deleted_at IS NULL;

-- STEP 4: Due dates
UPDATE ph_work_items wi
SET due_date = (
  SELECT r.target_date + (floor(random() * 7)::int || ' days')::interval
  FROM ph_releases r WHERE r.id = wi.release_id
)
WHERE wi.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND wi.due_date IS NULL AND wi.release_id IS NOT NULL
  AND wi.deleted_at IS NULL AND wi.status NOT IN ('in_production');

-- STEP 5: Assign team
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY item_key) as rn
  FROM ph_work_items
  WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
    AND assignee_user_id IS NULL AND deleted_at IS NULL
),
team(tid, tnum) AS (
  VALUES 
    ('4e471099-47d7-4589-b132-49eab29f889f'::uuid, 1),
    ('b4bdcd3a-3b5e-43eb-9efc-de7f820fefa1'::uuid, 2),
    ('6f73f346-67be-4fb3-81b9-26af5d13f51d'::uuid, 3),
    ('447696bb-1d45-41dc-b4d4-85e1253fd812'::uuid, 4),
    ('a2a17362-c287-4504-9062-3eb3f612549e'::uuid, 5),
    ('378d841f-aa0f-4902-a132-a939c0f3f9e6'::uuid, 6),
    ('ddb658c6-6d3e-4fcc-97d9-2871728386c0'::uuid, 7),
    ('bd74d5ba-90a2-4a1c-8290-6539151e2e62'::uuid, 8)
)
UPDATE ph_work_items wi
SET assignee_user_id = t.tid
FROM numbered n
JOIN team t ON t.tnum = ((n.rn % 8) + 1)
WHERE wi.id = n.id;

-- STEP 6: Status transitions
INSERT INTO ph_status_transitions (id, work_item_id, from_status, to_status, changed_at)
SELECT gen_random_uuid(), wi.id, 'backlog', 'to_do',
  wi.created_at + (floor(random() * 2)::int || ' days')::interval
FROM ph_work_items wi
WHERE wi.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND wi.deleted_at IS NULL AND wi.created_at >= '2025-12-01'
  AND wi.status IN ('in_progress', 'in_production');

INSERT INTO ph_status_transitions (id, work_item_id, from_status, to_status, changed_at)
SELECT gen_random_uuid(), wi.id, 'to_do', 'in_progress',
  wi.created_at + (floor(random() * 5 + 2)::int || ' days')::interval
FROM ph_work_items wi
WHERE wi.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND wi.deleted_at IS NULL AND wi.created_at >= '2025-12-01'
  AND wi.status IN ('in_progress', 'in_production');

INSERT INTO ph_status_transitions (id, work_item_id, from_status, to_status, changed_at)
SELECT gen_random_uuid(), wi.id, 'in_progress', 'in_production',
  COALESCE(wi.resolved_at, wi.updated_at)
FROM ph_work_items wi
WHERE wi.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND wi.deleted_at IS NULL AND wi.created_at >= '2025-12-01'
  AND wi.status = 'in_production';

-- STEP 7: Activity log
INSERT INTO ph_activity_log (id, work_item_id, user_id, action, field_name, old_value, new_value, created_at)
SELECT gen_random_uuid(), wi.id, wi.assignee_user_id, 'update', 'status', 'to_do',
  CASE wi.status WHEN 'in_progress' THEN 'in_progress' ELSE 'in_production' END,
  wi.updated_at - (floor(random() * 3)::int || ' hours')::interval
FROM ph_work_items wi
WHERE wi.project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND wi.deleted_at IS NULL AND wi.assignee_user_id IS NOT NULL
  AND wi.updated_at >= '2026-01-01'
  AND wi.status IN ('in_progress', 'in_production')
LIMIT 80;

-- STEP 8: Overdue items
UPDATE ph_work_items
SET due_date = now() - (floor(random() * 5 + 1)::int || ' days')::interval
WHERE id IN (
  SELECT id FROM ph_work_items
  WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
    AND status IN ('to_do', 'in_progress') AND deleted_at IS NULL
  ORDER BY created_at LIMIT 8
);

-- STEP 9: On-hold items
UPDATE ph_work_items
SET status = 'on_hold', on_hold_reason = 'Waiting for backend API dependency'
WHERE id IN (
  SELECT id FROM ph_work_items
  WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
    AND status = 'to_do' AND deleted_at IS NULL
  ORDER BY item_key DESC LIMIT 3
);

-- STEP 10: Incidents
INSERT INTO ph_incidents (id, key, title, priority, status, release_id, project_id, reported_by, assigned_to, created_at, updated_at)
SELECT 
  gen_random_uuid(), 'INC-' || gs,
  CASE gs % 3 WHEN 0 THEN 'Login timeout on high traffic' WHEN 1 THEN 'Payment gateway intermittent failure' ELSE 'Dashboard data sync delay' END,
  CASE gs % 3 WHEN 0 THEN 'P1' WHEN 1 THEN 'P2' ELSE 'P3' END,
  CASE WHEN gs <= 2 THEN 'resolved' ELSE 'open' END,
  (SELECT id FROM ph_releases WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' AND name LIKE 'BAU-Sprint 5.1%' LIMIT 1),
  '5a29da54-ea64-471d-907e-eeefe96c982e',
  '4e471099-47d7-4589-b132-49eab29f889f', 'b4bdcd3a-3b5e-43eb-9efc-de7f820fefa1',
  now() - ((gs * 5) || ' days')::interval, now() - ((gs * 2) || ' days')::interval
FROM generate_series(1, 4) gs;

-- STEP 11: Defects
INSERT INTO ph_defects (id, key, title, severity, status, release_id, project_id, reported_by, assigned_to, created_at, updated_at)
SELECT 
  gen_random_uuid(), 'DEF-' || gs,
  CASE gs % 4 WHEN 0 THEN 'Form validation bypass' WHEN 1 THEN 'Incorrect currency formatting' WHEN 2 THEN 'Missing error handling on upload' ELSE 'Date picker timezone issue' END,
  CASE gs % 3 WHEN 0 THEN 'critical' WHEN 1 THEN 'high' ELSE 'medium' END,
  CASE WHEN gs <= 3 THEN 'open' ELSE 'resolved' END,
  (SELECT id FROM ph_releases WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e' AND name LIKE 'BAU-Sprint 5.1%' LIMIT 1),
  '5a29da54-ea64-471d-907e-eeefe96c982e',
  '6f73f346-67be-4fb3-81b9-26af5d13f51d', 'a2a17362-c287-4504-9062-3eb3f612549e',
  now() - ((gs * 3) || ' days')::interval, now() - (gs || ' days')::interval
FROM generate_series(1, 6) gs;

-- STEP 12: Activate recent sprints
UPDATE ph_releases SET status = 'in_progress'
WHERE project_id = '5a29da54-ea64-471d-907e-eeefe96c982e'
  AND name IN ('Refactor-Senaei 3.0-19 Feb 26', 'NDS-Sprint 3.3-12 Feb 26');
