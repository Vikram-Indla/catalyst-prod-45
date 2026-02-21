
-- M05 BACKLOG — Add backlog_order column
ALTER TABLE ph_work_items
  ADD COLUMN IF NOT EXISTS backlog_order INTEGER DEFAULT 0;

-- Index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_ph_work_items_backlog
  ON ph_work_items(project_id, backlog_order);

-- Initialize backlog_order for existing items
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id
    ORDER BY created_at ASC
  ) * 10 AS new_order
  FROM ph_work_items
  WHERE backlog_order = 0 OR backlog_order IS NULL
)
UPDATE ph_work_items
SET backlog_order = ordered.new_order
FROM ordered
WHERE ph_work_items.id = ordered.id;
