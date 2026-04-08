ALTER TABLE ai_digest_cache
  ADD COLUMN IF NOT EXISTS has_critical    BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS context_version INTEGER   DEFAULT 2,
  ADD COLUMN IF NOT EXISTS role_persona    TEXT      DEFAULT 'manager';

COMMENT ON COLUMN ai_digest_cache.has_critical
  IS 'True when digest contains critical_now items — edge function sets 30-min TTL';
COMMENT ON COLUMN ai_digest_cache.context_version
  IS '1 = legacy v1 digest, 2 = enriched v2 digest with risk_horizon';
COMMENT ON COLUMN ai_digest_cache.role_persona
  IS 'User role inferred at generation time for display in UI';