
-- Seed milestones linked to releases
INSERT INTO milestones (title, milestone_type, end_date, state, release_id)
SELECT 
  m.title, m.milestone_type::milestone_type, m.end_date::timestamptz, m.state, r.id
FROM (VALUES
  ('Code Freeze', 'code_freeze', (CURRENT_DATE + INTERVAL '4 days')::text, 'not_started'),
  ('QA Start', 'qa_start', (CURRENT_DATE + INTERVAL '7 days')::text, 'not_started'),
  ('UAT Complete', 'uat_complete', (CURRENT_DATE + INTERVAL '14 days')::text, 'not_started'),
  ('Feature Complete', 'feature_complete', (CURRENT_DATE + INTERVAL '2 days')::text, 'in_progress'),
  ('Go Live', 'go_live', (CURRENT_DATE + INTERVAL '21 days')::text, 'not_started')
) AS m(title, milestone_type, end_date, state)
CROSS JOIN (SELECT id FROM releases WHERE project_id = '40000000-0001-0001-0001-000000000001' ORDER BY version LIMIT 1) r;
