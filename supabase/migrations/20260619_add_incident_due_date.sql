-- Migration: Add due_date and target_resolution_time to production_incidents
-- Date: 2026-06-19
-- Purpose: Enable Date Pulse to track incident resolution timelines

-- Add due_date column for target resolution date
ALTER TABLE production_incidents
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

-- Add target_resolution_time interval for SLA-based calculations
ALTER TABLE production_incidents
ADD COLUMN target_resolution_time INTERVAL;

-- Create index for filtering by due date
CREATE INDEX idx_incident_due_date ON production_incidents(due_date);

-- Add column comments for documentation
COMMENT ON COLUMN production_incidents.due_date IS
  'Target resolution date for the incident. Used by Date Pulse engine for deadline tracking and SLA monitoring.';

COMMENT ON COLUMN production_incidents.target_resolution_time IS
  'SLA target resolution time. Calculated as interval from created_at to due_date. Optional; if null, no SLA enforcement.';
