-- Drop the FK from board_status_mappings.status_id → catalyst_workflow_statuses.
--
-- board_status_mappings is used to map Jira status names (from ph_issues.status)
-- to board columns. Jira statuses are not a subset of catalyst_workflow_statuses,
-- so the FK prevents seeding rows for BAU statuses that have no counterpart in
-- catalyst_workflow_statuses (e.g. "Awaiting Info", "BETA READY", "Closed", etc.).
--
-- The status_id column is retained as uuid NOT NULL for row identity purposes;
-- seeding now uses crypto.randomUUID() (client) or gen_random_uuid() (server).
-- The status_name column remains the authoritative lookup key in KanbanBoardPage.

ALTER TABLE board_status_mappings
  DROP CONSTRAINT IF EXISTS board_status_mappings_status_id_fkey;
