-- Activity Log for Command Center
CREATE TABLE IF NOT EXISTS tm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID,
  user_name TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_key TEXT,
  entity_title TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tm_activity_created ON tm_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE tm_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Allow all on tm_activity_log" ON tm_activity_log FOR ALL USING (true);