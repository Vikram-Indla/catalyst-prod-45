-- Migration: Add milestone linking column to project_epics

BEGIN;

ALTER TABLE project_epics
ADD COLUMN IF NOT EXISTS linked_milestone_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN project_epics.linked_milestone_ids IS
  'Array of Product Milestone UUIDs this epic contributes to. ' ||
  'Used for independent epics not tied to features.';

CREATE INDEX IF NOT EXISTS idx_project_epics_linked_milestone_ids
  ON project_epics USING GIN(linked_milestone_ids);

COMMIT;
