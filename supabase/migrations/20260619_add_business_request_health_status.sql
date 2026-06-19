-- Migration: Add health_status column to business_requests
-- Date: 2026-06-19
-- Purpose: Enable Date Pulse health status computation and storage

-- Add health_status column with enum constraint
ALTER TABLE business_requests
ADD COLUMN health_status TEXT NOT NULL DEFAULT 'Uncommitted'
CHECK (health_status IN ('Uncommitted', 'Committed', 'On Track', 'Delayed', 'At Risk', 'Blocked', 'Delivered'));

-- Add index for filtering by health status
CREATE INDEX idx_br_health_status ON business_requests(health_status);

-- Add column comment for documentation
COMMENT ON COLUMN business_requests.health_status IS
  'Computed delivery health status. One of 7 states: Uncommitted, Committed, On Track, Delayed, At Risk, Blocked, Delivered. Updated when BR or linked work changes.';

-- Seed initial values (set all existing BRs to Uncommitted)
UPDATE business_requests SET health_status = 'Uncommitted' WHERE health_status IS NULL;
