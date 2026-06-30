-- CAT-BOARDS-REDESIGN-20260701-001
-- Add is_default and primary_work_item_type to boards table.
-- is_default = system-provisioned "Primary Board" (non-deletable by users).
-- primary_work_item_type = canonical work item for this board context (e.g. 'Story', 'Business Request').

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS primary_work_item_type TEXT;

-- Enforce at most one default board per project (soft-deleted boards excluded).
CREATE UNIQUE INDEX IF NOT EXISTS boards_one_default_per_project
  ON boards (project_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;
