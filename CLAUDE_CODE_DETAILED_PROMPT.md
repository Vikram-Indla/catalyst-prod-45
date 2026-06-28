# Claude Code: Detailed Implementation Prompt
## Catalyst Product Milestone + Release Artifacts Architecture

**Use this exact prompt when invoking Claude Code or passing to team.**

---

## PART 1: DATABASE SCHEMA CHANGES

### 1.1 RENAME Table
```
TABLE: product_releases
NEW NAME: product_milestones

Fields to keep:
  id UUID PK
  product_id UUID FK → products(id)
  name VARCHAR → RENAME to 'title'
  description TEXT
  start_date DATE
  target_date DATE (keep as-is)
  status VARCHAR
  sequence INTEGER
  archived_at TIMESTAMP
  created_at TIMESTAMP
  updated_at TIMESTAMP

Fields to add:
  + quarter VARCHAR(10)  [Q1, Q2, Q3, Q4]
  + key VARCHAR(50) UNIQUE

Fields to drop:
  (none - keep all for backward compat during transition)

Indexes to create:
  - idx_product_milestones_product_id
  - idx_product_milestones_quarter
  - idx_product_milestones_target_date
  - idx_product_milestones_status
```

### 1.2 MODIFY Table: business_requests
```
TABLE: business_requests

Fields to DEPRECATE (keep, don't drop):
  planned_quarter VARCHAR → RENAME to _deprecated_planned_quarter
  release_id UUID FK → RENAME to _deprecated_release_id

No new fields to business_requests directly.
(Milestone linking is via junction table, see 1.3)

Constraints:
  - Add comment: "DEPRECATED 2026-06-28. Use business_request_milestone_links instead."
```

### 1.3 CREATE NEW Table: business_request_milestone_links
```
TABLE: business_request_milestone_links [NEW JUNCTION]

Fields:
  id UUID PK (gen_random_uuid)
  business_request_id UUID FK → business_requests(id) ON DELETE CASCADE
  milestone_id UUID FK → product_milestones(id) ON DELETE CASCADE
  sequence_in_milestone INTEGER (1, 2, 3... for phases)
  is_primary BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()
  created_by UUID FK → profiles(id) [nullable]

Constraints:
  UNIQUE(business_request_id, milestone_id)
  CHECK (sequence_in_milestone IS NULL OR sequence_in_milestone > 0)

Indexes:
  - idx_br_milestone_links_br_id
  - idx_br_milestone_links_milestone_id
  - idx_br_milestone_links_is_primary
  - idx_br_milestone_links_sequence

Trigger:
  - on UPDATE: update updated_at timestamp
```

### 1.4 MODIFY Table: project_features
```
TABLE: project_features

Fields to ADD:
  + linked_business_request_ids UUID[] DEFAULT '{}'
    [Array of BR UUIDs this feature contributes to]
  
  + linked_milestone_ids UUID[] DEFAULT '{}'
    [Array of milestone UUIDs this feature contributes to]

Indexes to CREATE:
  - CREATE INDEX idx_project_features_linked_br_ids 
    ON project_features USING GIN(linked_business_request_ids);
  
  - CREATE INDEX idx_project_features_linked_milestone_ids 
    ON project_features USING GIN(linked_milestone_ids);

Notes:
  - These are denormalized for query performance
  - linked_milestone_ids is derived from linked_br_ids via junction table
  - Keep both for flexibility in querying
```

### 1.5 MODIFY Table: project_epics
```
TABLE: project_epics

Fields to ADD:
  + linked_milestone_ids UUID[] DEFAULT '{}'
    [Array of milestone UUIDs this epic contributes to]

Indexes to CREATE:
  - CREATE INDEX idx_project_epics_linked_milestone_ids 
    ON project_epics USING GIN(linked_milestone_ids);
```

### 1.6 CREATE NEW Table: release_artifacts
```
TABLE: release_artifacts [NEW - POLYMORPHIC]

Purpose: Hold all artifact types (BR, Feature, Epic, Incident, Story) in one table
This is a Release Hub entity.

Fields:
  id UUID PK (gen_random_uuid)
  release_id UUID NOT NULL FK → releases(id) ON DELETE CASCADE
  artifact_type VARCHAR(50) NOT NULL
    [ENUM: 'business_request' | 'feature' | 'epic' | 'production_incident' | 'story']
  artifact_id UUID NOT NULL
    [Polymorphic FK - no direct constraint; resolved via artifact_type]
  artifact_label VARCHAR(255)
    [Display label, e.g., "BR-42", "Feature: User Registration"]
  created_at TIMESTAMPTZ DEFAULT NOW()
  created_by UUID FK → profiles(id) [nullable]

Constraints:
  UNIQUE(release_id, artifact_type, artifact_id)
  [Prevent duplicate artifacts in same release]

Indexes:
  - idx_release_artifacts_release_id
  - idx_release_artifacts_artifact_type
  - idx_release_artifacts_artifact_id
  - idx_release_artifacts_artifact_label (for search)
```

### 1.7 CREATE NEW Table: release_sprints (formalize)
```
TABLE: release_sprints [NEW JUNCTION - if not already exists]

Purpose: Link releases to sprints across projects

Fields:
  release_id UUID NOT NULL FK → releases(id) ON DELETE CASCADE
  sprint_id UUID NOT NULL FK → sprints(id) ON DELETE CASCADE
  artifact_count INTEGER [nullable - cached story count]
  created_at TIMESTAMPTZ DEFAULT NOW()

Primary Key:
  (release_id, sprint_id)

Indexes:
  - idx_release_sprints_release_id
  - idx_release_sprints_sprint_id
```

### 1.8 CREATE SQL Views (for product roadmap queries)
```
View 1: v_business_request_with_milestones
SELECT: BR details + linked milestones + feature progress

View 2: v_release_with_artifacts
SELECT: Release details + artifact counts by type

View 3: v_product_roadmap_timeline
SELECT: Milestones + releases + dates for timeline visualization

View 4: v_release_artifact_options
SELECT: Available artifacts for release selection (filters incomplete BRs)
```

---

## PART 2: TypeScript Type Definitions

### 2.1 CREATE NEW File: src/types/product-milestone.ts
```typescript
export interface ProductMilestone {
  id: string;
  key: string;
  title: string;
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
  linkedBRs: Array<{ id: string; key: string; title: string }>;
  linkedFeatures: Array<{ id: string; name: string; status: string }>;
  progressPercent: number;
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

export interface ReleaseArtifact {
  id: string;
  releaseId: string;
  artifactType: 'business_request' | 'feature' | 'epic' | 'production_incident' | 'story';
  artifactId: string;
  artifactLabel: string;
  createdAt: string;
  createdBy?: string;
}

export interface ReleaseArtifactOption {
  artifactType: ReleaseArtifact['artifactType'];
  artifactId: string;
  label: string;
  completionPercent?: number;
  isComplete?: boolean;
  isSelectable: boolean; // Only complete BRs selectable
}
```

### 2.2 MODIFY File: src/types/business-request.ts
```typescript
// ADD to BusinessRequest interface:
export interface BusinessRequest {
  // ... existing fields

  // DEPRECATED (mark with @deprecated)
  planned_quarter?: string; // DEPRECATED → use milestones instead
  release_id?: string; // DEPRECATED → use Release Hub instead

  // NEW (provided by service layer, not stored in BR)
  // Exclude from database, add via enrichment in service
}

// ADD new input types:
export interface CreateBusinessRequestWithMilestoneInput {
  title: string;
  description?: string;
  urgency?: string;
  endDate?: string; // Target date for primary milestone
  productId: string;
  primaryMilestoneId?: string; // If creating BR with milestone
  milestonePhase?: number;
}
```

### 2.3 MODIFY File: src/types/product-roadmap.ts
```typescript
// REPLACE: Demand type with updated structure
export interface Demand {
  id: string;
  key: string;
  title: string;
  status: string; // Dynamic process_step
  // DEPRECATED:
  // plannedQuarter: PlannedQuarter;
  // plannedQuarters: PlannedQuarter[];
  
  // NEW:
  milestones?: BusinessRequestMilestoneLink[];
  primaryMilestone?: ProductMilestone;
  linkedFeatures?: Feature[];
  progressPercent: number; // From features, NOT sprints
  
  urgency: string;
  ownerId: string;
}
```

### 2.4 CREATE NEW File: src/types/release-artifact.ts
```typescript
export interface ReleaseWithArtifacts {
  id: string;
  key: string;
  name: string;
  releaseDate: string;
  status: 'planning' | 'in_progress' | 'released' | 'archived';
  artifacts: ReleaseArtifact[];
  sprints: ReleasedSprint[];
  linkedBRs?: BusinessRequest[]; // Derived from artifacts
}

export interface ReleasedSprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  storyCount: number;
}

export interface ReleaseArtifactInput {
  artifactType: ReleaseArtifact['artifactType'];
  artifactId: string;
  artifactLabel?: string;
}
```

---

## PART 3: Services & Business Logic

### 3.1 CREATE NEW File: src/services/product-milestone.service.ts
```typescript
// Methods to implement:
export class ProductMilestoneService {
  // CRUD
  async createMilestone(input: CreateMilestoneInput): Promise<ProductMilestone>
  async getMilestone(id: string): Promise<ProductMilestoneWithProgress>
  async listMilestonesByProduct(productId: string, filters?: MilestoneFilters): Promise<ProductMilestoneWithProgress[]>
  async updateMilestone(id: string, input: UpdateMilestoneInput): Promise<ProductMilestone>
  async archiveMilestone(id: string): Promise<void>

  // Linking
  async linkBRToMilestone(brId: string, milestoneId: string, phase?: number, isPrimary?: boolean): Promise<void>
  async unlinkBRFromMilestone(brId: string, milestoneId: string): Promise<void>
  async linkFeaturesToMilestone(featureIds: string[], milestoneId: string): Promise<void>

  // Progress & Health
  async calculateMilestoneProgress(milestoneId: string): Promise<MilestoneProgress>
  async calculateMilestoneHealth(milestoneId: string): Promise<HealthStatus>
  
  // Batch operations
  async bulkLinkBRsToMilestone(brIds: string[], milestoneId: string): Promise<void>
}

// Key logic:
// - Query v_business_request_with_milestones for progress
// - Calculate progress from linked features, not sprints
// - Support multiple BRs per milestone, multiple milestones per BR
```

### 3.2 MODIFY File: src/services/business-request.service.ts
```typescript
// ADD new methods:
export class BusinessRequestService {
  // DEPRECATED (mark with @deprecated JSDoc)
  async getWithReleaseInfo(brId: string): Promise<BR> {
    console.warn('[DEPRECATED] Use getBRWithMilestones() instead');
  }

  // NEW METHODS
  async getBRWithMilestones(brId: string): Promise<{
    br: BusinessRequest;
    milestones: ProductMilestoneWithProgress[];
    primaryMilestone?: ProductMilestone;
    linkedFeatures: FeatureWithStatus[];
    progressPercent: number;
  }>

  async calculateBRProgressFromFeatures(brId: string): Promise<{
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    notStartedFeatures: number;
    progressPercent: number;
  }>

  async listBRsByMilestone(milestoneId: string): Promise<BusinessRequest[]>
  
  async addBRToMilestone(brId: string, milestoneId: string, phase?: number): Promise<void>
  
  async removeBRFromMilestone(brId: string, milestoneId: string): Promise<void>
}

// Key changes:
// - Remove all sprint-based progress calculation
// - Use feature completion for progress
// - Link BRs to milestones, not quarters/releases
```

### 3.3 MODIFY File: src/services/feature.service.ts
```typescript
// ADD new methods:
export class FeatureService {
  async getFeatureWithBRsAndMilestones(featureId: string): Promise<{
    feature: Feature;
    linkedBRs: BusinessRequest[];
    linkedMilestones: ProductMilestone[];
  }>

  async linkFeatureToBR(featureId: string, brId: string): Promise<void>
  
  async linkFeatureToMilestone(featureId: string, milestoneId: string): Promise<void>
  
  async getFeatureProgress(featureId: string): Promise<FeatureProgress>
  
  async updateFeatureProgress(featureId: string): Promise<void>
}

// Key changes:
// - Add linked_business_request_ids[] management
// - Add linked_milestone_ids[] management
// - Calculate feature progress from story completion
```

### 3.4 CREATE NEW File: src/services/release-artifact.service.ts
```typescript
export class ReleaseArtifactService {
  // Artifact management
  async addArtifactToRelease(releaseId: string, artifact: ReleaseArtifactInput): Promise<void>
  
  async removeArtifactFromRelease(releaseId: string, artifactId: string, artifactType: string): Promise<void>
  
  async getArtifactsForRelease(releaseId: string): Promise<ReleaseArtifact[]>
  
  // Selection logic
  async getAvailableArtifactsForRelease(releaseId: string): Promise<ReleaseArtifactOption[]>
  // Returns: complete BRs, features, epics, incidents (filtered by selectability)
  
  // Validation
  async validateBRCanBeArtifact(brId: string): Promise<{ isComplete: boolean; reason?: string }>
  // Only 100% complete BRs can be selected as direct artifacts
}

// Key logic:
// - Polymorphic artifact handling (BR, Feature, Epic, Incident, Story)
// - Validation: complete BR = selectable; partial BR = cannot select, use features instead
// - Caching: artifact_label for display
```

### 3.5 MODIFY File: src/services/release.service.ts (if exists)
```typescript
// ADD new methods:
export class ReleaseService {
  // Core
  async createRelease(input: CreateReleaseInput): Promise<Release>
  async getRelease(id: string): Promise<ReleaseWithArtifacts>
  
  // Artifacts
  async addArtifactToRelease(releaseId: string, artifact: ReleaseArtifactInput): Promise<void>
  async removeArtifactFromRelease(releaseId: string, artifactId: string, artifactType: string): Promise<void>
  
  // Sprints
  async linkSprintToRelease(releaseId: string, sprintId: string): Promise<void>
  async unlinkSprintFromRelease(releaseId: string, sprintId: string): Promise<void>
  
  // Derived data
  async getReleaseImpactOnBRs(releaseId: string): Promise<{
    completedBRs: string[];
    partialBRs: Array<{ brId: string; featuresInRelease: number; totalFeatures: number }>;
  }>
}

// Key changes:
// - Split from old Release concept (now only = operational deployment)
// - Use release_artifacts for all artifact types
// - Link sprints cross-project
```

---

## PART 4: React Components

### 4.1 CREATE NEW Component: src/components/product-hub/MilestoneCard.tsx
```typescript
export interface MilestoneCardProps {
  milestone: ProductMilestoneWithProgress;
  onClick?: (milestoneId: string) => void;
  onEdit?: (milestoneId: string) => void;
  onDelete?: (milestoneId: string) => void;
}

export function MilestoneCard(props: MilestoneCardProps) {
  // Render:
  // - Title
  // - Quarter badge
  // - Date range
  // - Progress bar (from features)
  // - BR count
  // - Health status
  // - Action buttons
}
```

### 4.2 CREATE NEW Component: src/components/product-hub/MilestoneManager.tsx
```typescript
// Purpose: Manage milestones for a product

export function MilestoneManager({ productId }: { productId: string }) {
  // Render:
  // - Title & Create button
  // - Milestone timeline (visual)
  // - Milestone table (sortable by date, status)
  // - Actions: Edit, Delete, View BRs
}
```

### 4.3 CREATE NEW Component: src/components/product-hub/MilestoneFormModal.tsx
```typescript
export interface MilestoneFormModalProps {
  milestone?: ProductMilestone; // undefined = create mode
  productId: string;
  onSave: (milestone: ProductMilestone) => void;
  onClose: () => void;
}

export function MilestoneFormModal(props: MilestoneFormModalProps) {
  // Form fields:
  // - Key (PDM-2026-Q3-INV)
  // - Title
  // - Quarter (dropdown: Q1, Q2, Q3, Q4)
  // - Start Date (date picker)
  // - Target Date (date picker)
  // - Status (dropdown)
  // - Description (textarea)
  // - Link BRs (multi-select)
  // - Link Features (multi-select)
}
```

### 4.4 CREATE NEW Component: src/components/release-hub/ReleaseArtifactSelector.tsx
```typescript
export interface ReleaseArtifactSelectorProps {
  releaseId: string;
  onArtifactsSelected: (artifacts: ReleaseArtifactInput[]) => void;
  onClose: () => void;
}

export function ReleaseArtifactSelector(props: ReleaseArtifactSelectorProps) {
  // Three sections:
  // 1. Complete Business Requests (100% only)
  // 2. Features & Epics (from partial BRs)
  // 3. Production Incidents
  
  // Each section: checkbox list with labels, counts, health status
  // Bottom: Confirm button
}
```

### 4.5 MAJOR UPDATE: src/components/product-hub/ProductRoadmapView.tsx
```typescript
// Current rendering: Shows quarters, sprints
// NEW rendering: Shows milestones, hides sprints

export function ProductRoadmapView({ productId }: Props) {
  // Add toggle: "Show Technical Delivery"
  
  // Main view (default):
  // - Timeline horizontal axis (months)
  // - Milestones as vertical sections
  // - BRs grouped under milestones
  // - Progress bars for each BR
  // - Releases floating on timeline at actual ship date
  
  // Technical view (collapsed by default):
  // - Sprints, stories, project allocation
  // - Shown only when toggle is ON
  
  // NO sprint language in main view
  // NO sprint chips by default
}
```

### 4.6 MAJOR UPDATE: src/components/product-hub/BRDetailView.tsx
```typescript
// Current: Shows quarters, releases, sprints
// NEW: Shows milestones, features, release evidence

export function BRDetailView({ brId }: Props) {
  // Sections (in order):
  // 1. Roadmap Milestone
  //    - Show all milestones linked to this BR
  //    - Show phase number (Phase 1, 2, 3)
  
  // 2. Delivery Features
  //    - Show all features linked to this BR
  //    - Progress bar (feature completion %)
  //    - Feature status (done, in progress, not started)
  
  // 3. Release Evidence (collapsed by default)
  //    - Which releases have shipped this BR?
  //    - Which releases are coming?
  
  // 4. Technical Delivery (collapsed by default)
  //    - Sprints, stories, project context
  //    - Only shown on demand
  
  // NO sprint language in main sections
  // NO sprint chips visible by default
}
```

### 4.7 MAJOR UPDATE: src/components/release-hub/ReleaseDetail.tsx
```typescript
// Current: Shows sprints linked
// NEW: Shows artifacts linked + BR impact

export function ReleaseDetail({ releaseId }: Props) {
  // Sections:
  // 1. Release Artifacts
  //    - List of all artifacts (BR, Features, Epics, Incidents)
  //    - Add/Remove buttons
  
  // 2. Business Impact (NEW)
  //    - Which BRs are impacted by this release?
  //    - Show as read-only linked BRs
  //    - Derived from artifacts
  
  // 3. Linked Sprints
  //    - Sprints from various projects
  //    - Story count per sprint
  
  // 4. Deployment Pipeline
  //    - Status tracking
  //    - Sign-offs
}
```

---

## PART 5: Queries & Data Access

### 5.1 Create Supabase Queries
```typescript
// Query milestones by product
export const queryMilestonesByProduct = (productId: string) => {
  return supabase
    .from('product_milestones')
    .select(`
      *,
      business_request_milestone_links(
        business_request_id,
        business_requests(id, key, title)
      )
    `)
    .eq('product_id', productId)
    .order('target_date');
};

// Query BR with milestones
export const queryBRWithMilestones = (brId: string) => {
  return supabase
    .from('business_requests')
    .select(`
      *,
      business_request_milestone_links(
        milestone_id,
        product_milestones(*)
      ),
      project_features(*)
    `)
    .eq('id', brId);
};

// Query release artifacts
export const queryReleaseArtifacts = (releaseId: string) => {
  return supabase
    .from('release_artifacts')
    .select('*')
    .eq('release_id', releaseId);
};
```

---

## PART 6: Tests

### 6.1 Create Unit Tests
```typescript
// src/services/__tests__/product-milestone.service.spec.ts
describe('ProductMilestoneService', () => {
  it('should create milestone with quarter and dates');
  it('should link BR to milestone with phase number');
  it('should calculate progress from linked features');
  it('should handle multiple milestones per BR');
  it('should update milestone status');
});

// src/services/__tests__/release-artifact.service.spec.ts
describe('ReleaseArtifactService', () => {
  it('should allow complete BR as artifact');
  it('should NOT allow incomplete BR as direct artifact');
  it('should allow features from incomplete BR');
  it('should validate artifact types');
});
```

### 6.2 Create Integration Tests
```typescript
// tests/integration/product-roadmap.integration.spec.ts
describe('Product Roadmap Integration', () => {
  it('should show milestones on timeline');
  it('should show BRs grouped under milestones');
  it('should calculate BR progress from features');
  it('should hide sprint language in product view');
  it('should show releases at actual ship date');
});
```

---

## SUMMARY TABLE: What Changes

| Item | Current | New | Action |
|------|---------|-----|--------|
| **product_releases** | Table | product_milestones | RENAME |
| **name (releases)** | Field | title | RENAME |
| **+ quarter** | — | Field | ADD |
| **+ key** | — | Field | ADD |
| **planned_quarter (BR)** | Field | _deprecated_planned_quarter | RENAME (backup) |
| **release_id (BR)** | Field | _deprecated_release_id | RENAME (backup) |
| **business_request_milestone_links** | — | Junction table | CREATE |
| **linked_business_request_ids** | — | project_features field | ADD |
| **linked_milestone_ids** | — | project_features field | ADD |
| **release_artifacts** | — | Polymorphic table | CREATE |
| **release_sprints** | Possibly exists | Formalized junction | CREATE/UPDATE |
| **Sprint language in Product Hub** | Visible | Hidden by default | CHANGE UI |
| **BR progress** | Sprint % | Feature % | CHANGE LOGIC |
| **Roadmap view** | Quarters | Milestones | REDESIGN |
| **BR detail modal** | Quarters, releases, sprints | Milestones, features, evidence | REDESIGN |

---

## FINAL DELIVERY CHECKLIST FOR CLAUDE CODE

When you invoke Claude Code (or give to team), include this checklist:

**DATABASES (Week 1)**
- [ ] Migration 001: Rename product_releases → product_milestones
- [ ] Migration 002: Update business_requests table (deprecate fields)
- [ ] Migration 003: Create business_request_milestone_links junction
- [ ] Migration 004: Add fields to project_features
- [ ] Migration 005: Add fields to project_epics
- [ ] Migration 006: Create release_artifacts table
- [ ] Migration 007: Create/formalize release_sprints junction
- [ ] Create SQL views (v_business_request_with_milestones, etc.)
- [ ] Backfill data (quarters → milestones)
- [ ] Verify all data integrity

**BACKEND (Week 2-3)**
- [ ] Create src/types/product-milestone.ts
- [ ] Update src/types/business-request.ts
- [ ] Update src/types/product-roadmap.ts
- [ ] Create src/types/release-artifact.ts
- [ ] Create src/services/product-milestone.service.ts
- [ ] Update src/services/business-request.service.ts
- [ ] Update src/services/feature.service.ts
- [ ] Create src/services/release-artifact.service.ts
- [ ] Add unit tests for all services
- [ ] Add integration tests

**FRONTEND (Week 3-5)**
- [ ] Create MilestoneCard component
- [ ] Create MilestoneManager component
- [ ] Create MilestoneFormModal component
- [ ] Create ReleaseArtifactSelector component
- [ ] Update ProductRoadmapView (MAJOR)
- [ ] Update BRDetailView (MAJOR)
- [ ] Update ReleaseDetail (MAJOR)
- [ ] Add "Show Technical Details" toggle
- [ ] Hide sprint language in product views
- [ ] Add e2e tests

**DOCUMENTATION (Week 5-6)**
- [ ] Update CLAUDE.md with new entities
- [ ] Create API reference docs
- [ ] Create persona guides (Product Owner, Release Manager)
- [ ] Create glossary
- [ ] Create migration guide for old field references
- [ ] Add JSDoc to all services and components

**DEPRECATION (Week 7)**
- [ ] Add @deprecated markers to old methods
- [ ] Add console warnings for deprecated field access
- [ ] Add ESLint rules to prevent new usage
- [ ] Update error messages

**MONITORING (Week 8)**
- [ ] Set up metrics for milestone creation
- [ ] Set up metrics for feature progress calculation
- [ ] Set up alerts for deprecated field usage
- [ ] Test load performance with 100+ BRs

---

**Status:** Ready to give to Claude Code  
**Format:** Copy this file + schema changes file + visual diagram  
**Next:** Assign to team with week-1 priority on database work
