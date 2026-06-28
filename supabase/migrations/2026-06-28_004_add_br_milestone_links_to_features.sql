-- Migration: Add BR and milestone linking columns to project_features

BEGIN;

ALTER TABLE project_features
ADD COLUMN IF NOT EXISTS linked_business_request_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS linked_milestone_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN project_features.linked_business_request_ids IS
  'Array of Business Request UUIDs this feature delivers. ' ||
  'Used to trace feature → BR for roadmap progress calculation.';

COMMENT ON COLUMN project_features.linked_milestone_ids IS
  'Array of Product Milestone UUIDs this feature contributes to. ' ||
  'Derived from linked_business_request_ids via business_request_milestone_links.';

-- Create GIN indexes for array queries
CREATE INDEX IF NOT EXISTS idx_project_features_linked_br_ids
  ON project_features USING GIN(linked_business_request_ids);

CREATE INDEX IF NOT EXISTS idx_project_features_linked_milestone_ids
  ON project_features USING GIN(linked_milestone_ids);

COMMIT;
