-- Add assigned_to column for cycle ownership and environment as string
ALTER TABLE tm_test_cycles
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS environment character varying(50) DEFAULT 'staging';

-- Add comment for documentation
COMMENT ON COLUMN tm_test_cycles.assigned_to IS 'User assigned to lead/own this test cycle';
COMMENT ON COLUMN tm_test_cycles.environment IS 'Environment where cycle runs: dev, staging, uat, prod';

-- Update existing cycles with release_id from seed data if needed
UPDATE tm_test_cycles 
SET environment = 'staging' 
WHERE environment IS NULL;

-- Link existing seed cycles to releases
UPDATE tm_test_cycles
SET release_id = '70000000-0001-0001-0001-000000000001'
WHERE release_id IS NULL AND status IN ('in_progress', 'planned');

-- Fix the Sprint naming in existing seed data
UPDATE tm_test_cycles
SET name = 'Cycle 45 - Auth Module'
WHERE name = 'Sprint 45 - Auth Module';