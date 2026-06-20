-- AI-generated business summaries for each deployment, keyed by GitHub Actions run_id
CREATE TABLE IF NOT EXISTS deploy_summaries (
  run_id bigint PRIMARY KEY,
  summary text NOT NULL,
  commit_sha text,
  commit_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE deploy_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read deploy summaries"
  ON deploy_summaries FOR SELECT TO authenticated USING (true);
