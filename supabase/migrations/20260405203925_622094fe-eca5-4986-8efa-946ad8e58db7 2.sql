CREATE TABLE IF NOT EXISTS ai_digest_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_json   JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '4 hours')
);

CREATE INDEX idx_ai_digest_cache_user_expires 
  ON ai_digest_cache(user_id, expires_at DESC);

ALTER TABLE ai_digest_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own digest"
  ON ai_digest_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own digest"
  ON ai_digest_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);