
-- Add UUID id column to ph_issues for board integration
ALTER TABLE ph_issues ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
-- Populate existing rows
UPDATE ph_issues SET id = gen_random_uuid() WHERE id IS NULL;
-- Make it NOT NULL
ALTER TABLE ph_issues ALTER COLUMN id SET NOT NULL;
-- Add unique constraint
ALTER TABLE ph_issues ADD CONSTRAINT ph_issues_id_unique UNIQUE (id);
