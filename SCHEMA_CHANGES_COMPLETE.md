# Complete Schema Changes & Migrations
## Catalyst: Product Milestone + Release Artifacts Architecture

---

## SUMMARY OF CHANGES

| Entity | Action | Current Name | New Name | Notes |
|--------|--------|------------|----------|-------|
| **Product Releases** | RENAME | `product_releases` | `product_milestones` | Repurpose as product-level time containers |
| **Business Requests** | ADD COLUMNS | — | `_deprecated_planned_quarter`, `_deprecated_release_id` | Mark old fields for deprecation |
| **Business Requests** | ADD JUNCTION | — | `business_request_milestone_links` | Link BR to multiple milestones (phases) |
| **Project Features** | ADD COLUMNS | — | `linked_business_request_ids[]`, `linked_milestone_ids[]` | Trace features to BRs and milestones |
| **Project Epics** | ADD COLUMNS | — | `linked_milestone_ids[]` | Trace epics to milestones |
| **Releases** | CLARIFY | `releases` → `rh_releases` (Release Hub) | `releases` | Operational deployment container |
| **Release Artifacts** | CREATE | — | `release_artifacts` | Polymorphic table: BR, Feature, Epic, Incident |
| **Release Sprints** | CREATE | — | `release_sprints` | Link releases to sprints (many-to-many) |

---

## MIGRATION 1: Rename product_releases → product_milestones

```sql
-- Migration: 2026-06-28_001_rename_releases_to_milestones.sql

BEGIN;

-- Step 1: Rename table
ALTER TABLE product_releases RENAME TO product_milestones;

-- Step 2: Update table description
COMMENT ON TABLE product_milestones IS
  'Product-level time-boxed milestone container. ' ||
  'Previously called product_releases. ' ||
  'Milestones link to Business Requests and Features to form the product roadmap. ' ||
  'Milestones are independent of operational releases.';

-- Step 3: Add new columns to product_milestones
ALTER TABLE product_milestones ADD COLUMN quarter VARCHAR(10) 
  COMMENT 'Q1, Q2, Q3, Q4 or custom quarter label';

-- Step 4: Update existing records to populate quarter
UPDATE product_milestones
SET quarter = 'Q' || EXTRACT(quarter FROM target_date)::TEXT
WHERE quarter IS NULL AND target_date IS NOT NULL;

-- Step 5: Rename any FK references in other tables
-- Check: SELECT constraint_name FROM information_schema.table_constraints 
--        WHERE table_name='product_milestones';

COMMIT;
```

---

## MIGRATION 2: Update business_requests table

```sql
-- Migration: 2026-06-28_002_update_business_requests_table.sql

BEGIN;

-- Step 1: Backup deprecated fields
ALTER TABLE business_requests 
ADD COLUMN _deprecated_planned_quarter VARCHAR(50),
ADD COLUMN _deprecated_release_id UUID;

-- Step 2: Copy data to deprecated columns (before clearing)
UPDATE business_requests
SET 
  _deprecated_planned_quarter = planned_quarter,
  _deprecated_release_id = release_id
WHERE planned_quarter IS NOT NULL OR release_id IS NOT NULL;

-- Step 3: Mark old columns as deprecated (keep for now, don't drop)
COMMENT ON COLUMN business_requests.planned_quarter IS
  'DEPRECATED (2026-06-28). Use business_request_milestone_links instead. ' ||
  'Backed up in _deprecated_planned_quarter. Remove in Q4 2026.';

COMMENT ON COLUMN business_requests.release_id IS
  'DEPRECATED (2026-06-28). Use Release Hub (rh_releases) and release_artifacts for production evidence. ' ||
  'Backed up in _deprecated_release_id. Remove in Q4 2026.';

-- Step 4: Clear old values (optional; can keep for backward compatibility)
-- UPDATE business_requests SET planned_quarter = NULL, release_id = NULL;

-- Step 5: Verify migration
SELECT 
  id, 
  request_key, 
  planned_quarter,
  _deprecated_planned_quarter,
  release_id,
  _deprecated_release_id
FROM business_requests
WHERE planned_quarter IS NOT NULL OR release_id IS NOT NULL
LIMIT 10;

COMMIT;
```

---

## MIGRATION 3: Create business_request_milestone_links junction table

```sql
-- Migration: 2026-06-28_003_create_br_milestone_links.sql

BEGIN;

-- Step 1: Create junction table
CREATE TABLE business_request_milestone_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  business_request_id UUID NOT NULL REFERENCES business_requests(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES product_milestones(id) ON DELETE CASCADE,
  
  -- Relationship metadata
  sequence_in_milestone INTEGER, -- Phase 1, Phase 2, Phase 3, etc.
  is_primary BOOLEAN DEFAULT FALSE, -- Is this the primary milestone for this BR?
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  UNIQUE(business_request_id, milestone_id),
  CHECK (sequence_in_milestone IS NULL OR sequence_in_milestone > 0)
);

-- Step 2: Create indexes
CREATE INDEX idx_br_milestone_links_br_id ON business_request_milestone_links(business_request_id);
CREATE INDEX idx_br_milestone_links_milestone_id ON business_request_milestone_links(milestone_id);
CREATE INDEX idx_br_milestone_links_is_primary ON business_request_milestone_links(is_primary);

-- Step 3: Add comments
COMMENT ON TABLE business_request_milestone_links IS
  'Junction table linking Business Requests to Product Milestones. ' ||
  'Supports 1:many relationship: one BR can belong to multiple milestones (e.g., Phase 1 in Q3, Phase 2 in Q4). ' ||
  'sequence_in_milestone denotes the phase number within that milestone. ' ||
  'is_primary flags the primary milestone if BR spans multiple.';

COMMENT ON COLUMN business_request_milestone_links.sequence_in_milestone IS
  'Phase number within the milestone. E.g., BR-42 Phase 1 = sequence 1, Phase 2 = sequence 2.';

COMMENT ON COLUMN business_request_milestone_links.is_primary IS
  'TRUE if this is the primary milestone for the BR (used for default display). ' ||
  'Only one should be TRUE per BR, but not enforced at DB level.';

-- Step 4: Create trigger to auto-update timestamp
CREATE OR REPLACE FUNCTION update_br_milestone_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_br_milestone_links_updated_at
BEFORE UPDATE ON business_request_milestone_links
FOR EACH ROW
EXECUTE FUNCTION update_br_milestone_links_updated_at();

COMMIT;
```

---

## MIGRATION 4: Add columns to project_features

```sql
-- Migration: 2026-06-28_004_add_br_and_milestone_links_to_features.sql

BEGIN;

-- Step 1: Add new columns to project_features
ALTER TABLE project_features 
ADD COLUMN linked_business_request_ids UUID[] DEFAULT '{}' 
  COMMENT 'Business Request IDs this feature contributes to. Array of UUIDs.',
ADD COLUMN linked_milestone_ids UUID[] DEFAULT '{}' 
  COMMENT 'Product Milestone IDs this feature contributes to. Array of UUIDs.';

-- Step 2: Create indexes for array columns (if using PostgreSQL)
-- Note: GIN indexes are optimal for array membership queries
CREATE INDEX idx_project_features_linked_br_ids 
  ON project_features USING GIN(linked_business_request_ids);

CREATE INDEX idx_project_features_linked_milestone_ids 
  ON project_features USING GIN(linked_milestone_ids);

-- Step 3: Add comments
COMMENT ON COLUMN project_features.linked_business_request_ids IS
  'Array of Business Request UUIDs this feature delivers. ' ||
  'Used to trace feature → BR → milestone for roadmap progress calculation.';

COMMENT ON COLUMN project_features.linked_milestone_ids IS
  'Array of Product Milestone UUIDs this feature contributes to. ' ||
  'Derived from linked_business_request_ids via business_request_milestone_links.';

-- Step 4: Backfill linked_milestone_ids from BRs (see backfill script below)

COMMIT;
```

---

## MIGRATION 5: Add columns to project_epics

```sql
-- Migration: 2026-06-28_005_add_milestone_links_to_epics.sql

BEGIN;

ALTER TABLE project_epics 
ADD COLUMN linked_milestone_ids UUID[] DEFAULT '{}' 
  COMMENT 'Product Milestone IDs this epic contributes to. Array of UUIDs.';

CREATE INDEX idx_project_epics_linked_milestone_ids 
  ON project_epics USING GIN(linked_milestone_ids);

COMMENT ON COLUMN project_epics.linked_milestone_ids IS
  'Array of Product Milestone UUIDs this epic contributes to. ' ||
  'Used for independent epics not tied to features.';

COMMIT;
```

---

## MIGRATION 6: Create release_artifacts table

```sql
-- Migration: 2026-06-28_006_create_release_artifacts.sql

BEGIN;

-- Step 1: Create release_artifacts table (polymorphic)
CREATE TABLE release_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Release relationship
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  
  -- Polymorphic artifact reference
  artifact_type VARCHAR(50) NOT NULL,
    -- Enum values: 'business_request' | 'feature' | 'epic' | 'production_incident' | 'story'
  artifact_id UUID NOT NULL,
    -- Foreign key to the actual artifact (polymorphic; no direct FK constraint)
  
  -- Metadata
  artifact_label VARCHAR(255), -- Display label (e.g., "BR-42", "Feature: User Registration")
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  UNIQUE(release_id, artifact_type, artifact_id) -- Prevent duplicate artifacts in same release
);

-- Step 2: Create indexes
CREATE INDEX idx_release_artifacts_release_id ON release_artifacts(release_id);
CREATE INDEX idx_release_artifacts_artifact_type ON release_artifacts(artifact_type);
CREATE INDEX idx_release_artifacts_artifact_id ON release_artifacts(artifact_id);

-- Step 3: Add comments
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
  'Cached for display; not canonical (resolve via artifact_type + artifact_id for truth).';

COMMIT;
```

---

## MIGRATION 7: Create release_sprints junction table

```sql
-- Migration: 2026-06-28_007_create_release_sprints_junction.sql

BEGIN;

-- Step 1: Create junction table (if not already exists from old schema)
CREATE TABLE IF NOT EXISTS release_sprints (
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  
  -- Optional: metadata about this relationship
  artifact_count INTEGER, -- Cached count of stories from this sprint in the release
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (release_id, sprint_id)
);

-- Step 2: Create indexes
CREATE INDEX idx_release_sprints_release_id ON release_sprints(release_id);
CREATE INDEX idx_release_sprints_sprint_id ON release_sprints(sprint_id);

-- Step 3: Add comments
COMMENT ON TABLE release_sprints IS
  'Junction table linking Releases to Sprints. ' ||
  'One release can include sprints from multiple projects. ' ||
  'artifact_count is a cached denormalization of story count.';

COMMIT;
```

---

## BACKFILL SCRIPT: Migrate data from planned_quarter → business_request_milestone_links

```sql
-- Backfill: 2026-06-28_008_backfill_br_milestone_links.sql
-- Runs AFTER migrations 1-3 are complete

BEGIN;

-- Step 1: For each BR with a planned_quarter, find or create matching milestone
-- Strategy: assume product_milestones now exist (or create them from quarters)

INSERT INTO business_request_milestone_links (
  business_request_id,
  milestone_id,
  sequence_in_milestone,
  is_primary,
  created_by
)
SELECT DISTINCT
  br.id as business_request_id,
  pm.id as milestone_id,
  1 as sequence_in_milestone, -- Default phase 1
  TRUE as is_primary,
  '00000000-0000-0000-0000-000000000001'::UUID as created_by -- System user
FROM business_requests br
JOIN product_milestones pm 
  ON br.product_id = pm.product_id
WHERE br._deprecated_planned_quarter IS NOT NULL
  AND br._deprecated_planned_quarter = pm.quarter -- Match Q3 → Q3, etc.
  AND NOT EXISTS (
    SELECT 1 FROM business_request_milestone_links brml
    WHERE brml.business_request_id = br.id
      AND brml.milestone_id = pm.id
  )
ON CONFLICT (business_request_id, milestone_id) DO NOTHING;

-- Step 2: Verify backfill
SELECT 
  COUNT(*) as br_milestone_links_created
FROM business_request_milestone_links;

-- Step 3: Check for BRs that didn't match (orphaned by quarter mismatch)
SELECT 
  br.id,
  br.request_key,
  br._deprecated_planned_quarter
FROM business_requests br
WHERE br._deprecated_planned_quarter IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM business_request_milestone_links
    WHERE business_request_id = br.id
  );

-- Step 4: Manual mapping needed for orphaned BRs
-- For now, note them and handle separately

COMMIT;
```

---

## BACKFILL SCRIPT: Populate feature → milestone links

```sql
-- Backfill: 2026-06-28_009_backfill_feature_milestone_links.sql

BEGIN;

-- Strategy: For each feature, find linked BRs, then find their milestones
-- and add those milestone IDs to the feature

UPDATE project_features pf
SET linked_milestone_ids = (
  SELECT ARRAY_AGG(DISTINCT brml.milestone_id)
  FROM business_request_milestone_links brml
  WHERE brml.business_request_id = ANY(pf.linked_business_request_ids)
    AND brml.milestone_id IS NOT NULL
)
WHERE pf.deleted_at IS NULL
  AND ARRAY_LENGTH(pf.linked_business_request_ids, 1) > 0;

-- Step 2: Verify
SELECT 
  COUNT(*) as features_updated,
  COUNT(CASE WHEN linked_milestone_ids IS NOT NULL AND ARRAY_LENGTH(linked_milestone_ids, 1) > 0 THEN 1 END) as features_with_milestones
FROM project_features
WHERE deleted_at IS NULL;

COMMIT;
```

---

## VIEWS: Create for efficient querying

```sql
-- View 1: BR with milestone and progress info
CREATE OR REPLACE VIEW v_business_request_with_milestones AS
SELECT
  br.id,
  br.request_key,
  br.title,
  br.product_id,
  br.urgency,
  br.process_step,
  pm.id as milestone_id,
  pm.key as milestone_key,
  pm.title as milestone_title,
  pm.quarter,
  pm.target_date as milestone_target_date,
  brml.sequence_in_milestone as phase_number,
  brml.is_primary,
  -- Feature progress (derived)
  COUNT(DISTINCT pf.id) as linked_feature_count,
  COUNT(DISTINCT CASE WHEN pf.status = 'done' THEN pf.id END) as completed_feature_count,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN pf.status = 'done' THEN pf.id END) / 
    NULLIF(COUNT(DISTINCT pf.id), 0))::INT as progress_percent
FROM business_requests br
LEFT JOIN business_request_milestone_links brml ON br.id = brml.business_request_id
LEFT JOIN product_milestones pm ON brml.milestone_id = pm.id
LEFT JOIN project_features pf ON br.id = ANY(pf.linked_business_request_ids)
WHERE br.deleted_at IS NULL
GROUP BY br.id, br.request_key, br.title, br.product_id, br.urgency, br.process_step,
         pm.id, pm.key, pm.title, pm.quarter, pm.target_date, brml.sequence_in_milestone, brml.is_primary;

-- View 2: Release with artifacts and impact
CREATE OR REPLACE VIEW v_release_with_artifacts AS
SELECT
  r.id,
  r.key,
  r.name,
  r.release_date,
  r.status,
  COUNT(DISTINCT ra.id) as total_artifacts,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'business_request' THEN ra.artifact_id END) as br_count,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'feature' THEN ra.artifact_id END) as feature_count,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'epic' THEN ra.artifact_id END) as epic_count,
  COUNT(DISTINCT CASE WHEN ra.artifact_type = 'production_incident' THEN ra.artifact_id END) as incident_count,
  COUNT(DISTINCT rs.sprint_id) as sprint_count
FROM releases r
LEFT JOIN release_artifacts ra ON r.id = ra.release_id
LEFT JOIN release_sprints rs ON r.id = rs.release_id
GROUP BY r.id, r.key, r.name, r.release_date, r.status;

-- View 3: Product roadmap timeline (milestones + releases)
CREATE OR REPLACE VIEW v_product_roadmap_timeline AS
SELECT
  pm.id as timeline_entity_id,
  'milestone' as entity_type,
  pm.key as entity_key,
  pm.title as entity_title,
  pm.quarter,
  pm.start_date as timeline_start_date,
  pm.target_date as timeline_target_date,
  pm.status,
  pm.product_id,
  NULL::INTEGER as artifact_count
FROM product_milestones pm
WHERE pm.archived_at IS NULL

UNION ALL

SELECT
  r.id,
  'release',
  r.key,
  r.name,
  NULL,
  NULL,
  r.release_date,
  r.status,
  NULL, -- Release is not product-specific (can span multiple)
  COUNT(DISTINCT ra.id) as artifact_count
FROM releases r
LEFT JOIN release_artifacts ra ON r.id = ra.release_id
WHERE r.status != 'archived'
GROUP BY r.id, r.key, r.name, r.release_date, r.status

ORDER BY timeline_start_date, timeline_target_date;
```

---

## CHECKLIST: Verify All Migrations

```sql
-- Run this after all migrations to verify schema is correct

-- Check 1: product_milestones table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'product_milestones';

-- Check 2: business_request_milestone_links exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'business_request_milestone_links';

-- Check 3: product_features has new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'project_features' 
  AND column_name IN ('linked_business_request_ids', 'linked_milestone_ids');

-- Check 4: release_artifacts exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'release_artifacts';

-- Check 5: Deprecated columns still exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'business_requests' 
  AND column_name IN ('_deprecated_planned_quarter', '_deprecated_release_id');

-- Check 6: Sample data from new tables
SELECT COUNT(*) as br_milestone_links FROM business_request_milestone_links;
SELECT COUNT(*) as release_artifacts FROM release_artifacts;

-- Check 7: Views created
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE 'v_business_request_with_milestones'
   OR table_name LIKE 'v_release_with_artifacts'
   OR table_name LIKE 'v_product_roadmap_timeline';
```

---

## ROLLBACK STRATEGY

If migrations fail, rollback in reverse order:

```sql
-- Rollback: Remove new tables/columns (reverse of all migrations)
BEGIN;

DROP VIEW IF EXISTS v_product_roadmap_timeline;
DROP VIEW IF EXISTS v_release_with_artifacts;
DROP VIEW IF EXISTS v_business_request_with_milestones;

DROP TABLE IF EXISTS release_artifacts;
DROP TABLE IF EXISTS release_sprints;
DROP TABLE IF EXISTS business_request_milestone_links;

ALTER TABLE project_epics DROP COLUMN IF EXISTS linked_milestone_ids;
ALTER TABLE project_features DROP COLUMN IF EXISTS linked_milestone_ids;
ALTER TABLE project_features DROP COLUMN IF EXISTS linked_business_request_ids;

ALTER TABLE business_requests DROP COLUMN IF EXISTS _deprecated_release_id;
ALTER TABLE business_requests DROP COLUMN IF EXISTS _deprecated_planned_quarter;

ALTER TABLE product_milestones DROP COLUMN IF EXISTS quarter;
ALTER TABLE product_milestones RENAME TO product_releases;

ROLLBACK; -- or COMMIT if ready
```

---

## TIMELINE

| Week | Step | Migration Files |
|------|------|-----------------|
| Week 1 | Rename + Update Core | 2026-06-28_001 to 004 |
| Week 1 | Create Junctions & New Tables | 2026-06-28_005 to 007 |
| Week 2 | Backfill Data | 2026-06-28_008 to 009 |
| Week 2 | Create Views | SQL View definitions |
| Week 2 | Verify & Test | Verification checklist |

---

**Document Status:** Ready for deployment  
**Last Updated:** 2026-06-28  
**Next Step:** Run migrations in sequence; verify at each stage
