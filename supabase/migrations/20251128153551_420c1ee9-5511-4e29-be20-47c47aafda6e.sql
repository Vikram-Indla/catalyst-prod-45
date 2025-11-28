
-- Add owner_name field to epics for display purposes (especially useful for seed data)
ALTER TABLE epics ADD COLUMN IF NOT EXISTS owner_name TEXT;

COMMENT ON COLUMN epics.owner_name IS 'Display name for epic owner. Used when owner_id profile is not available.';
