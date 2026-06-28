-- Migration: Create release_artifacts polymorphic table
-- Purpose: Hold all artifact types (BR, Feature, Epic, Incident, Story)

BEGIN;

CREATE TABLE IF NOT EXISTS release_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,

  artifact_type VARCHAR(50) NOT NULL,
  -- Enum: 'business_request' | 'feature' | 'epic' | 'production_incident' | 'story'

  artifact_id UUID NOT NULL,
  -- Polymorphic FK (no direct constraint; resolved via artifact_type)

  artifact_label VARCHAR(255),
  -- Display label for quick access (e.g., "BR-42", "Feature: User Registration")

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(release_id, artifact_type, artifact_id)
);

COMMENT ON TABLE release_artifacts IS
  'Polymorphic table holding all artifacts that ship in a release. ' ||
  'Artifact types: business_request, feature, epic, production_incident, story. ' ||
  'When a BR is 100% complete, the entire BR is added as artifact. ' ||
  'When a BR is partial, individual features/epics are added instead.';

COMMENT ON COLUMN release_artifacts.artifact_type IS
  'Type of artifact. Enum: business_request | feature | epic | production_incident | story';

COMMENT ON COLUMN release_artifacts.artifact_id IS
  'ID of the artifact (polymorphic reference). No direct FK due to multiple target tables.';

COMMENT ON COLUMN release_artifacts.artifact_label IS
  'Human-readable label (e.g., "BR-42: Industrial Marketplace"). ' ||
  'Cached for display; resolve via artifact_type + artifact_id for truth.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_release_artifacts_release_id ON release_artifacts(release_id);
CREATE INDEX IF NOT EXISTS idx_release_artifacts_artifact_type ON release_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_release_artifacts_artifact_id ON release_artifacts(artifact_id);
CREATE INDEX IF NOT EXISTS idx_release_artifacts_artifact_label ON release_artifacts(artifact_label);

COMMIT;
