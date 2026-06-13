-- Drop legacy catalyst_workflow_* tables.
-- All consumers have been migrated to ph_workflow_* (single source of truth).
-- Migration 20260613000001 already migrated process_step data to display names.

-- board_status_mappings.status_id has an FK to catalyst_workflow_statuses.
-- Drop that constraint first so the table can be dropped cleanly.
ALTER TABLE IF EXISTS board_status_mappings
  DROP CONSTRAINT IF EXISTS board_status_mappings_status_id_fkey;

DROP TABLE IF EXISTS catalyst_workflow_transitions;
DROP TABLE IF EXISTS catalyst_workflow_statuses;
DROP TABLE IF EXISTS catalyst_workflow_schemes;
