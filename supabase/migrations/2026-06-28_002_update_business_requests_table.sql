-- Migration: Deprecate planned_quarter and release_id in business_requests
-- Add backup columns to preserve data during transition

BEGIN;

-- Step 1: Add backup columns
ALTER TABLE business_requests
ADD COLUMN IF NOT EXISTS _deprecated_planned_quarter VARCHAR(50),
ADD COLUMN IF NOT EXISTS _deprecated_release_id UUID;

COMMENT ON COLUMN business_requests._deprecated_planned_quarter IS
  'DEPRECATED (2026-06-28). Use business_request_milestone_links instead. ' ||
  'Backup of original planned_quarter value. Remove in Q4 2026.';

COMMENT ON COLUMN business_requests._deprecated_release_id IS
  'DEPRECATED (2026-06-28). Use Release Hub (release_artifacts) for production evidence. ' ||
  'Backup of original release_id value. Remove in Q4 2026.';

-- Step 2: Copy data to backup columns
UPDATE business_requests
SET
  _deprecated_planned_quarter = planned_quarter,
  _deprecated_release_id = release_id
WHERE (planned_quarter IS NOT NULL OR release_id IS NOT NULL)
  AND (_deprecated_planned_quarter IS NULL OR _deprecated_release_id IS NULL);

-- Step 3: Update comments on deprecated columns
COMMENT ON COLUMN business_requests.planned_quarter IS
  'DEPRECATED (2026-06-28). Use business_request_milestone_links instead. ' ||
  'Original value backed up in _deprecated_planned_quarter. Remove in Q4 2026.';

COMMENT ON COLUMN business_requests.release_id IS
  'DEPRECATED (2026-06-28). Use Release Hub (release_artifacts) for production evidence. ' ||
  'Original value backed up in _deprecated_release_id. Remove in Q4 2026.';

-- Step 4: Create index on deprecated columns (for quick lookup during transition)
CREATE INDEX IF NOT EXISTS idx_br_deprecated_planned_quarter ON business_requests(_deprecated_planned_quarter);
CREATE INDEX IF NOT EXISTS idx_br_deprecated_release_id ON business_requests(_deprecated_release_id);

COMMIT;
