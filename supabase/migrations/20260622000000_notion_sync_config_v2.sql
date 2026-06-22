-- notion_sync_config v2 — new columns for redesigned sync UI
-- Adds: sync_mode, schedule_time_riyadh, comment_sync_enabled,
--       notify_admins, exclusion_rules, sync_paused, last_comment_count

ALTER TABLE notion_sync_config
  ADD COLUMN IF NOT EXISTS sync_mode             TEXT    NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS schedule_time_riyadh  TEXT    NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS comment_sync_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_admins         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exclusion_rules       JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sync_paused           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_comment_count    INTEGER          DEFAULT 0;

COMMENT ON COLUMN notion_sync_config.sync_mode
  IS 'Sync mode: auto (webhook + scheduled), scheduled, or manual.';
COMMENT ON COLUMN notion_sync_config.schedule_time_riyadh
  IS 'HH:MM in Riyadh time (AST, UTC+3) for the daily scheduled sync.';
COMMENT ON COLUMN notion_sync_config.comment_sync_enabled
  IS 'Whether to sync Notion comments to the activity feed via webhook.';
COMMENT ON COLUMN notion_sync_config.notify_admins
  IS 'Send a notification to all admin users after each sync run completes.';
COMMENT ON COLUMN notion_sync_config.exclusion_rules
  IS 'Array of {field, op, value} rules. Pages matching any rule are skipped.';
COMMENT ON COLUMN notion_sync_config.sync_paused
  IS 'When true, all sync runs (cron + manual) are skipped for this config.';
COMMENT ON COLUMN notion_sync_config.last_comment_count
  IS 'Count of ph_comments with source=notion for this config — updated by webhook handler.';
