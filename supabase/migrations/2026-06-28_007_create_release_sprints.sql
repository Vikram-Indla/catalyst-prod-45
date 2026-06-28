-- Migration: Create/formalize release_sprints junction table
-- Purpose: Link releases to sprints (many-to-many, cross-project)

BEGIN;

CREATE TABLE IF NOT EXISTS release_sprints (
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,

  artifact_count INTEGER,
  -- Cached count of stories from this sprint in the release

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (release_id, sprint_id)
);

COMMENT ON TABLE release_sprints IS
  'Junction table linking Releases to Sprints. ' ||
  'One release can include sprints from multiple projects. ' ||
  'artifact_count is a cached denormalization of story count.';

CREATE INDEX IF NOT EXISTS idx_release_sprints_release_id ON release_sprints(release_id);
CREATE INDEX IF NOT EXISTS idx_release_sprints_sprint_id ON release_sprints(sprint_id);

COMMIT;
