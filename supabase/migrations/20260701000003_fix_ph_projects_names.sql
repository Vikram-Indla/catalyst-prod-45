-- Fix ph_projects.name where it incorrectly stores the project key string.
-- Full names sourced from jira_user_project_perms.project_name (2026-07-01).
UPDATE ph_projects SET name = 'ICP Project'        WHERE key = 'ICP' AND name = key::text;
UPDATE ph_projects SET name = 'Inspection Project' WHERE key = 'IN'  AND name = key::text;
UPDATE ph_projects SET name = 'IP Implementation'  WHERE key = 'IP'  AND name = key::text;
UPDATE ph_projects SET name = 'IR Platform'        WHERE key = 'IRP' AND name = key::text;
UPDATE ph_projects SET name = 'MIM Website Revamp' WHERE key = 'MWR' AND name = key::text;
UPDATE ph_projects SET name = 'Tahommena'          WHERE key = 'TAH' AND name = key::text;
