# Implementation: Product Delivery Milestone Architecture
## Catalyst — Convert BR roadmap from release/sprint to PDM measuring stick

**Status:** Technical Specification | **Date:** 2026-06-28 | **Author:** Architectural Guidance  
**Priority:** High | **Scope:** Core domain model, queries, UI  
**Timeline:** 6-8 weeks with parallel work

---

## What You're Changing

| Old Model | New Model |
|-----------|-----------|
| BR.planned_quarter (legacy quarters) | BR links to PDM; PDM has target_date |
| BR.release_id (direct link to product_releases) | BR links to PDMs; PDM is business-facing; Release link is evidence only |
| Sprint language visible in Product Roadmap | Milestones only; sprints hidden by default |
| Progress calculated from sprint completion | Progress calculated from linked feature completion |
| Release = product-level container | Release = operational deployment package only |
| One release per BR | One BR can link to multiple PDMs; multiple releases can evidence one BR |

---

## Phase 1: Schema Changes (Week 1-2)

### 1.1 Create Product Delivery Milestone Table

```sql
-- New table: product_delivery_milestones
CREATE TABLE product_delivery_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  key VARCHAR(50) UNIQUE NOT NULL, -- PDM-2026-Q3-INV, PDM-2026-07-SENAEI
  title VARCHAR(255) NOT NULL, -- "Q3 Innovation Sprint", "Q3 Industrial Marketplace MVP"
  
  -- Scope & relationship
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Dates & status
  target_date DATE NOT NULL, -- Business commitment date
  start_date DATE, -- When work begins
  status VARCHAR(50) NOT NULL DEFAULT 'planned', 
    -- planned, in_progress, at_risk, completed, delivered, archived
  
  -- Measurement
  description TEXT,
  theme VARCHAR(255), -- e.g., "Industrial Digitization", "UX Improvement"
  strategic_objective VARCHAR(255), -- e.g., "Enable Services", "Digital Maturity 2026"
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  archived_at TIMESTAMPTZ,
  
  CONSTRAINT valid_dates CHECK (start_date IS NULL OR start_date <= target_date)
);

CREATE INDEX idx_product_delivery_milestones_product_id ON product_delivery_milestones(product_id);
CREATE INDEX idx_product_delivery_milestones_target_date ON product_delivery_milestones(target_date);
CREATE INDEX idx_product_delivery_milestones_status ON product_delivery_milestones(status);
```

### 1.2 Link BR → PDM (Junction Table)

```sql
-- BR can belong to 1+ PDMs (milestone checkpoints)
-- One large BR might have multiple phases/milestones
CREATE TABLE business_request_pdm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  business_request_id UUID NOT NULL REFERENCES business_requests(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES product_delivery_milestones(id) ON DELETE CASCADE,
  
  -- Which phase/checkpoint is this BR within this PDM?
  -- E.g., BR-42 might be "Phase 1" in PDM-Q3, "Phase 2" in PDM-Q4
  sequence_in_milestone INTEGER, -- 1, 2, 3...
  
  -- Is this the "primary" milestone for this BR?
  -- (Used when BR appears in multiple milestones)
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_request_id, milestone_id),
  CHECK (sequence_in_milestone IS NULL OR sequence_in_milestone > 0)
);

CREATE INDEX idx_br_pdm_links_milestone_id ON business_request_pdm_links(milestone_id);
CREATE INDEX idx_br_pdm_links_br_id ON business_request_pdm_links(business_request_id);
CREATE INDEX idx_br_pdm_links_primary ON business_request_pdm_links(is_primary);
```

### 1.3 Link Feature → PDM (for feature-level roadmap tracking)

```sql
-- Features link to PDMs to show which feature is part of which milestone
-- This allows "Feature X is 80% done, so PDM-Q3 is 40% done (2 of 5 features)"
ALTER TABLE project_features ADD COLUMN linked_pdm_ids UUID[] DEFAULT '{}';
  -- Array of PDM IDs this feature contributes to
  -- Alternative: create junction table if you prefer normalized schema

-- Add comment/documentation
COMMENT ON COLUMN project_features.linked_pdm_ids IS 
  'Product Delivery Milestones this feature contributes to. ' ||
  'Used to calculate milestone progress from feature completion.';
```

### 1.4 Deprecate Old Fields (Don't delete yet; mark for removal)

```sql
-- Mark these for deprecation; keep for backward compatibility during transition
ALTER TABLE business_requests ADD COLUMN _deprecated_planned_quarter VARCHAR(50);
ALTER TABLE business_requests ADD COLUMN _deprecated_release_id UUID;
  -- Migrate data here: BR.planned_quarter → _deprecated_planned_quarter
  -- Migrate data here: BR.release_id → _deprecated_release_id

-- Add trigger to warn on access (optional, for monitoring)
-- Or just update code to use new fields and ignore old ones

COMMENT ON COLUMN business_requests._deprecated_planned_quarter IS 
  'DEPRECATED (2026-06-28). Use business_request_pdm_links instead. ' ||
  'Retained for backward compatibility; remove in Q4 2026.';

COMMENT ON COLUMN business_requests._deprecated_release_id IS 
  'DEPRECATED (2026-06-28). Use rh_release_brs (Release Operations) for production evidence. ' ||
  'Retained for backward compatibility; remove in Q4 2026.';
```

### 1.5 Update Business Request Table (Add PDM tracking fields)

```sql
-- Optional: add convenience fields to BR for faster queries
-- (If you prefer, calculate these on-the-fly instead)

ALTER TABLE business_requests ADD COLUMN primary_pdm_id UUID 
  REFERENCES product_delivery_milestones(id) ON DELETE SET NULL;

ALTER TABLE business_requests ADD COLUMN pdm_target_date DATE;
  -- Derived from primary_pdm_id.target_date; auto-updated by trigger

-- Trigger to auto-populate derived fields when BR links to PDM
CREATE OR REPLACE FUNCTION update_br_pdm_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new PDM link is created with is_primary=TRUE,
  -- update BR's primary_pdm_id and pdm_target_date
  IF NEW.is_primary THEN
    UPDATE business_requests
    SET 
      primary_pdm_id = NEW.milestone_id,
      pdm_target_date = (
        SELECT target_date FROM product_delivery_milestones WHERE id = NEW.milestone_id
      ),
      updated_at = NOW()
    WHERE id = NEW.business_request_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_br_pdm_link_insert
AFTER INSERT ON business_request_pdm_links
FOR EACH ROW EXECUTE FUNCTION update_br_pdm_fields();
```

---

## Phase 2: Data Migration (Week 2-3)

### 2.1 Migrate BR.planned_quarter → PDM

For each BR with a `planned_quarter` value, create (or link to) a PDM:

```sql
-- Step 1: Create PDMs for each quarter (if they don't exist)
INSERT INTO product_delivery_milestones (key, title, product_id, target_date, status, created_by)
SELECT DISTINCT
  'PDM-' || DATE_PART('year', date_trunc('quarter', CURRENT_DATE))::TEXT || 
  '-Q' || DATE_PART('quarter', date_trunc('quarter', CURRENT_DATE))::TEXT || 
  '-AUTO',
  'Q' || DATE_PART('quarter', date_trunc('quarter', CURRENT_DATE))::TEXT || 
  ' ' || DATE_PART('year', CURRENT_DATE)::TEXT,
  br.product_id,
  date_trunc('quarter', CURRENT_DATE) + interval '1 quarter' - interval '1 day',
  'planned',
  '00000000-0000-0000-0000-000000000001' -- System user
FROM business_requests br
WHERE br.planned_quarter IS NOT NULL
  AND br.product_id IS NOT NULL
ON CONFLICT (key) DO NOTHING;

-- Step 2: Link BRs to their PDMs
INSERT INTO business_request_pdm_links (business_request_id, milestone_id, is_primary)
SELECT 
  br.id,
  pdm.id,
  TRUE
FROM business_requests br
JOIN product_delivery_milestones pdm 
  ON br.product_id = pdm.product_id
WHERE br.planned_quarter = pdm.key
  AND NOT EXISTS (
    SELECT 1 FROM business_request_pdm_links 
    WHERE business_request_id = br.id
  )
ON CONFLICT DO NOTHING;

-- Step 3: Backup old values
UPDATE business_requests
SET _deprecated_planned_quarter = planned_quarter
WHERE planned_quarter IS NOT NULL;

-- Step 4: Clear old field (optional; keep for now)
UPDATE business_requests
SET planned_quarter = NULL
WHERE planned_quarter IS NOT NULL;
```

### 2.2 Link existing BR.release_id → Release Operations

Current BRs with `release_id` pointing to `product_releases` need to be mapped to Release Operations (`rh_releases`):

```sql
-- Step 1: If you have a mapping table from product_releases → rh_releases, use it
-- For now, assume no direct mapping; backfill manually or create a mapping

-- Step 2: For BRs that had a release, create evidence link in Release Operations
-- (This assumes rh_release_brs junction table exists)
INSERT INTO rh_release_brs (release_id, business_request_id)
SELECT DISTINCT
  (SELECT id FROM rh_releases LIMIT 1), -- Manual mapping needed here
  br.id
FROM business_requests br
WHERE br._deprecated_release_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM rh_release_brs WHERE business_request_id = br.id
  );

-- Step 3: Backup old FK
UPDATE business_requests
SET _deprecated_release_id = release_id
WHERE release_id IS NOT NULL;

-- Step 4: Clear old field (optional for now)
UPDATE business_requests
SET release_id = NULL
WHERE release_id IS NOT NULL;
```

### 2.3 Link Features → PDM (Backfill)

Features should link to PDMs based on their parent epic and epic→BR relationship:

```sql
-- Step 1: For each feature, find linked BRs (via epic or direct feature→BR link)
-- Step 2: For each BR, find its primary PDM
-- Step 3: Link feature to that PDM

-- Pseudocode (implement based on your feature→epic→BR linking):
-- FOR EACH feature:
--   Find parent epic
--   Find BRs linked to that epic (or feature directly)
--   For each BR, get primary_pdm_id
--   Add PDM IDs to feature.linked_pdm_ids array

-- Example (adjust to your schema):
UPDATE project_features pf
SET linked_pdm_ids = (
  SELECT ARRAY_AGG(DISTINCT brpdm.milestone_id)
  FROM business_request_pdm_links brpdm
  WHERE brpdm.business_request_id IN (
    -- Find BRs linked to this feature's epic or feature
    SELECT br.id
    FROM business_requests br
    WHERE br.id IN (
      -- Your epic→BR or feature→BR join logic
      SELECT DISTINCT business_request_id
      FROM business_request_features
      WHERE feature_id = pf.id
    )
  )
)
WHERE pf.deleted_at IS NULL;
```

---

## Phase 3: Service & Query Layer (Week 3-4)

### 3.1 Create PDM Service

```typescript
// src/services/pdm.service.ts

export interface ProductDeliveryMilestone {
  id: string;
  key: string;
  title: string;
  productId: string;
  targetDate: string; // ISO date
  startDate?: string;
  status: 'planned' | 'in_progress' | 'at_risk' | 'completed' | 'delivered' | 'archived';
  description?: string;
  theme?: string;
  strategicObjective?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  archivedAt?: string;
}

export interface PDMWithProgress extends ProductDeliveryMilestone {
  linkedBRCount: number;
  linkedBRs: Array<{ id: string; key: string; title: string }>;
  linkedFeatures: Array<{ id: string; name: string; status: string }>;
  progressPercent: number; // Calculated from feature completion
  healthStatus: 'on_track' | 'at_risk' | 'off_track';
}

export class PDMService {
  // CRUD
  async createPDM(data: CreatePDMInput): Promise<ProductDeliveryMilestone> { }
  async getPDM(id: string): Promise<PDMWithProgress> { }
  async listPDMsByProduct(productId: string, filters?: PDMFilters): Promise<PDMWithProgress[]> { }
  async updatePDM(id: string, data: UpdatePDMInput): Promise<ProductDeliveryMilestone> { }
  async archivePDM(id: string): Promise<void> { }

  // Relationships
  async linkBRToMilestone(brId: string, pdmId: string, isPrimary?: boolean): Promise<void> { }
  async unlinkBRFromMilestone(brId: string, pdmId: string): Promise<void> { }
  async linkFeaturesToMilestone(featureIds: string[], pdmId: string): Promise<void> { }

  // Progress calculation
  async calculatePDMProgress(pdmId: string): Promise<{
    totalFeatures: number;
    completedFeatures: number;
    progressPercent: number;
    linkedBRs: string[];
  }> { }

  // Health calculation
  async calculatePDMHealth(pdmId: string): Promise<'on_track' | 'at_risk' | 'off_track'> { }
}
```

### 3.2 Update Business Request Service

```typescript
// src/services/business-request.service.ts (updated)

export class BusinessRequestService {
  // Old method (deprecated)
  async getWithReleaseInfo(brId: string) {
    // Now returns PDM info, not release info
  }

  // New methods
  async getBRWithMilestones(brId: string): Promise<{
    br: BusinessRequest;
    primaryMilestone?: PDMWithProgress;
    allMilestones: PDMWithProgress[];
    linkedFeatures: FeatureWithStatus[];
    progressPercent: number;
  }> { }

  async calculateBRProgressFromFeatures(brId: string): Promise<{
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    progressPercent: number;
    by_status: Record<string, number>;
  }> { }

  async listBRsByMilestone(pdmId: string): Promise<BusinessRequest[]> { }
}
```

### 3.3 Feature Service Updates

```typescript
// src/services/feature.service.ts (updated)

export class FeatureService {
  async getFeatureWithBRs(featureId: string): Promise<{
    feature: Feature;
    linkedBRs: BusinessRequest[];
    linkedMilestones: ProductDeliveryMilestone[];
  }> { }

  async linkFeatureToBR(featureId: string, brId: string): Promise<void> { }
  async linkFeatureToMilestone(featureId: string, pdmId: string): Promise<void> { }

  // Progress calculation (from stories)
  async getFeatureProgress(featureId: string): Promise<{
    totalStories: number;
    completedStories: number;
    progressPercent: number;
  }> { }
}
```

### 3.4 Update BR Progress Calculation (Critical)

**Old way (DON'T do this):**
```typescript
// ❌ WRONG: calculate progress from sprints
const sprintProgress = br.sprints.filter(s => s.status === 'completed').length / br.sprints.length;
```

**New way (DO this):**
```typescript
// ✅ CORRECT: calculate progress from feature completion
async function calculateBRProgress(brId: string): Promise<number> {
  const br = await getBR(brId);
  
  // Find all features linked to this BR
  const features = await supabase
    .from('project_features')
    .select('id, story_count, completed_story_count')
    .contains('linked_pdm_ids', [br.primary_pdm_id]) // or direct feature→BR link
    .not('deleted_at', 'is', null);
  
  if (features.length === 0) return 0;
  
  const totalStories = features.reduce((sum, f) => sum + f.story_count, 0);
  const completedStories = features.reduce((sum, f) => sum + f.completed_story_count, 0);
  
  return Math.round((completedStories / totalStories) * 100);
}
```

### 3.5 Update Product Roadmap Query

```typescript
// src/services/product-roadmap.service.ts

export async function getProductRoadmap(productId: string): Promise<{
  milestones: PDMWithProgress[];
  businessRequests: BRWithProgress[];
  timeline: TimelineView;
}> {
  // Query: Product → PDMs → BRs → Features → Stories
  const milestones = await supabase
    .from('product_delivery_milestones')
    .select(`
      *,
      business_request_pdm_links(
        business_request_id,
        business_requests(id, key, title, urgency, status)
      )
    `)
    .eq('product_id', productId)
    .not('archived_at', 'is', null)
    .order('target_date');

  // For each milestone, fetch linked features and calculate progress
  const enriched = await Promise.all(
    milestones.map(async (pdm) => ({
      ...pdm,
      linkedBRs: pdm.business_request_pdm_links.map(link => link.business_requests),
      linkedFeatures: await getFeaturesByPDM(pdm.id),
      progress: await calculatePDMProgress(pdm.id),
      health: await calculatePDMHealth(pdm.id),
    }))
  );

  return {
    milestones: enriched,
    businessRequests: enriched.flatMap(m => m.linkedBRs),
    timeline: buildTimelineView(enriched),
  };
}
```

---

## Phase 4: UI Component Updates (Week 4-5)

### 4.1 Update Product Roadmap Component (Key)

**Old:**
```tsx
// ❌ Shows quarters and sprints
<ProductRoadmapView
  businessRequests={brs}
  groupBy="planned_quarter"
  showSprints={true}
/>
```

**New:**
```tsx
// ✅ Shows milestones, hides sprints by default
<ProductRoadmapView
  milestones={pdms}
  businessRequests={brs}
  groupBy="milestone"
  showSprints={false} // Add toggle: "Show Technical Delivery" if needed
/>

// Timeline card shows PDM, not sprints
<MilestoneCard
  milestone={pdm}
  linkedBRCount={pdm.linkedBRs.length}
  progress={pdm.progressPercent}
  health={pdm.healthStatus}
  targetDate={pdm.targetDate}
/>
```

### 4.2 Update BR Detail View

**Old:**
```tsx
<BRDetail br={br}>
  <ReleaseSection release={br.release} />
  <QuarterSection quarter={br.planned_quarter} />
  <SprintSection sprints={br.sprints} />
</BRDetail>
```

**New:**
```tsx
<BRDetail br={br}>
  <RoadmapMilestoneSection 
    milestones={br.pdms}
    primary={br.primaryMilestone}
  />
  <FeatureCoverageSection 
    features={br.linkedFeatures}
    progress={br.progressPercent}
  />
  <ReleaseEvidenceSection 
    releases={br.linkedReleases}
    collapseByDefault={true}
  />
  <TechnicalDeliverySection 
    sprints={br.sprints}
    stories={br.stories}
    expandOnDemand={true}
  />
</BRDetail>
```

### 4.3 Create Milestone Management Component

```tsx
// New component: src/components/product-hub/MilestoneManager.tsx

export function MilestoneManager({ productId }: Props) {
  return (
    <Card>
      <CardHeader>
        <h2>Product Delivery Milestones</h2>
        <Button onClick={() => setShowCreateModal(true)}>Create Milestone</Button>
      </CardHeader>
      <MilestoneTimeline milestones={milestones} />
      <MilestoneTable 
        milestones={milestones}
        columns={[
          'key', 'title', 'target_date', 'status', 'linked_br_count',
          'feature_progress', 'health', 'actions'
        ]}
      />
    </Card>
  );
}

// Modal for creating/editing PDM
export function MilestoneFormModal({ pdm, onSave }: Props) {
  return (
    <Form>
      <Input name="key" label="Key" placeholder="PDM-2026-Q3-INV" />
      <Input name="title" label="Title" placeholder="Q3 Innovation Sprint" />
      <DateInput name="targetDate" label="Target Date" />
      <DateInput name="startDate" label="Start Date (optional)" />
      <Select 
        name="status" 
        label="Status"
        options={['planned', 'in_progress', 'at_risk', 'completed', 'delivered', 'archived']}
      />
      <TextArea name="description" label="Description" />
      <Input name="theme" label="Strategic Theme" />
      
      {/* Link BRs to this milestone */}
      <MultiSelect
        name="linkedBRIds"
        label="Business Requests"
        options={availableBRs}
        onAdd={(brId) => linkBRToMilestone(brId)}
      />
      
      {/* Link Features */}
      <MultiSelect
        name="linkedFeatureIds"
        label="Delivery Features"
        options={availableFeatures}
        onAdd={(featureId) => linkFeatureToMilestone(featureId)}
      />
    </Form>
  );
}
```

### 4.4 Update Release Hub Integration (Show BR Evidence)

```tsx
// In Release Operations view

<ReleaseDetail release={operationalRelease}>
  <ReleaseInfoSection />
  
  {/* New: Show which BRs this release evidences */}
  <section>
    <h3>Business Impact</h3>
    <p>This release delivers increments for the following business requests:</p>
    <BRLinksList brs={release.linkedBRs} /> {/* Read-only; derived from sprints→features→BRs */}
  </section>
  
  <LinkedSprintsSection sprints={release.linkedSprints} />
  <ChangeRecordsSection changes={release.changeRecords} />
  <DeploymentPipelineSection />
</ReleaseDetail>
```

### 4.5 Hide Sprint Language (Where Possible)

In Product Hub surfaces, add a "Show Technical Details" toggle:

```tsx
<ProductRoadmapView>
  <TopBar>
    <Toggle
      label="Show Technical Delivery"
      checked={showTechnical}
      onChange={setShowTechnical}
      help="Displays sprints, stories, and project details. Hidden by default for business users."
    />
  </TopBar>
  
  {showTechnical && (
    <TechnicalDetailsPanel>
      Sprint breakdown, story-level progress, project allocation
    </TechnicalDetailsPanel>
  )}
</ProductRoadmapView>
```

---

## Phase 5: Documentation & Labels (Week 5-6)

### 5.1 Update Database Comments & Schema Docs

```sql
-- business_requests table
COMMENT ON TABLE business_requests IS
  'Business-facing demand entity. Linked to Product Delivery Milestones (PDM) for roadmap planning. ' ||
  'Progress is calculated from linked features, not sprints. ' ||
  'Release evidence (production outcomes) tracked in Release Operations.';

COMMENT ON COLUMN business_requests.primary_pdm_id IS
  'The primary milestone this BR is committed to. ' ||
  'Query business_request_pdm_links for all associated milestones.';

COMMENT ON COLUMN business_requests._deprecated_planned_quarter IS
  'DEPRECATED. Use product_delivery_milestones and business_request_pdm_links instead.';

COMMENT ON COLUMN business_requests._deprecated_release_id IS
  'DEPRECATED. Use Release Operations (rh_releases, rh_release_brs) for production evidence.';

-- product_delivery_milestones table
COMMENT ON TABLE product_delivery_milestones IS
  'Product-facing roadmap milestone. The primary measuring stick for business request progress. ' ||
  'PDMs group BRs by target date and strategic theme. ' ||
  'Progress is derived from linked feature completion. ' ||
  'Key format: PDM-YYYY-QX or PDM-YYYY-MM-THEME.';
```

### 5.2 Update UI Labels in Code

```typescript
// src/constants/labels.ts

export const LABELS = {
  productHub: {
    roadmap: 'Product Roadmap',
    milestone: 'Product Delivery Milestone',
    businessRequest: 'Business Request',
    feature: 'Delivery Feature',
    quarter: '(Legacy) Planned Quarter', // Deprecated label
  },
  projectHub: {
    sprint: 'Sprint / Iteration',
    story: 'Story',
    epic: 'Epic',
    feature: 'Feature',
  },
  releaseOps: {
    release: 'Release / Deployment',
    changeRecord: 'Change Record',
    productionEvent: 'Production Event',
  },
};

// In Product Hub UI:
<Label>{LABELS.productHub.milestone}</Label> // Shows "Product Delivery Milestone"

// In Project Hub UI:
<Label>{LABELS.projectHub.sprint}</Label> // Shows "Sprint / Iteration"
```

### 5.3 Create Glossary

Add to documentation:

| Term | Definition | Used in | Owner |
|------|-----------|---------|-------|
| **Product Delivery Milestone (PDM)** | Business-facing roadmap checkpoint (date + scope grouping) | Product Hub | Product Owner |
| **Business Request (BR)** | Business demand/outcome; linked to 1+ PDMs | Product Hub | Business Owner |
| **Feature** | Delivery coverage unit; linked to BRs and PDMs | Project + Product Hub | BA / Delivery Lead |
| **Story** | Executable unit of work; scheduled in sprints | Project Hub | Dev team |
| **Sprint** | Time-boxed delivery cycle (typically 2-4 weeks) | Project Hub | Scrum Master |
| **Release** (Operational) | Deployable package spanning projects; ships to production | Release Hub | Release Manager |
| **Change Record** | Operational approval & SOP execution record for a release | Release Hub | Change Manager |
| **Production Event** | Record of actual go-live; proof value shipped | Release Hub | Ops / DevOps |

---

## Phase 6: Queries & Views (Week 6)

### 6.1 Key SQL Views

```sql
-- View: Product roadmap with milestone health
CREATE OR REPLACE VIEW v_product_roadmap AS
SELECT
  pdm.id,
  pdm.key,
  pdm.title,
  pdm.product_id,
  pdm.target_date,
  pdm.status,
  COUNT(DISTINCT brpdm.business_request_id) as br_count,
  COUNT(DISTINCT pf.id) as feature_count,
  ROUND(100.0 * SUM(CASE WHEN pf.status = 'done' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT pf.id), 0))::INT as progress_percent,
  CASE
    WHEN pdm.status = 'delivered' THEN 'delivered'
    WHEN pdm.target_date < CURRENT_DATE AND pdm.status != 'completed' THEN 'at_risk'
    WHEN pdm.status = 'in_progress' THEN 'in_progress'
    ELSE 'on_track'
  END as health_status
FROM product_delivery_milestones pdm
LEFT JOIN business_request_pdm_links brpdm ON pdm.id = brpdm.milestone_id
LEFT JOIN project_features pf ON pdm.id = ANY(pf.linked_pdm_ids)
WHERE pdm.archived_at IS NULL
GROUP BY pdm.id, pdm.key, pdm.title, pdm.product_id, pdm.target_date, pdm.status
ORDER BY pdm.target_date;

-- View: BR with derived progress from features
CREATE OR REPLACE VIEW v_business_request_progress AS
SELECT
  br.id,
  br.key,
  br.title,
  br.product_id,
  br.primary_pdm_id,
  (SELECT title FROM product_delivery_milestones WHERE id = br.primary_pdm_id) as primary_milestone_title,
  (SELECT target_date FROM product_delivery_milestones WHERE id = br.primary_pdm_id) as milestone_target_date,
  COUNT(DISTINCT pf.id) as linked_feature_count,
  ROUND(100.0 * SUM(CASE WHEN pf.status = 'done' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT pf.id), 0))::INT as progress_from_features,
  br.urgency,
  br.process_step
FROM business_requests br
LEFT JOIN project_features pf ON br.id = ANY(pf.linked_business_request_ids)
WHERE br.deleted_at IS NULL
GROUP BY br.id, br.key, br.title, br.product_id, br.primary_pdm_id, br.urgency, br.process_step;
```

### 6.2 Key TypeORM/Prisma Queries

```typescript
// Get roadmap with all context
async function getProductRoadmapWithContext(productId: string) {
  return prisma.productDeliveryMilestone.findMany({
    where: {
      productId,
      archivedAt: null,
    },
    include: {
      businessRequestLinks: {
        include: {
          businessRequest: {
            select: {
              id: true,
              key: true,
              title: true,
              urgency: true,
              processStep: true,
            },
          },
        },
      },
      // For feature count and progress
      // (Requires aggregation; may need custom query)
    },
    orderBy: { targetDate: 'asc' },
  });
}

// Get BR with milestone and feature progress
async function getBRWithRoadmapContext(brId: string) {
  const br = await prisma.businessRequest.findUnique({
    where: { id: brId },
    include: {
      pdmLinks: {
        include: {
          milestone: true,
        },
        where: { isPrimary: true },
      },
    },
  });

  // Calculate feature-based progress
  const features = await prisma.projectFeature.findMany({
    where: {
      linkedBusinessRequestIds: {
        has: brId,
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      storyCount: true,
      completedStoryCount: true,
    },
  });

  const progressPercent = features.length > 0
    ? Math.round(
        (features.reduce((sum, f) => sum + f.completedStoryCount, 0) /
          features.reduce((sum, f) => sum + f.storyCount, 0)) *
          100
      )
    : 0;

  return { br, features, progressPercent };
}
```

---

## Phase 7: Deprecation & Cleanup (Week 7-8)

### 7.1 Deprecation Timeline

```
Week 6: Mark planned_quarter, release_id, and related code as @deprecated
Week 7: Add warnings to logs when old fields are accessed
Week 8: Remove usage from codebase
Q4 2026: Remove columns from database
```

### 7.2 Code Deprecation Examples

```typescript
/**
 * @deprecated Use getBRWithMilestones() instead.
 * This method retrieves BR progress from sprints, which is incorrect.
 * See ARCHITECTURE_GUIDANCE_BR_RELEASE_SPRINT.md for migration details.
 */
async function getBRWithReleaseInfo(brId: string): Promise<BR> {
  console.warn(
    '[DEPRECATED] getBRWithReleaseInfo() is deprecated. ' +
    'Use getBRWithMilestones() instead. ' +
    'Removal target: Q4 2026.'
  );
  // ... old logic
}
```

### 7.3 Database Cleanup Script (For Q4 2026)

```sql
-- DO NOT RUN UNTIL Q4 2026
-- Only after all code has been updated

-- Step 1: Verify no code references old columns
-- SELECT count(*) FROM code_index WHERE content ILIKE '%planned_quarter%';

-- Step 2: Final archive of deprecated data
CREATE TABLE audit.business_requests_deprecated_fields_archive AS
SELECT id, _deprecated_planned_quarter, _deprecated_release_id, archived_at FROM business_requests
WHERE _deprecated_planned_quarter IS NOT NULL OR _deprecated_release_id IS NOT NULL;

-- Step 3: Drop columns
ALTER TABLE business_requests DROP COLUMN _deprecated_planned_quarter;
ALTER TABLE business_requests DROP COLUMN _deprecated_release_id;

-- Step 4: Update CLAUDE.md to remove deprecation warnings
```

---

## Implementation Checklist

### Database (Week 1-2)
- [ ] Create `product_delivery_milestones` table
- [ ] Create `business_request_pdm_links` junction table
- [ ] Add `linked_pdm_ids` to `project_features`
- [ ] Add `primary_pdm_id`, `pdm_target_date` to `business_requests`
- [ ] Add deprecation comments to old fields
- [ ] Create indexes on new columns
- [ ] Write migration script

### Migration (Week 2-3)
- [ ] Backfill `product_delivery_milestones` from quarters
- [ ] Backfill `business_request_pdm_links`
- [ ] Backfill `project_features.linked_pdm_ids`
- [ ] Verify data integrity
- [ ] Test rollback procedure

### Services (Week 3-4)
- [ ] Create `PDMService`
- [ ] Update `BusinessRequestService`
- [ ] Update `FeatureService`
- [ ] Update `ProductRoadmapService`
- [ ] Fix BR progress calculation (features, not sprints)
- [ ] Add unit tests

### UI (Week 4-5)
- [ ] Create `<MilestoneCard>` component
- [ ] Create `<MilestoneManager>` component
- [ ] Update `<ProductRoadmapView>` to show milestones
- [ ] Update `<BRDetailView>` to show PDM + feature coverage
- [ ] Add "Show Technical Delivery" toggle
- [ ] Update Release Hub to show BR evidence (read-only)
- [ ] Hide sprint language by default

### Documentation (Week 5-6)
- [ ] Update CLAUDE.md with new entity definitions
- [ ] Update database schema documentation
- [ ] Create persona guides (Product Owner, Project Manager, Release Manager)
- [ ] Update glossary
- [ ] Write migration guide for other developers

### Testing (Week 6-7)
- [ ] Test BR creation + PDM linking
- [ ] Test progress calculation (features, not sprints)
- [ ] Test roadmap rendering with 100+ BRs
- [ ] Test cross-project feature linking
- [ ] Test Release Hub BR evidence display
- [ ] Load test with production data volume

### Cleanup (Week 7-8)
- [ ] Mark old code as @deprecated
- [ ] Add deprecation warnings to logs
- [ ] Update error messages
- [ ] Plan Q4 2026 database cleanup

---

## Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data backfill incorrect | Medium | High | Write verification queries; test with sample data first; create audit table |
| Feature→BR linking incomplete | Medium | Medium | Manual pass to find unlinked features; create dashboard to track gaps |
| Release Hub shows old BR references | Low | Medium | Migrate Release Hub queries to new PDM model; hide deprecated fields |
| Product Owners confused by transition | Medium | Low | Early communication; show side-by-side views during transition; training sessions |
| Performance degradation from new queries | Low | Medium | Index new columns; test query performance before release; cache PDM calculations |
| Sprint language still bleeds through UI | Medium | Low | Add ESLint rules to prevent sprint text in product components; code review checklist |

---

## Success Criteria

After implementation:
1. ✅ Product Owners can view 100+ BR roadmap by PDM without seeing sprint language
2. ✅ BR progress is calculated from feature completion (not sprints)
3. ✅ Feature can link to multiple BRs and PDMs
4. ✅ Release Hub shows which BRs each operational release serves (read-only evidence)
5. ✅ No direct BR→Sprint link in UI (traceability only via Feature→Sprint)
6. ✅ All services calculate BR health from milestones, not releases/sprints
7. ✅ Glossary and docs reflect new model
8. ✅ Team training completed

---

## Files to Create/Modify

### New Files
- `src/services/pdm.service.ts`
- `src/components/product-hub/MilestoneCard.tsx`
- `src/components/product-hub/MilestoneManager.tsx`
- `src/components/product-hub/MilestoneFormModal.tsx`
- `migrations/2026-06-28_create_pdm_tables.sql`
- `docs/GLOSSARY_PDM.md`
- `docs/PERSONA_GUIDES_PDM.md`

### Modified Files
- `src/services/business-request.service.ts`
- `src/services/feature.service.ts`
- `src/services/product-roadmap.service.ts`
- `src/components/product-hub/ProductRoadmapView.tsx`
- `src/components/product-hub/BRDetailView.tsx`
- `src/components/release-hub/ReleaseDetail.tsx`
- `src/types/product-roadmap.ts` (expand types)
- `src/constants/labels.ts`
- `CLAUDE.md` (update entity definitions)
- `package.json` (if new dependencies needed)

### Database Files
- `supabase/migrations/2026-06-28_create_product_delivery_milestones.sql`
- `supabase/migrations/2026-06-29_backfill_pdm_data.sql`

---

## Team Assignments (Recommended)

| Phase | Owner | Duration |
|-------|-------|----------|
| Phase 1: Schema | Backend lead | 1 week |
| Phase 2: Migration | Backend + DBA | 1-2 weeks |
| Phase 3: Services | Backend | 1 week |
| Phase 4: UI | Frontend lead | 2 weeks |
| Phase 5: Docs | Tech writer + PM | 1 week |
| Phase 6: Queries | Backend | 1 week |
| Phase 7: Cleanup | Backend | 1 week |

**Critical path:** Schema → Migration → Services → UI (can parallelize phases 3 & 4)

---

**Document prepared:** 2026-06-28  
**Status:** Ready for implementation  
**Next step:** Review and assign week-1 work to backend/DBA team
