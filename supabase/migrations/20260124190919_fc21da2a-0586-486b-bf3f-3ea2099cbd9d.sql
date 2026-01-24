-- ============================================================================
-- Test Cycle Lifecycle Extension - Step 1: Add Enum Values
-- ============================================================================

-- Add new enum values to tm_cycle_status
ALTER TYPE tm_cycle_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE tm_cycle_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE tm_cycle_status ADD VALUE IF NOT EXISTS 'paused';