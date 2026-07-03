-- CAT-REPORTS-HUB-20260703-001 gap closure S2.2
-- Restore tm_ai_usage_log (dropped in 20260628170000 deadwood sweep while empty).
-- The report-insights edge function logs Caty narrative usage here best-effort
-- via service role; the drop silently disabled that logging.
-- DDL identical to the original (20260104074712) + original RLS (20260104074944).

CREATE TABLE IF NOT EXISTS tm_ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES tm_projects(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL,
  model VARCHAR(50),
  tokens_used INTEGER,
  request_data JSONB,
  response_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tm_ai_usage_log_created_at_idx ON tm_ai_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS tm_ai_usage_log_feature_idx ON tm_ai_usage_log (feature);

ALTER TABLE tm_ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tm_ai_usage_log_select ON tm_ai_usage_log;
CREATE POLICY tm_ai_usage_log_select ON tm_ai_usage_log FOR SELECT
  USING ((user_id = auth.uid() OR tm_user_has_access(auth.uid(), project_id)));

DROP POLICY IF EXISTS tm_ai_usage_log_insert ON tm_ai_usage_log;
CREATE POLICY tm_ai_usage_log_insert ON tm_ai_usage_log FOR INSERT
  WITH CHECK (user_id = auth.uid());
-- Edge function inserts with the service role (bypasses RLS); no anon path.
