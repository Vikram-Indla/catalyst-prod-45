-- Add source_label to notion_sync_config
-- Allows each row to carry a human-readable label for the source list UI.
ALTER TABLE notion_sync_config
  ADD COLUMN IF NOT EXISTS source_label TEXT NOT NULL DEFAULT 'Notion database';

COMMENT ON COLUMN notion_sync_config.source_label
  IS 'Short human-readable label for this database source shown in the admin UI source list.';
