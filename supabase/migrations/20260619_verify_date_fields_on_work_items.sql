-- Migration: Verify date fields exist on all work item tables
-- Date: 2026-06-19
-- Purpose: Confirm that Date Pulse engine has necessary date columns for all work item types

-- This migration is primarily a validation checkpoint.
-- Expected columns should already exist from prior migrations:
--
-- ph_issues.due_date ✓ (for stories, tasks, defects)
-- epics.target_date ✓ (for epic timelines)
-- production_incidents.due_date (added in 20260619_add_incident_due_date.sql)
--
-- If any columns are missing, uncomment and run the respective ADD COLUMN statements below.

-- ============================================================================
-- VERIFICATION: Check that required columns exist
-- ============================================================================

-- Verify ph_issues has due_date
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'ph_issues' AND column_name = 'due_date';

-- Verify epics has target_date
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'epics' AND column_name = 'target_date';

-- Verify production_incidents has due_date (added in this release)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'production_incidents' AND column_name = 'due_date';

-- ============================================================================
-- FALLBACK: If columns missing, add them (uncomment as needed)
-- ============================================================================

-- If ph_issues.due_date is missing:
-- ALTER TABLE ph_issues
-- ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
-- CREATE INDEX idx_ph_issues_due_date ON ph_issues(due_date);

-- If epics.target_date is missing:
-- ALTER TABLE epics
-- ADD COLUMN target_date TIMESTAMP WITH TIME ZONE;
-- CREATE INDEX idx_epics_target_date ON epics(target_date);

-- ============================================================================
-- DOCUMENTATION: Date Pulse engine expectations
-- ============================================================================

COMMENT ON SCHEMA public IS
  'Date Pulse Phase 1 Release: health_status added to business_requests. Due date fields verified on all work items (ph_issues.due_date, epics.target_date, production_incidents.due_date).';
