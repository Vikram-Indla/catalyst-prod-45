
-- Create r360_activity_log (references existing r360_resources and r360_work_items)
CREATE TABLE IF NOT EXISTS r360_activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id    UUID NOT NULL REFERENCES r360_resources(id) ON DELETE CASCADE,
  work_item_id   UUID NOT NULL REFERENCES r360_work_items(id) ON DELETE CASCADE,
  new_status     TEXT NOT NULL,
  event_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE r360_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_activity_read" ON r360_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "r360_activity_write" ON r360_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_r360_activity_resource_time ON r360_activity_log(resource_id, event_time DESC);

-- Create r360_weekly_snapshots
CREATE TABLE IF NOT EXISTS r360_weekly_snapshots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id            UUID NOT NULL REFERENCES r360_resources(id) ON DELETE CASCADE,
  week_number            INTEGER NOT NULL,
  week_start             DATE NOT NULL,
  week_end               DATE NOT NULL,
  total_open             INTEGER NOT NULL DEFAULT 0,
  closed_this_week       INTEGER NOT NULL DEFAULT 0,
  in_review              INTEGER NOT NULL DEFAULT 0,
  pickup_speed_hours     NUMERIC(6,1) NOT NULL DEFAULT 0,
  in_progress_concurrent INTEGER NOT NULL DEFAULT 0,
  closed_of_touched      INTEGER NOT NULL DEFAULT 0,
  total_touched          INTEGER NOT NULL DEFAULT 0,
  avg_cycle_time_days    NUMERIC(4,1) NOT NULL DEFAULT 0,
  oldest_item_age_days   INTEGER NOT NULL DEFAULT 0,
  oldest_item_key        TEXT,
  closure_rate_pct       NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource_id, week_number)
);

ALTER TABLE r360_weekly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r360_snapshots_read" ON r360_weekly_snapshots FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_r360_snapshots_resource_week ON r360_weekly_snapshots(resource_id, week_number DESC);
