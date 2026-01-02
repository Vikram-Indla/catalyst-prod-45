-- Add date columns to resource_allocations for time-boxed booking
ALTER TABLE resource_allocations 
ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 months');

-- Remove the existing unique constraint (if any)
ALTER TABLE resource_allocations 
DROP CONSTRAINT IF EXISTS resource_allocations_resource_id_assignment_id_key;

-- Add new unique constraint that includes dates (allows multiple allocations per resource-assignment with different date ranges)
ALTER TABLE resource_allocations
ADD CONSTRAINT resource_allocations_unique_period 
UNIQUE (resource_id, assignment_id, start_date, end_date);

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates 
ON resource_allocations (start_date, end_date);