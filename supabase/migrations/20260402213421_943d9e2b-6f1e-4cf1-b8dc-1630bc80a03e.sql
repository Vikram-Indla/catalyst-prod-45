ALTER TABLE ph_projects DROP CONSTRAINT ph_projects_status_check;
ALTER TABLE ph_projects ADD CONSTRAINT ph_projects_status_check CHECK (status::text = ANY (ARRAY['active', 'on_hold', 'completed', 'archived', 'planning']));
UPDATE ph_projects SET status = 'planning' WHERE key = 'DATA';
UPDATE ph_projects SET status = 'on_hold' WHERE key = 'IN';