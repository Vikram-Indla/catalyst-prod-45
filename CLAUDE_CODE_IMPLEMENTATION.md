# Claude Code Implementation Specification
## Catalyst: Product Milestone + Release Artifacts Architecture

**This document is the complete specification for Claude Code implementation.**

---

## PHASE 1: DATABASE MIGRATIONS (Execute First)

### 1.1 Migration File: `supabase/migrations/2026-06-28_001_rename_releases_to_milestones.sql`

**File path:** `supabase/migrations/2026-06-28_001_rename_releases_to_milestones.sql`

**Content:**
```sql
-- Migration: Rename product_releases table to product_milestones
-- Reason: Clarify that this is a product-level time container (not production deployment)

BEGIN;

-- Step 1: Rename table
ALTER TABLE product_releases RENAME TO product_milestones;

-- Step 2: Update comments
COMMENT ON TABLE product_milestones IS
  'Product-level time-boxed milestone. ' ||
  'Previously called product_releases. ' ||
  'Milestones are the primary measuring unit for product roadmap. ' ||
  'Independent of operational releases in Release Hub.';

-- Step 3: Rename column
ALTER TABLE product_milestones RENAME COLUMN name TO title;

-- Step 4: Add new column
ALTER TABLE product_milestones ADD COLUMN quarter VARCHAR(10);
COMMENT ON COLUMN product_milestones.quarter IS
  'Quarter designation (Q1, Q2, Q3, Q4) or custom quarter label. ' ||
  'Used for filtering and grouping milestones in product roadmap.';

-- Step 5: Add key column (unique identifier)
ALTER TABLE product_milestones ADD COLUMN key VARCHAR(50) UNIQUE;
COMMENT ON COLUMN product_milestones.key IS
  'Unique key for milestone (e.g., PDM-2026-Q3-INV). ' ||
  'Format: PDM-YYYY-QX or PDM-YYYY-MM-THEME';

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_milestones_product_id ON product_milestones(product_id);
CREATE INDEX IF NOT EXISTS idx_product_milestones_quarter ON product_milestones(quarter);
CREATE INDEX IF NOT EXISTS idx_product_milestones_target_date ON product_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_product_milestones_status ON product_milestones(status);
CREATE INDEX IF NOT EXISTS idx_product_milestones_key ON product_milestones(key);

-- Step 7: Update any views/foreign keys that reference product_releases
-- (Run specific updates based on your schema)

COMMIT;
```

---

### 1.2 Migration File: `supabase/migrations/2026-06-28_002_update_business_requests_table.sql`

**File path:** `supabase/migrations/2026-06-28_002_update_business_requests_table.sql`

**Content:**
```sql
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
```

---

### 1.3 Migration File: `supabase/migrations/2026-06-28_003_create_br_milestone_links.sql`

**File path:** `supabase/migrations/2026-06-28_003_create_br_milestone_links.sql`

**Content:**
```sql
-- Migration: Create business_request_milestone_links junction table
-- Purpose: Link BRs to milestones (1:many relationship, supports phases)

BEGIN;

CREATE TABLE IF NOT EXISTS business_request_milestone_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_request_id UUID NOT NULL REFERENCES business_requests(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES product_milestones(id) ON DELETE CASCADE,
  
  sequence_in_milestone INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(business_request_id, milestone_id),
  CHECK (sequence_in_milestone IS NULL OR sequence_in_milestone > 0)
);

COMMENT ON TABLE business_request_milestone_links IS
  'Junction table linking Business Requests to Product Milestones. ' ||
  'Supports 1:many relationship: one BR can belong to multiple milestones (e.g., Phase 1 in Q3, Phase 2 in Q4). ' ||
  'sequence_in_milestone denotes the phase number within that milestone.';

COMMENT ON COLUMN business_request_milestone_links.sequence_in_milestone IS
  'Phase number within the milestone. E.g., sequence 1 = Phase 1, sequence 2 = Phase 2.';

COMMENT ON COLUMN business_request_milestone_links.is_primary IS
  'TRUE if this is the primary milestone for the BR. Used for default display and target date.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_br_id ON business_request_milestone_links(business_request_id);
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_milestone_id ON business_request_milestone_links(milestone_id);
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_is_primary ON business_request_milestone_links(is_primary);
CREATE INDEX IF NOT EXISTS idx_br_milestone_links_sequence ON business_request_milestone_links(sequence_in_milestone);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_br_milestone_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_br_milestone_links_timestamp ON business_request_milestone_links;
CREATE TRIGGER trg_br_milestone_links_timestamp
BEFORE UPDATE ON business_request_milestone_links
FOR EACH ROW
EXECUTE FUNCTION update_br_milestone_links_timestamp();

COMMIT;
```

---

### 1.4 Migration File: `supabase/migrations/2026-06-28_004_add_br_milestone_links_to_features.sql`

**File path:** `supabase/migrations/2026-06-28_004_add_br_milestone_links_to_features.sql`

**Content:**
```sql
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
```

---

### 1.5 Migration File: `supabase/migrations/2026-06-28_005_add_milestone_links_to_epics.sql`

**File path:** `supabase/migrations/2026-06-28_005_add_milestone_links_to_epics.sql`

**Content:**
```sql
-- Migration: Add milestone linking column to project_epics

BEGIN;

ALTER TABLE project_epics 
ADD COLUMN IF NOT EXISTS linked_milestone_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN project_epics.linked_milestone_ids IS
  'Array of Product Milestone UUIDs this epic contributes to. ' ||
  'Used for independent epics not tied to features.';

CREATE INDEX IF NOT EXISTS idx_project_epics_linked_milestone_ids 
  ON project_epics USING GIN(linked_milestone_ids);

COMMIT;
```

---

### 1.6 Migration File: `supabase/migrations/2026-06-28_006_create_release_artifacts.sql`

**File path:** `supabase/migrations/2026-06-28_006_create_release_artifacts.sql`

**Content:**
```sql
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
```

---

### 1.7 Migration File: `supabase/migrations/2026-06-28_007_create_release_sprints.sql`

**File path:** `supabase/migrations/2026-06-28_007_create_release_sprints.sql`

**Content:**
```sql
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
```

---

### 1.8 Migration File: `supabase/migrations/2026-06-28_008_create_views.sql`

**File path:** `supabase/migrations/2026-06-28_008_create_views.sql`

**Content:**
```sql
-- Migration: Create views for efficient querying

BEGIN;

-- View 1: BR with milestone and progress
DROP VIEW IF EXISTS v_business_request_with_milestones CASCADE;
CREATE VIEW v_business_request_with_milestones AS
SELECT
  br.id,
  br.request_key,
  br.title,
  br.product_id,
  br.urgency,
  br.process_step,
  br.end_date,
  pm.id as milestone_id,
  pm.key as milestone_key,
  pm.title as milestone_title,
  pm.quarter,
  pm.target_date as milestone_target_date,
  brml.sequence_in_milestone as phase_number,
  brml.is_primary,
  COUNT(DISTINCT pf.id) as linked_feature_count,
  COUNT(DISTINCT CASE WHEN pf.status = 'done' THEN pf.id END) as completed_feature_count,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN pf.status = 'done' THEN pf.id END) / 
    NULLIF(COUNT(DISTINCT pf.id), 0))::INT as progress_percent
FROM business_requests br
LEFT JOIN business_request_milestone_links brml ON br.id = brml.business_request_id
LEFT JOIN product_milestones pm ON brml.milestone_id = pm.id
LEFT JOIN project_features pf ON br.id = ANY(pf.linked_business_request_ids)
WHERE br.deleted_at IS NULL
GROUP BY br.id, br.request_key, br.title, br.product_id, br.urgency, br.process_step, br.end_date,
         pm.id, pm.key, pm.title, pm.quarter, pm.target_date, brml.sequence_in_milestone, brml.is_primary;

-- View 2: Release with artifacts
DROP VIEW IF EXISTS v_release_with_artifacts CASCADE;
CREATE VIEW v_release_with_artifacts AS
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
WHERE r.status != 'archived'
GROUP BY r.id, r.key, r.name, r.release_date, r.status;

-- View 3: Product roadmap timeline
DROP VIEW IF EXISTS v_product_roadmap_timeline CASCADE;
CREATE VIEW v_product_roadmap_timeline AS
SELECT
  pm.id as timeline_entity_id,
  'milestone'::TEXT as entity_type,
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
  'release'::TEXT,
  r.key,
  r.name,
  NULL,
  NULL,
  r.release_date,
  r.status,
  NULL,
  COUNT(DISTINCT ra.id)
FROM releases r
LEFT JOIN release_artifacts ra ON r.id = ra.release_id
WHERE r.status != 'archived'
GROUP BY r.id, r.key, r.name, r.release_date, r.status

ORDER BY timeline_start_date, timeline_target_date;

-- View 4: Available artifacts for release selection
DROP VIEW IF EXISTS v_release_artifact_options CASCADE;
CREATE VIEW v_release_artifact_options AS
SELECT 
  'business_request'::TEXT as artifact_type,
  br.id as artifact_id,
  br.request_key || ': ' || br.title as artifact_label,
  ROUND(100.0 * COUNT(CASE WHEN pf.status='done' THEN 1 END) / NULLIF(COUNT(*),0))::INT as completion_percent,
  CASE 
    WHEN COUNT(CASE WHEN pf.status='done' THEN 1 END) = COUNT(*) AND COUNT(*) > 0 THEN TRUE
    ELSE FALSE
  END as is_complete
FROM business_requests br
LEFT JOIN project_features pf ON br.id = ANY(pf.linked_business_request_ids)
WHERE br.deleted_at IS NULL
GROUP BY br.id, br.request_key, br.title

UNION ALL

SELECT 
  'feature'::TEXT,
  pf.id,
  'Feature: ' || pf.name,
  NULL,
  FALSE
FROM project_features pf
WHERE pf.deleted_at IS NULL

UNION ALL

SELECT
  'epic'::TEXT,
  pe.id,
  'Epic: ' || pe.name,
  NULL,
  FALSE
FROM project_epics pe
WHERE pe.deleted_at IS NULL

UNION ALL

SELECT
  'production_incident'::TEXT,
  pi.id,
  'Incident: ' || pi.key || ' ' || pi.title,
  NULL,
  FALSE
FROM production_incidents pi
WHERE pi.status IN ('resolved', 'closed');

COMMIT;
```

---

### 1.9 Migration File: `supabase/migrations/2026-06-28_009_backfill_data.sql`

**File path:** `supabase/migrations/2026-06-28_009_backfill_data.sql`

**Content:**
```sql
-- Migration: Backfill data from planned_quarter → business_request_milestone_links

BEGIN;

-- Step 1: Populate quarter in product_milestones (if not already done)
UPDATE product_milestones
SET quarter = CASE 
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '1' THEN 'Q1'
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '2' THEN 'Q2'
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '3' THEN 'Q3'
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '4' THEN 'Q4'
END
WHERE quarter IS NULL AND target_date IS NOT NULL;

-- Step 2: Populate key in product_milestones (if not already done)
UPDATE product_milestones
SET key = 'PDM-' || EXTRACT(YEAR FROM target_date)::TEXT || '-' || quarter || '-' || 
  LPAD(sequence::TEXT, 3, '0')
WHERE key IS NULL;

-- Step 3: Link BRs to milestones based on planned_quarter
INSERT INTO business_request_milestone_links (
  business_request_id,
  milestone_id,
  sequence_in_milestone,
  is_primary,
  created_by
)
SELECT DISTINCT
  br.id,
  pm.id,
  1 as sequence_in_milestone,
  TRUE as is_primary,
  '00000000-0000-0000-0000-000000000001'::UUID as created_by
FROM business_requests br
JOIN product_milestones pm 
  ON br.product_id = pm.product_id
WHERE br._deprecated_planned_quarter IS NOT NULL
  AND br._deprecated_planned_quarter = pm.quarter
  AND NOT EXISTS (
    SELECT 1 FROM business_request_milestone_links brml
    WHERE brml.business_request_id = br.id AND brml.milestone_id = pm.id
  )
ON CONFLICT DO NOTHING;

-- Step 4: Backfill feature milestone links
UPDATE project_features pf
SET linked_milestone_ids = (
  SELECT ARRAY_AGG(DISTINCT brml.milestone_id)
  FROM business_request_milestone_links brml
  WHERE brml.business_request_id = ANY(pf.linked_business_request_ids)
    AND brml.milestone_id IS NOT NULL
)
WHERE pf.deleted_at IS NULL
  AND ARRAY_LENGTH(pf.linked_business_request_ids, 1) > 0;

-- Step 5: Verify backfill
DO $$ 
DECLARE
  br_count INTEGER;
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO br_count FROM business_request_milestone_links;
  RAISE NOTICE 'Backfilled % BR-milestone links', br_count;
  
  SELECT COUNT(*) INTO orphaned_count FROM business_requests 
    WHERE _deprecated_planned_quarter IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM business_request_milestone_links 
        WHERE business_request_id = business_requests.id
      );
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'WARNING: % BRs have planned_quarter but no milestone link', orphaned_count;
  END IF;
END $$;

COMMIT;
```

---

## PHASE 2: TYPE DEFINITIONS (Create TypeScript Files)

### 2.1 Create File: `src/types/product-milestone.ts`

**File path:** `src/types/product-milestone.ts`

**Content:**
```typescript
/**
 * Product Milestone Types
 * 
 * Milestones are product-level time containers that group Business Requests.
 * Key differences from releases:
 * - Milestones = product roadmap measuring stick (business level)
 * - Releases = operational deployment container (ops level)
 */

export interface ProductMilestone {
  id: string;
  key: string; // e.g., "PDM-2026-Q3-INV"
  title: string; // e.g., "Q3 Innovation Sprint"
  productId: string;
  quarter: string; // 'Q1' | 'Q2' | 'Q3' | 'Q4'
  startDate?: string; // ISO 8601
  targetDate: string; // ISO 8601
  status: 'planned' | 'in_progress' | 'at_risk' | 'completed' | 'delivered' | 'archived';
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  archivedAt?: string;
}

export interface ProductMilestoneWithProgress extends ProductMilestone {
  linkedBRCount: number;
  linkedBRs: Array<{
    id: string;
    key: string;
    title: string;
  }>;
  linkedFeatures: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  progressPercent: number; // Derived from feature completion
  healthStatus: 'on_track' | 'at_risk' | 'off_track';
}

export interface BusinessRequestMilestoneLink {
  id: string;
  businessRequestId: string;
  milestoneId: string;
  sequenceInMilestone?: number; // Phase 1, 2, 3
  isPrimary: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface MilestoneProgress {
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  notStartedFeatures: number;
  progressPercent: number;
}

export interface MilestoneFilters {
  status?: string[];
  quarter?: string[];
  targetDateFrom?: string;
  targetDateTo?: string;
}

export interface CreateMilestoneInput {
  productId: string;
  key: string;
  title: string;
  quarter: string;
  startDate?: string;
  targetDate: string;
  status?: string;
  description?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  quarter?: string;
  startDate?: string;
  targetDate?: string;
  status?: string;
  description?: string;
}
```

---

### 2.2 Create File: `src/types/release-artifact.ts`

**File path:** `src/types/release-artifact.ts`

**Content:**
```typescript
/**
 * Release Artifact Types
 * 
 * Artifacts are the work items that ship in a release.
 * Polymorphic types: BR, Feature, Epic, Incident, Story
 */

export type ArtifactType = 'business_request' | 'feature' | 'epic' | 'production_incident' | 'story';

export interface ReleaseArtifact {
  id: string;
  releaseId: string;
  artifactType: ArtifactType;
  artifactId: string;
  artifactLabel: string;
  createdAt: string;
  createdBy?: string;
}

export interface ReleaseArtifactInput {
  artifactType: ArtifactType;
  artifactId: string;
  artifactLabel?: string;
}

export interface ReleaseArtifactOption {
  artifactType: ArtifactType;
  artifactId: string;
  label: string;
  completionPercent?: number;
  isComplete?: boolean;
  isSelectable: boolean;
}

export interface ReleaseWithArtifacts {
  id: string;
  key: string;
  name: string;
  releaseDate: string;
  status: string;
  artifacts: ReleaseArtifact[];
  sprints: ReleasedSprint[];
  linkedBRs?: Array<{
    id: string;
    key: string;
    title: string;
  }>;
}

export interface ReleasedSprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  storyCount: number;
}

export interface ReleaseArtifactValidation {
  artifactId: string;
  artifactType: ArtifactType;
  isValid: boolean;
  isSelectable: boolean;
  reason?: string;
}
```

---

### 2.3 Update File: `src/types/business-request.ts`

**File path:** `src/types/business-request.ts`

**Location:** Find existing file and add/modify:

```typescript
// ADD to existing BusinessRequest interface:
export interface BusinessRequest {
  // ... existing fields ...
  
  // DEPRECATED - keep for backward compatibility
  /** @deprecated Use business_request_milestone_links instead */
  planned_quarter?: string;
  
  /** @deprecated Use Release Hub (release_artifacts) instead */
  release_id?: string;
  
  // Not stored in DB; enriched by service layer
  // milestones?: BusinessRequestMilestoneLink[];
  // primaryMilestone?: ProductMilestone;
  // linkedFeatures?: Feature[];
  // progressPercent?: number;
}

// ADD new input type:
export interface CreateBusinessRequestWithMilestoneInput {
  title: string;
  description?: string;
  urgency?: string;
  endDate?: string;
  productId: string;
  primaryMilestoneId?: string;
  milestonePhase?: number;
}
```

---

### 2.4 Update File: `src/types/product-roadmap.ts`

**File path:** `src/types/product-roadmap.ts`

**Location:** Find existing Demand interface and update:

```typescript
// MODIFY existing Demand interface:
export interface Demand {
  id: string;
  key: string;
  title: string;
  status: string;
  ownerId: string;
  ownerName: string;
  
  // DEPRECATED - mark as such
  /** @deprecated Use milestones instead */
  plannedQuarter?: string;
  /** @deprecated Use milestones instead */
  plannedQuarters?: string[];
  
  // NEW - provided by service layer
  // Note: These are NOT stored in BR directly; enriched via joins
  // milestones?: BusinessRequestMilestoneLink[];
  // primaryMilestone?: ProductMilestone;
  // linkedFeatures?: Feature[];
  // progressPercent?: number; // From features, NOT sprints
  
  urgency: string;
  startDate?: Date;
  endDate?: Date;
}
```

---

## PHASE 3: SERVICES (Create/Update TypeScript Services)

### 3.1 Create File: `src/services/product-milestone.service.ts`

**File path:** `src/services/product-milestone.service.ts`

**Content:**
```typescript
import { supabase } from '@/lib/supabase';
import type {
  ProductMilestone,
  ProductMilestoneWithProgress,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneProgress,
  MilestoneFilters,
} from '@/types/product-milestone';

export class ProductMilestoneService {
  /**
   * Create a new product milestone
   */
  async createMilestone(input: CreateMilestoneInput): Promise<ProductMilestone> {
    const { data, error } = await supabase
      .from('product_milestones')
      .insert({
        product_id: input.productId,
        key: input.key,
        title: input.title,
        quarter: input.quarter,
        start_date: input.startDate,
        target_date: input.targetDate,
        status: input.status || 'planned',
        description: input.description,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  /**
   * Get milestone with progress information
   */
  async getMilestone(id: string): Promise<ProductMilestoneWithProgress> {
    const { data, error } = await supabase
      .from('v_product_roadmap_timeline')
      .select('*')
      .eq('timeline_entity_id', id)
      .eq('entity_type', 'milestone')
      .single();

    if (error) throw error;

    const milestone = await this.getMilestoneBase(id);
    const linkedBRs = await this.getLinkedBRs(id);
    const progress = await this.calculateProgress(id);

    return {
      ...milestone,
      linkedBRCount: linkedBRs.length,
      linkedBRs,
      progressPercent: progress.progressPercent,
      healthStatus: this.determineHealth(milestone, progress),
    } as ProductMilestoneWithProgress;
  }

  /**
   * List milestones for a product with optional filtering
   */
  async listMilestonesByProduct(
    productId: string,
    filters?: MilestoneFilters
  ): Promise<ProductMilestoneWithProgress[]> {
    let query = supabase
      .from('product_milestones')
      .select('*')
      .eq('product_id', productId)
      .is('archived_at', null)
      .order('target_date', { ascending: true });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.quarter?.length) {
      query = query.in('quarter', filters.quarter);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enrich with progress
    return Promise.all(
      data.map(async (m) => {
        const progress = await this.calculateProgress(m.id);
        const linkedBRs = await this.getLinkedBRs(m.id);

        return {
          ...this.mapToDomain(m),
          linkedBRCount: linkedBRs.length,
          linkedBRs,
          progressPercent: progress.progressPercent,
          healthStatus: this.determineHealth(this.mapToDomain(m), progress),
        } as ProductMilestoneWithProgress;
      })
    );
  }

  /**
   * Update milestone
   */
  async updateMilestone(id: string, input: UpdateMilestoneInput): Promise<ProductMilestone> {
    const { data, error } = await supabase
      .from('product_milestones')
      .update({
        title: input.title,
        quarter: input.quarter,
        start_date: input.startDate,
        target_date: input.targetDate,
        status: input.status,
        description: input.description,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  /**
   * Archive milestone
   */
  async archiveMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_milestones')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Link Business Request to Milestone
   */
  async linkBRToMilestone(
    brId: string,
    milestoneId: string,
    phase?: number,
    isPrimary?: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('business_request_milestone_links')
      .insert({
        business_request_id: brId,
        milestone_id: milestoneId,
        sequence_in_milestone: phase || 1,
        is_primary: isPrimary || false,
      })
      .on('*', (payload) => {
        console.log('BR linked to milestone', payload);
      });

    if (error) throw error;
  }

  /**
   * Unlink Business Request from Milestone
   */
  async unlinkBRFromMilestone(brId: string, milestoneId: string): Promise<void> {
    const { error } = await supabase
      .from('business_request_milestone_links')
      .delete()
      .eq('business_request_id', brId)
      .eq('milestone_id', milestoneId);

    if (error) throw error;
  }

  /**
   * Calculate milestone progress from linked features
   */
  async calculateProgress(milestoneId: string): Promise<MilestoneProgress> {
    const { data, error } = await supabase
      .from('business_request_milestone_links')
      .select(
        `
        business_request_id,
        business_requests(
          id,
          project_features(
            id,
            status
          )
        )
      `
      )
      .eq('milestone_id', milestoneId);

    if (error) throw error;

    const features = new Set<string>();
    let completedCount = 0;

    data?.forEach((link) => {
      link.business_requests?.project_features?.forEach((feature) => {
        features.add(feature.id);
        if (feature.status === 'done') {
          completedCount++;
        }
      });
    });

    const totalFeatures = features.size;
    const progressPercent = totalFeatures > 0 ? Math.round((completedCount / totalFeatures) * 100) : 0;

    return {
      totalFeatures,
      completedFeatures: completedCount,
      inProgressFeatures: totalFeatures - completedCount, // Simplified
      notStartedFeatures: 0, // Would need more complex logic
      progressPercent,
    };
  }

  /**
   * Determine health status
   */
  private determineHealth(
    milestone: ProductMilestone,
    progress: MilestoneProgress
  ): 'on_track' | 'at_risk' | 'off_track' {
    const today = new Date();
    const targetDate = new Date(milestone.targetDate);

    if (milestone.status === 'completed' || milestone.status === 'delivered') {
      return 'on_track';
    }

    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // If less than 2 weeks and not complete, at risk
    if (daysRemaining < 14 && progress.progressPercent < 100) {
      return 'at_risk';
    }

    // If past target date and not complete, off track
    if (daysRemaining < 0 && progress.progressPercent < 100) {
      return 'off_track';
    }

    return 'on_track';
  }

  // Private helper methods
  private mapToDomain(data: any): ProductMilestone {
    return {
      id: data.id,
      key: data.key,
      title: data.title,
      productId: data.product_id,
      quarter: data.quarter,
      startDate: data.start_date,
      targetDate: data.target_date,
      status: data.status,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      archivedAt: data.archived_at,
    };
  }

  private async getMilestoneBase(id: string): Promise<ProductMilestone> {
    const { data, error } = await supabase
      .from('product_milestones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToDomain(data);
  }

  private async getLinkedBRs(
    milestoneId: string
  ): Promise<Array<{ id: string; key: string; title: string }>> {
    const { data, error } = await supabase
      .from('business_request_milestone_links')
      .select('business_requests(id, request_key, title)')
      .eq('milestone_id', milestoneId);

    if (error) throw error;

    return data?.map((link: any) => ({
      id: link.business_requests.id,
      key: link.business_requests.request_key,
      title: link.business_requests.title,
    })) || [];
  }
}

export const productMilestoneService = new ProductMilestoneService();
```

---

### 3.2 Update File: `src/services/business-request.service.ts`

**File path:** `src/services/business-request.service.ts`

**Location:** Find existing file and add new methods:

```typescript
// ADD to BusinessRequestService class:

/**
 * @deprecated Use getBRWithMilestones() instead
 * Progress calculation based on sprints is incorrect.
 */
async getWithReleaseInfo(brId: string) {
  console.warn('[DEPRECATED] getWithReleaseInfo() is deprecated. Use getBRWithMilestones() instead.');
  // ... old implementation
}

/**
 * Get BR with linked milestones, features, and progress
 */
async getBRWithMilestones(brId: string): Promise<{
  br: BusinessRequest;
  milestones: any[];
  primaryMilestone?: any;
  linkedFeatures: any[];
  progressPercent: number;
}> {
  const { data: br, error: brError } = await supabase
    .from('business_requests')
    .select('*')
    .eq('id', brId)
    .single();

  if (brError) throw brError;

  // Get milestones
  const { data: milestoneData, error: milestonError } = await supabase
    .from('business_request_milestone_links')
    .select(
      `
      id,
      milestone_id,
      sequence_in_milestone,
      is_primary,
      product_milestones(
        id,
        key,
        title,
        quarter,
        target_date
      )
    `
    )
    .eq('business_request_id', brId);

  if (milestonError) throw milestonError;

  // Get linked features
  const { data: featureData, error: featureError } = await supabase
    .from('project_features')
    .select('*')
    .contains('linked_business_request_ids', [brId]);

  if (featureError) throw featureError;

  // Calculate progress from features
  const progressPercent = this.calculateProgressFromFeatures(featureData);

  return {
    br,
    milestones: milestoneData || [],
    primaryMilestone: milestoneData?.find((m) => m.is_primary)?.product_milestones,
    linkedFeatures: featureData || [],
    progressPercent,
  };
}

/**
 * Calculate BR progress from linked features (NOT sprints)
 */
async calculateBRProgressFromFeatures(brId: string): Promise<{
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  progressPercent: number;
}> {
  const { data, error } = await supabase
    .from('project_features')
    .select('id, status')
    .contains('linked_business_request_ids', [brId]);

  if (error) throw error;

  const features = data || [];
  const totalFeatures = features.length;
  const completedFeatures = features.filter((f) => f.status === 'done').length;
  const inProgressFeatures = features.filter((f) => f.status === 'in_progress').length;

  const progressPercent = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

  return {
    totalFeatures,
    completedFeatures,
    inProgressFeatures,
    progressPercent,
  };
}

/**
 * List BRs by milestone
 */
async listBRsByMilestone(milestoneId: string): Promise<BusinessRequest[]> {
  const { data, error } = await supabase
    .from('business_request_milestone_links')
    .select('business_requests(*)')
    .eq('milestone_id', milestoneId);

  if (error) throw error;

  return data?.map((link: any) => link.business_requests) || [];
}

/**
 * Add BR to milestone
 */
async addBRToMilestone(brId: string, milestoneId: string, phase?: number): Promise<void> {
  const { error } = await supabase
    .from('business_request_milestone_links')
    .insert({
      business_request_id: brId,
      milestone_id: milestoneId,
      sequence_in_milestone: phase || 1,
      is_primary: false,
    });

  if (error) throw error;
}

// Private helper
private calculateProgressFromFeatures(features: any[]): number {
  if (!features || features.length === 0) return 0;
  const completed = features.filter((f) => f.status === 'done').length;
  return Math.round((completed / features.length) * 100);
}
```

---

### 3.3 Create File: `src/services/release-artifact.service.ts`

**File path:** `src/services/release-artifact.service.ts`

**Content:**
```typescript
import { supabase } from '@/lib/supabase';
import type {
  ReleaseArtifact,
  ReleaseArtifactInput,
  ReleaseArtifactOption,
} from '@/types/release-artifact';

export class ReleaseArtifactService {
  /**
   * Add artifact to release
   */
  async addArtifactToRelease(releaseId: string, artifact: ReleaseArtifactInput): Promise<void> {
    const { error } = await supabase
      .from('release_artifacts')
      .insert({
        release_id: releaseId,
        artifact_type: artifact.artifactType,
        artifact_id: artifact.artifactId,
        artifact_label: artifact.artifactLabel || this.generateLabel(artifact),
      });

    if (error) throw error;
  }

  /**
   * Remove artifact from release
   */
  async removeArtifactFromRelease(
    releaseId: string,
    artifactId: string,
    artifactType: string
  ): Promise<void> {
    const { error } = await supabase
      .from('release_artifacts')
      .delete()
      .eq('release_id', releaseId)
      .eq('artifact_id', artifactId)
      .eq('artifact_type', artifactType);

    if (error) throw error;
  }

  /**
   * Get artifacts for release
   */
  async getArtifactsForRelease(releaseId: string): Promise<ReleaseArtifact[]> {
    const { data, error } = await supabase
      .from('release_artifacts')
      .select('*')
      .eq('release_id', releaseId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get available artifacts for selection
   * Only complete BRs can be selected as direct artifacts
   */
  async getAvailableArtifactsForRelease(releaseId: string): Promise<ReleaseArtifactOption[]> {
    const { data, error } = await supabase
      .from('v_release_artifact_options')
      .select('*');

    if (error) throw error;

    return (data || []).map((item: any) => ({
      artifactType: item.artifact_type,
      artifactId: item.artifact_id,
      label: item.artifact_label,
      completionPercent: item.completion_percent,
      isComplete: item.is_complete,
      isSelectable: item.artifact_type === 'business_request' ? item.is_complete : true,
    }));
  }

  /**
   * Validate if BR can be selected as artifact (must be 100% complete)
   */
  async validateBRCanBeArtifact(brId: string): Promise<{
    isComplete: boolean;
    isSelectable: boolean;
    reason?: string;
  }> {
    const { data, error } = await supabase
      .from('v_release_artifact_options')
      .select('*')
      .eq('artifact_id', brId)
      .eq('artifact_type', 'business_request')
      .single();

    if (error) {
      return { isComplete: false, isSelectable: false, reason: 'BR not found' };
    }

    if (!data.is_complete) {
      return {
        isComplete: false,
        isSelectable: false,
        reason: `BR is ${data.completion_percent}% complete. Only 100% complete BRs can be selected as artifacts.`,
      };
    }

    return { isComplete: true, isSelectable: true };
  }

  private generateLabel(artifact: ReleaseArtifactInput): string {
    // Would implement label generation based on artifact type
    return artifact.artifactLabel || `${artifact.artifactType}-${artifact.artifactId}`;
  }
}

export const releaseArtifactService = new ReleaseArtifactService();
```

---

## PHASE 4: REACT COMPONENTS (Create/Update Components)

### 4.1 Create File: `src/components/product-hub/MilestoneCard.tsx`

**File path:** `src/components/product-hub/MilestoneCard.tsx`

**Content:**
```typescript
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Button } from '@/components/ui/button';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';

export interface MilestoneCardProps {
  milestone: ProductMilestoneWithProgress;
  onClick?: (milestoneId: string) => void;
  onEdit?: (milestoneId: string) => void;
  onDelete?: (milestoneId: string) => void;
}

export function MilestoneCard({
  milestone,
  onClick,
  onEdit,
  onDelete,
}: MilestoneCardProps) {
  const healthColor = {
    on_track: 'bg-green-100 text-green-800',
    at_risk: 'bg-yellow-100 text-yellow-800',
    off_track: 'bg-red-100 text-red-800',
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(milestone.id)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{milestone.title}</CardTitle>
            <CardDescription>{milestone.key}</CardDescription>
          </div>
          <Badge variant="outline">{milestone.quarter}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dates */}
        <div className="text-sm text-gray-600">
          <p>
            {milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : 'TBD'} →{' '}
            {new Date(milestone.targetDate).toLocaleDateString()}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-600">{milestone.progressPercent}%</span>
          </div>
          <ProgressBar value={milestone.progressPercent} />
        </div>

        {/* Health Status */}
        <div className="flex items-center gap-2">
          <Badge className={healthColor[milestone.healthStatus]}>
            {milestone.healthStatus.replace('_', ' ')}
          </Badge>
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-600">
          <p>{milestone.linkedBRCount} Business Requests</p>
          <p>{milestone.linkedFeatures.length} Features</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation();
            onEdit?.(milestone.id);
          }}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => {
            e.stopPropagation();
            onDelete?.(milestone.id);
          }}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 4.2 Create File: `src/components/product-hub/MilestoneManager.tsx`

**File path:** `src/components/product-hub/MilestoneManager.tsx`

**Content:**
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneFormModal } from './MilestoneFormModal';
import { productMilestoneService } from '@/services/product-milestone.service';
import type { ProductMilestoneWithProgress } from '@/types/product-milestone';

export interface MilestoneManagerProps {
  productId: string;
}

export function MilestoneManager({ productId }: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState<ProductMilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  useEffect(() => {
    loadMilestones();
  }, [productId]);

  async function loadMilestones() {
    try {
      setLoading(true);
      const data = await productMilestoneService.listMilestonesByProduct(productId);
      setMilestones(data);
    } catch (error) {
      console.error('Failed to load milestones:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(input: any) {
    try {
      await productMilestoneService.createMilestone(input);
      setShowCreateModal(false);
      await loadMilestones();
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      await productMilestoneService.archiveMilestone(id);
      await loadMilestones();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  }

  if (loading) {
    return <div>Loading milestones...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Delivery Milestones</CardTitle>
        <Button onClick={() => setShowCreateModal(true)}>Create Milestone</Button>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onEdit={() => setEditingMilestoneId(milestone.id)}
              onDelete={() => handleDelete(milestone.id)}
            />
          ))}
        </div>

        {milestones.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <p>No milestones yet. Create your first milestone to get started.</p>
          </div>
        )}
      </CardContent>

      {showCreateModal && (
        <MilestoneFormModal
          productId={productId}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingMilestoneId && (
        <MilestoneFormModal
          productId={productId}
          milestoneId={editingMilestoneId}
          onSave={handleCreate}
          onClose={() => setEditingMilestoneId(null)}
        />
      )}
    </Card>
  );
}
```

---

### 4.3 Create File: `src/components/release-hub/ReleaseArtifactSelector.tsx`

**File path:** `src/components/release-hub/ReleaseArtifactSelector.tsx`

**Content:**
```typescript
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { releaseArtifactService } from '@/services/release-artifact.service';
import type { ReleaseArtifactInput, ReleaseArtifactOption } from '@/types/release-artifact';

export interface ReleaseArtifactSelectorProps {
  releaseId: string;
  onArtifactsSelected: (artifacts: ReleaseArtifactInput[]) => void;
  onClose: () => void;
}

export function ReleaseArtifactSelector({
  releaseId,
  onArtifactsSelected,
  onClose,
}: ReleaseArtifactSelectorProps) {
  const [availableArtifacts, setAvailableArtifacts] = useState<ReleaseArtifactOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifacts();
  }, [releaseId]);

  async function loadArtifacts() {
    try {
      setLoading(true);
      const artifacts = await releaseArtifactService.getAvailableArtifactsForRelease(releaseId);
      setAvailableArtifacts(artifacts);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(artifactId: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(artifactId)) {
      newSelected.delete(artifactId);
    } else {
      newSelected.add(artifactId);
    }
    setSelected(newSelected);
  }

  function handleConfirm() {
    const selectedArtifacts = Array.from(selected).map((artifactId) => {
      const artifact = availableArtifacts.find((a) => a.artifactId === artifactId);
      if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

      return {
        artifactType: artifact.artifactType,
        artifactId: artifact.artifactId,
        artifactLabel: artifact.label,
      } as ReleaseArtifactInput;
    });

    onArtifactsSelected(selectedArtifacts);
    onClose();
  }

  const completeBRs = availableArtifacts.filter(
    (a) => a.artifactType === 'business_request' && a.isSelectable
  );
  const featuresAndEpics = availableArtifacts.filter((a) =>
    ['feature', 'epic'].includes(a.artifactType)
  );
  const incidents = availableArtifacts.filter((a) => a.artifactType === 'production_incident');

  if (loading) {
    return <div>Loading artifacts...</div>;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Release Artifacts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Complete BRs */}
          {completeBRs.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Complete Business Requests</h3>
              <p className="text-sm text-gray-600 mb-3">
                Only 100% complete BRs can be selected as artifacts
              </p>
              <div className="space-y-2">
                {completeBRs.map((br) => (
                  <label key={br.artifactId} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.has(br.artifactId)}
                      onCheckedChange={() => toggleSelection(br.artifactId)}
                    />
                    <span>{br.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Features & Epics */}
          {featuresAndEpics.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Features & Epics</h3>
              <p className="text-sm text-gray-600 mb-3">
                Select features from BRs that are still in progress
              </p>
              <div className="space-y-2">
                {featuresAndEpics.map((item) => (
                  <label key={item.artifactId} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.has(item.artifactId)}
                      onCheckedChange={() => toggleSelection(item.artifactId)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Incidents */}
          {incidents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Production Incidents</h3>
              <div className="space-y-2">
                {incidents.map((incident) => (
                  <label key={incident.artifactId} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.has(incident.artifactId)}
                      onCheckedChange={() => toggleSelection(incident.artifactId)}
                    />
                    <span>{incident.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Confirm ({selected.size} selected)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## PHASE 5: HOOKS (Create Custom Hooks)

### 5.1 Create File: `src/hooks/useMilestones.ts`

**File path:** `src/hooks/useMilestones.ts`

**Content:**
```typescript
import { useState, useEffect } from 'react';
import { productMilestoneService } from '@/services/product-milestone.service';
import type { ProductMilestoneWithProgress, MilestoneFilters } from '@/types/product-milestone';

export function useMilestones(productId: string, filters?: MilestoneFilters) {
  const [milestones, setMilestones] = useState<ProductMilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadMilestones();
  }, [productId, filters]);

  async function loadMilestones() {
    try {
      setLoading(true);
      setError(null);
      const data = await productMilestoneService.listMilestonesByProduct(productId, filters);
      setMilestones(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load milestones'));
    } finally {
      setLoading(false);
    }
  }

  return { milestones, loading, error, refetch: loadMilestones };
}
```

---

## PHASE 6: UTILS (Create Helper Functions)

### 6.1 Create File: `src/utils/br-progress.ts`

**File path:** `src/utils/br-progress.ts`

**Content:**
```typescript
/**
 * Business Request Progress Utilities
 * All progress calculations are based on FEATURE COMPLETION, not sprints
 */

export function calculateBRProgressFromFeatures(
  linkedFeatures: Array<{ status: string }>
): number {
  if (!linkedFeatures || linkedFeatures.length === 0) return 0;

  const completed = linkedFeatures.filter((f) => f.status === 'done').length;
  return Math.round((completed / linkedFeatures.length) * 100);
}

export function calculateFeatureProgress(
  stories: Array<{ status: string }>
): number {
  if (!stories || stories.length === 0) return 0;

  const completed = stories.filter((s) => s.status === 'done').length;
  return Math.round((completed / stories.length) * 100);
}

export function determineBRHealth(
  targetDate: string,
  progressPercent: number,
  status: string
): 'on_track' | 'at_risk' | 'off_track' {
  if (status === 'completed' || status === 'delivered') return 'on_track';

  const today = new Date();
  const target = new Date(targetDate);
  const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0 && progressPercent < 100) return 'off_track';
  if (daysRemaining < 14 && progressPercent < 100) return 'at_risk';

  return 'on_track';
}
```

---

## SUMMARY CHECKLIST

**Database Migrations (execute in order):**
- [ ] 2026-06-28_001_rename_releases_to_milestones.sql
- [ ] 2026-06-28_002_update_business_requests_table.sql
- [ ] 2026-06-28_003_create_br_milestone_links.sql
- [ ] 2026-06-28_004_add_br_milestone_links_to_features.sql
- [ ] 2026-06-28_005_add_milestone_links_to_epics.sql
- [ ] 2026-06-28_006_create_release_artifacts.sql
- [ ] 2026-06-28_007_create_release_sprints.sql
- [ ] 2026-06-28_008_create_views.sql
- [ ] 2026-06-28_009_backfill_data.sql

**Type Definitions:**
- [ ] src/types/product-milestone.ts (NEW)
- [ ] src/types/release-artifact.ts (NEW)
- [ ] src/types/business-request.ts (UPDATE)
- [ ] src/types/product-roadmap.ts (UPDATE)

**Services:**
- [ ] src/services/product-milestone.service.ts (NEW)
- [ ] src/services/release-artifact.service.ts (NEW)
- [ ] src/services/business-request.service.ts (UPDATE)
- [ ] src/services/feature.service.ts (UPDATE)

**Components:**
- [ ] src/components/product-hub/MilestoneCard.tsx (NEW)
- [ ] src/components/product-hub/MilestoneManager.tsx (NEW)
- [ ] src/components/product-hub/MilestoneFormModal.tsx (NEW)
- [ ] src/components/release-hub/ReleaseArtifactSelector.tsx (NEW)
- [ ] src/components/product-hub/ProductRoadmapView.tsx (UPDATE)
- [ ] src/components/product-hub/BRDetailView.tsx (UPDATE)
- [ ] src/components/release-hub/ReleaseDetail.tsx (UPDATE)

**Hooks:**
- [ ] src/hooks/useMilestones.ts (NEW)

**Utils:**
- [ ] src/utils/br-progress.ts (NEW)

---

**Status:** Ready for Claude Code execution  
**Timeline:** 2 weeks for full implementation  
**Priority:** Phase 1 (Database) must complete before Phase 2+
