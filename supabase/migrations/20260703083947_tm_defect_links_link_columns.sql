-- CAT-TESTHUB-PROD-20260703-001 P0-S7 (D-REQ-3 default confirmed by probe P0.2)
-- useCreateDefect's auto-link chain writes link_type/linked_id/entity_label/
-- link_source, none of which existed on tm_defect_links — every defect create
-- with a cycle/run context failed. Additive columns; rollback = DROP COLUMN.

ALTER TABLE tm_defect_links
  ADD COLUMN IF NOT EXISTS link_type TEXT,
  ADD COLUMN IF NOT EXISTS linked_id UUID,
  ADD COLUMN IF NOT EXISTS entity_label TEXT,
  ADD COLUMN IF NOT EXISTS link_source TEXT;

COMMENT ON COLUMN tm_defect_links.link_type IS 'test_run | test_cycle | test_plan | release | requirement (auto-link taxonomy)';
COMMENT ON COLUMN tm_defect_links.link_source IS 'auto_execution | manual';

CREATE INDEX IF NOT EXISTS idx_tm_defect_links_linked_id ON tm_defect_links (linked_id);
CREATE INDEX IF NOT EXISTS idx_tm_defect_links_defect_type ON tm_defect_links (defect_id, link_type);
