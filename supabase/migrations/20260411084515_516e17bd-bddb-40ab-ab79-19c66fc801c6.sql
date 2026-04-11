-- Extend tm_defect_links with polymorphic entity link support
-- Existing columns (defect_id, test_run_id, step_result_id, created_by,
-- created_at) are preserved. No data loss.

ALTER TABLE tm_defect_links
  ADD COLUMN IF NOT EXISTS link_type    TEXT
    CHECK (link_type IN (
      'test_run', 'step_result', 'test_case', 'test_cycle',
      'test_plan', 'requirement', 'release', 'story'
    )),
  ADD COLUMN IF NOT EXISTS linked_id    UUID,
  ADD COLUMN IF NOT EXISTS entity_label TEXT,
  ADD COLUMN IF NOT EXISTS link_source  TEXT
    DEFAULT 'manual'
    CHECK (link_source IN ('auto_execution', 'auto_jira', 'manual'));

-- Backfill existing execution rows so they appear in Linked Items tab
UPDATE tm_defect_links
SET
  link_type    = 'test_run',
  linked_id    = test_run_id,
  link_source  = 'auto_execution'
WHERE test_run_id IS NOT NULL
  AND link_type IS NULL;

-- Index for fast defect → links query
CREATE INDEX IF NOT EXISTS idx_tm_defect_links_defect_link_type
  ON tm_defect_links(defect_id, link_type);