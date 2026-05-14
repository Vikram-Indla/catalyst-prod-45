-- Add Sensei BAU project to ph_projects if it doesn't exist
-- This project has 25+ work items synced from Jira but was missing from the projects table

INSERT INTO ph_projects (id, key, name, description, department, status, health, created_by)
SELECT 
  gen_random_uuid(),
  'BAU',
  'Sensei BAU',
  'Business As Usual work items synced from Jira',
  'Operations',
  'active',
  'on_track',
  (SELECT id FROM auth.users LIMIT 1)  -- Use any system user as creator
ON CONFLICT (key) DO NOTHING;
