-- Migration: Add feature_contributors junction table

-- Contributors junction table (many-to-many: feature <-> users)
CREATE TABLE IF NOT EXISTS feature_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),
  UNIQUE(feature_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_feature_contributors_feature ON feature_contributors(feature_id);
CREATE INDEX idx_feature_contributors_user ON feature_contributors(user_id);

-- Enable RLS
ALTER TABLE feature_contributors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view feature contributors
CREATE POLICY "Users can view feature contributors"
  ON feature_contributors FOR SELECT
  USING (true);

-- Policy: Users can manage feature contributors
CREATE POLICY "Users can manage feature contributors"
  ON feature_contributors FOR ALL
  USING (true);