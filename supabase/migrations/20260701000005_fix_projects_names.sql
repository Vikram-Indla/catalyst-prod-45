-- Fix projects.name where it also stores the project key string.
-- These rows exist in both projects and ph_projects; v_project_list branch 1
-- (projects table) wins, so both tables must have correct names.
-- Full names sourced from jira_user_project_perms.project_name (2026-07-01).
UPDATE projects SET name = 'ICP Project'        WHERE key = 'ICP' AND name = key;
UPDATE projects SET name = 'Inspection Project' WHERE key = 'IN'  AND name = key;
UPDATE projects SET name = 'IP Implementation'  WHERE key = 'IP'  AND name = key;
UPDATE projects SET name = 'IR Platform'        WHERE key = 'IRP' AND name = key;
UPDATE projects SET name = 'MIM Website Revamp' WHERE key = 'MWR' AND name = key;
UPDATE projects SET name = 'Tahommena'          WHERE key = 'TAH' AND name = key;
