
ALTER TABLE r360_ai_profiles
  ADD COLUMN IF NOT EXISTS criticality_raw_score    NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS criticality_percentile   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS criticality_label        TEXT,
  ADD COLUMN IF NOT EXISTS irreplaceability_ratio   NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS peer_comparison          JSONB,
  ADD COLUMN IF NOT EXISTS artifact_breakdown       JSONB,
  ADD COLUMN IF NOT EXISTS criticality_computed_at  TIMESTAMPTZ;
