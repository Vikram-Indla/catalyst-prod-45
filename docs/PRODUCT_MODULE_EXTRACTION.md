# Product Module Complete Extraction
## For Claude Rebuild — Product Backlog, Kanban, Roadmap

> Generated: 2026-02-16
> Purpose: Complete data model, scoring engine, process flow, and architecture extraction for end-to-end rebuild.

---

## 1. DATABASE SCHEMA: `business_requests` Table

The core entity is the **Business Request** (also called "Demand"). All three views (Backlog, Kanban, Roadmap) operate on this single table.

### Table: `business_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Auto-generated |
| `request_key` | text | Sequential key: MIM-001, MIM-002, etc. |
| `title` | text | Required. Summary of the demand |
| `description` | text | Nullable. Full description |
| `platform` | text | Web, Mobile, API, Integration, Infrastructure |
| `complexity` | text | Low, Medium, High, Very High |
| `urgency` | text | Low, Normal, High, Critical |
| `track` | text | Digital, Core Banking, Payments, Analytics, Infrastructure |
| `requestor` | UUID | FK to profiles.id (who submitted) |
| `assignee` | UUID | FK to profiles.id (who's working on it) |
| `business_justification` | text | Why this request matters |
| `department` | text | Department name or ID |
| `department_id` | UUID | FK to departments.id |
| `business_owner` | text | Business owner name |
| `business_owner_id` | UUID | FK to business_owners.id |
| `product_id` | UUID | FK to products.id |
| `process_step` | text | Current workflow stage (dynamic from `demand_process_steps` table) |
| `health` | text | green, amber, red |
| `rank` | integer | Stack rank position (1 = highest) |
| `progress` | integer | 0-100 completion percentage |
| `start_date` | timestamp | Business request start |
| `end_date` | timestamp | Business request end / target |
| `impl_start_date` | timestamp | Implementation kickoff date |
| `impl_target_end_date` | timestamp | Implementation target complete |
| `delivery_platform` | text | One of: Senaei Platform, Innovation Platform, Tahommena, Compass, Mini Apps, Website, Investor Journey, Catalyst, RHQ Services, Other |
| `delivery_track` | text | Digital, Core Banking, Payments, Analytics |
| `planned_quarter` | text[] | Array of quarters e.g. ["Q1 2026"] |
| **Scoring Fields** | | |
| `executive_urgency` | integer | 0-10 scale |
| `business_value` | integer | 0-10 scale |
| `complexity_score` | integer | 0-10 scale |
| `business_score` | integer | Computed: (EU×0.4 + BV×0.4 + (10-CS)×0.2) × 10 |
| `priority_tier` | text | Derived from score: critical/high/medium/low/unscored |
| `is_force_ranked` | boolean | Manual rank override flag |
| `rank_override_justification` | text | Required when force-ranked |
| **Portfolio & Estimation** | | |
| `dependencies` | text | |
| `risk_rating` | text | Low, Medium, High, Critical |
| `portfolio_comments` | text | |
| `proposed_solution` | text | |
| `estimated_effort` | text | |
| `estimated_cost` | numeric | |
| `integration_required` | boolean | |
| `integration_systems` | text[] | SAP, Salesforce, Oracle, etc. |
| `technical_validator` | text | |
| `estimation_notes` | text | |
| `estimation_dependencies` | text | |
| `estimation_risk_rating` | text | |
| `estimated_cost_sar` | numeric | |
| `approval_inputs` | text | |
| `portfolio_decision` | text | Pending, Approve, Reject, Defer, Need More Info |
| **Approval** | | |
| `approver_name` | text | |
| `approval_date` | timestamp | |
| `approval_decision` | text | Approved, Rejected, Deferred, Conditionally Approved |
| `approved_budget_ceiling` | numeric | |
| `approval_remarks` | text | |
| **Readiness** | | |
| `functional_spec_link` | text | |
| `acceptance_criteria` | text | |
| `jira_epic_link` | text | |
| `environment_dependency` | text | |
| `readiness_checklist` | JSONB | `{requirements_documented, technical_design_approved, resources_allocated, environment_ready, test_cases_prepared}` |
| **Implementation** | | |
| `implementation_owner` | text | |
| `key_risks_remarks` | text | |
| `outcome_summary` | text | |
| `qa_remarks` | text | |
| **Support / Closure** | | |
| `support_owner` | text | |
| `support_remarks` | text | |
| `resolution_category` | text | Completed Successfully, Partially Completed, Cancelled, Rolled Back |
| `implementation_outcome` | text | Live in Production, Pending Go-Live, Failed, Decommissioned |
| **On Hold** | | |
| `on_hold_reason` | text | |
| `expected_resume_date` | timestamp | |
| `on_hold_comment` | text | |
| **Budget** | | |
| `funding_status` | text | |
| `budget_year` | text | |
| `budget_type` | text[] | |
| `approved_budget_sar` | numeric | |
| `current_year_budget_sar` | numeric | |
| `budget_owner_name` | text | |
| `project_manager_user_id` | UUID | |
| `planned_external_spend_sar` | numeric | |
| `internal_effort_cost_sar` | numeric | |
| `contract_type` | text | |
| `primary_vendor_name` | text | |
| `po_numbers` | text[] | |
| `contract_start_date` | timestamp | |
| `contract_end_date` | timestamp | |
| `delivery_model` | text | |
| `capacity_status` | text | |
| `internal_effort_pct` | numeric | |
| `vendor_effort_pct` | numeric | |
| `funding_assumptions` | text | |
| `capacity_risks` | text | |
| **Metadata** | | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| `created_by` | UUID | |
| `deleted_at` | timestamp | Soft delete |
| `ea_review_required` | boolean | |
| `end_date_locked` | boolean | |
| `end_date_locked_by` | UUID | |
| `end_date_locked_at` | timestamp | |

### Related Tables

#### `demand_process_steps` (Dynamic workflow stages)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `value` | text | Key used in process_step (e.g., "new_request", "analyse") |
| `label` | text | Display label (e.g., "New Request", "Analyse") |
| `sort_order` | integer | Column order in Kanban |
| `is_active` | boolean | Whether step is visible |

Default steps: new_request → analyse → in_review → approved → ready_to_implement → implement → closed | rejected | on_hold

#### `business_request_audit_logs`
| Column | Type | Notes |
|--------|------|-------|
| `business_request_id` | UUID FK | |
| `actor_id` | UUID | |
| `actor_name` | text | |
| `action` | text | CREATE, UPDATE, justification_updated |
| `field_changed` | text | |
| `old_value` | text | |
| `new_value` | text | |

#### `business_request_links` (Links to features, epics, etc.)
| Column | Type | Notes |
|--------|------|-------|
| `business_request_id` | UUID FK | |
| `linked_item_id` | UUID | |
| `linked_item_type` | text | "feature", "epic", etc. |

#### `products` (Used for grouping in Roadmap)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | text | |
| `code` | text | |
| `color` | text | |
| `owner_id` | UUID | |
| `is_active` | boolean | |
| `sort_order` | integer | |

#### `business_owners`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | text | |
| `is_active` | boolean | |

#### `departments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | text | |
| `is_active` | boolean | |
| `sort_order` | integer | |

---

## 2. SCORING ENGINE

### Formula
```
Business Score = (Executive Urgency × 0.4 + Business Value × 0.4 + (10 - Complexity) × 0.2) × 10
```

### Inputs (all 0-10 integer scale)
1. **Executive Urgency** — 0 = no urgency, 10 = critical
2. **Business Value** — 0 = minimal, 10 = very high strategic value
3. **Complexity** — 0 = simple, 10 = very complex (INVERTED in formula: lower complexity = higher score)

### Output
- **business_score**: 0-100 integer
- **priority_tier**: Derived from score:
  - ≥80 → `critical`
  - ≥60 → `high`
  - ≥40 → `medium`
  - <40 → `low`
  - null/0 → `unscored`

### Rank Override System
- Users can manually override the auto-calculated rank
- When overridden: `is_force_ranked = true`, scoring inputs become **locked**
- Requires `rank_override_justification` (text, mandatory)
- Override shifts other items' ranks down to accommodate
- Audit log tracks justification changes

### Scoring Stats
- System tracks total demands, scored count, unscored count
- Filter views: "Show scored only" / "Show unscored only"

---

## 3. PROCESS WORKFLOW (Demand Lifecycle)

```
New Request → Analyse → In Review → Approved → Ready to Implement → Implement → Closed
                                                                              → Rejected
                                                                              → On-Hold
```

Process steps are **dynamic** — managed from `demand_process_steps` table (admin-configurable).
Kanban columns are built from this table at runtime.

### Process Step to Roadmap Status Mapping
```
new → proposed
demand_analysis → analyzing
solution_review → analyzing
approved → approved
in_progress → in_progress
implementation → in_progress
done → done
closed → done
cancelled → cancelled
rejected → cancelled
on_hold → analyzing
```

---

## 4. VIEWS

### A. Product Backlog (Split Panel — `/industry/backlog`)
**File**: `src/modules/product-backlog/pages/CatalystDemandList.tsx`

Layout: Left panel = compact list, Right panel = full detail of selected item

**List Panel columns**: Request ID, Summary, Status (dot badge), Score, Priority (color badge), Rank, Department, Business Owner, Quarter

**Features**:
- Search (shared with Kanban via `useIndustryViewStore` Zustand store)
- Quick filters: All, High Priority, Unscored, My Items
- Scoring filter: All / Scored / Unscored (shared state)
- Advanced filter dialog: status, priority, department, business owner, quarter, score range
- Split-panel detail view with inline editing
- Clone, Delete, Export CSV
- Real-time updates via Supabase channel
- Drag-drop reordering (ranks)

**Enterprise Table variant**: `src/modules/product-backlog/components/ProductBacklogEnterpriseTable.tsx`
- Uses `CatalystEnterpriseTable` component
- Drag-drop row reordering
- Inline editing for status and summary
- Checkbox multi-select

### B. Product Kanban (`/industry/kanban`)
**File**: `src/modules/kanban/pages/CatalystDemandKanban.tsx`

**Dynamic columns** from `demand_process_steps` table + "_uncategorized" catch-all

**Card data**: ID, Summary, Status, Score, Rank, Assignee, Business Owner, Department, Platform, Days in Column

**Features**:
- Drag & drop between columns (updates `process_step`)
- Group by: None, Assignee, Department, Business Owner (swimlanes)
- Scoring filter: All / Scored / Unscored
- Compact/Regular/Relaxed density modes
- Column collapse/expand
- CSV export
- Real-time subscription
- Shared search/filter state with Backlog via Zustand store

**Priority derivation** (visual only, from business_score):
- ≥80 → critical (red)
- ≥60 → high (orange)
- ≥40 → medium (blue)
- <40 → low (green)

### C. Product Roadmap (`/industry/roadmaps`)
**File**: `src/modules/product-roadmap/components/ProductRoadmap.tsx`

**Architecture**: Split view — left list panel + right timeline panel

**Data source**: `business_requests` table, mapped to `RoadmapDemand` type

**Timeline features**:
- Zoom: month / quarter / year
- Navigate: prev/next/today
- Drag to reorder rows
- Drag bars to change dates
- Grouping: by product, status, priority, assignee
- Filter dialog: search, status, priority, product, assignee, platform, health, date range
- Today marker
- Export dialog (PDF)
- Milestones: Linked Features appear as markers on the timeline bar

**Date resolution logic**:
- Start: `impl_start_date` → `start_date` → `created_at`
- End: `impl_target_end_date` → `end_date` → null (open-ended bar)

**Roadmap Engine** (Generic reusable): `src/components/roadmap/RoadmapEngine.tsx`
- Config-driven via `RoadmapConfig` interface
- Supports multiple roadmap types (Business Request, Epic, Theme)
- Each roadmap type has its own config file in `src/config/roadmaps/`

**Business Request Roadmap Config** (`src/config/roadmaps/businessRequestRoadmapConfig.ts`):
- Status colors: proposed (blue), analyzing (amber), approved (green), in_progress (purple), done (gray), cancelled (muted)
- Bilingual labels (English + Arabic)
- Groups by Product
- Shows linked Features as milestones

---

## 5. SHARED STATE

### Zustand Store: `useIndustryViewStore`
Shared between Backlog and Kanban views:
- `searchQuery` / `setSearchQuery`
- `scoringFilter` / `setScoringFilter` (all / scored / unscored)

### React Query Keys
- `['business-requests']` — main list (shared across all views)
- `['business-request', id]` — single item detail
- `['business-request-audit']` — audit log
- `['demand-process-steps']` — dynamic workflow columns
- `['roadmap-demands', filters]` — roadmap-specific filtered query
- `['business-request-roadmap-items', filters]` — roadmap engine adapter
- `['kanban-team-members']` — profiles for avatars
- `['kanban-departments']` — department names

---

## 6. KEY HOOKS

| Hook | File | Purpose |
|------|------|---------|
| `useBusinessRequests(search?)` | `src/hooks/useBusinessRequests.ts` | Main CRUD: list, create, update, delete, duplicate. Real-time subscription. Resolves user IDs to names. |
| `useBusinessRequest(id)` | same | Single item with real-time |
| `useCreateBusinessRequest()` | same | Insert with MIM-XXX key generation + audit log |
| `useUpdateBusinessRequest()` | same | Update with field-level audit logging + rank shifting |
| `useDeleteBusinessRequest()` | same | Soft delete (sets deleted_at) |
| `useDuplicateBusinessRequest()` | same | Clone with title "(Copy)", reset scoring |
| `useKanbanData()` | `src/modules/kanban/hooks/useKanbanData.ts` | Maps business_requests to KanbanTicket, derives priority from score |
| `useKanbanColumns()` | `src/modules/kanban/hooks/useProcessSteps.ts` | Dynamic columns from demand_process_steps |
| `useRoadmapDemands(filters)` | `src/modules/product-roadmap/hooks/useRoadmapDemands.ts` | Filtered business_requests with product join for roadmap |
| `useBusinessRequestRoadmapItems(filters)` | `src/modules/product-roadmap/hooks/useBusinessRequestRoadmapItems.ts` | Maps to generic RoadmapItem with linked Feature milestones |
| `useRoadmapFilters()` | `src/modules/product-roadmap/hooks/useRoadmapFilters.ts` | Filter state management |

---

## 7. TYPE DEFINITIONS

### BusinessRequest (Main entity)
```typescript
interface BusinessRequest {
  id: string;
  request_key: string;         // MIM-001 format
  title: string;
  description: string | null;
  platform: string | null;     // Web, Mobile, API, etc.
  complexity: string | null;   // Low, Medium, High, Very High
  urgency: string | null;      // Low, Normal, High, Critical
  track: string | null;
  requestor: string | null;    // UUID
  assignee: string | null;     // UUID
  department: string | null;
  department_id: string | null;
  business_owner: string | null;
  business_owner_id: string | null;
  product_id: string | null;   // FK to products
  process_step: string;        // Dynamic from demand_process_steps
  health: string;              // green, amber, red
  rank: number | null;
  progress: number;            // 0-100
  
  // Dates
  start_date: string | null;
  end_date: string | null;
  impl_start_date: string | null;
  impl_target_end_date: string | null;
  
  // Scoring
  executive_urgency: number | null;   // 0-10
  business_value: number | null;      // 0-10
  complexity_score: number | null;    // 0-10
  business_score: number | null;      // 0-100 computed
  priority_tier: string | null;       // critical/high/medium/low/unscored
  is_force_ranked: boolean;
  rank_override_justification: string | null;
  
  // ... 40+ more fields for portfolio, estimation, approval, readiness,
  //     implementation, support, budget, contracts (see full list above)
  
  created_at: string;
  updated_at: string;
  deleted_at: string | null;   // Soft delete
}
```

### KanbanTicket
```typescript
interface KanbanTicket {
  id: string;            // request_key (MIM-XXX)
  summary: string;       // title
  status: string;        // process_step (column ID)
  assignee: string | null;
  businessOwner: string | null;
  department: string | null;
  score: number | null;  // business_score
  rank: number | null;
  epic: string | null;
  platform: string | null; // delivery_platform
  createdAt: string;
  daysInColumn: number;  // Computed from updated_at
  _dbId: string;         // Real UUID for drawer/updates
}
```

### RoadmapDemand
```typescript
interface RoadmapDemand {
  id: string;
  request_key: string;
  title: string;
  description: string | null;
  assignee: string | null;
  product_id: string | null;
  product?: Product;
  platform: string | null;
  process_step: string | null;
  priority_tier: string | null;
  health: string | null;
  rank: number | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

### RoadmapItem (Generic — used by roadmap engine)
```typescript
interface RoadmapItem {
  id: string;
  key?: string;          // Display key (MIM-001)
  titleEn: string;
  titleAr: string;
  ownerEn: string;       // Product name (lane label)
  ownerAr: string;
  status: string;        // Mapped from process_step
  platform: string;      // product_id for lane grouping
  rank: number | null;
  startDate: string;
  endDate: string;
  milestones: Array<{    // Linked Features
    step: 1 | 2 | 3 | 4 | 5;
    date: string;
    state: 'complete' | 'current' | 'pending';
  }>;
  risks: Array<{ sno: number; title: string; status: string }>;
  dependencies: Array<{ sno: number; title: string; status: string }>;
}
```

---

## 8. FILE INVENTORY

### Product Backlog Module
```
src/modules/product-backlog/
├── components/
│   ├── split-panel/          # Split panel sub-components
│   ├── ColumnsPanel.tsx
│   ├── EnterpriseToolbar.tsx
│   ├── ExecutiveTable.tsx
│   ├── FilterDrawer.tsx
│   ├── ProductBacklogEnterpriseTable.tsx
│   └── ProductBacklogFiltersDialog.tsx
└── pages/
    ├── CatalystDemandList.tsx    # Main backlog page (split panel)
    └── CatalystDemandTable.tsx   # Alternative table view
```

### Kanban Module
```
src/modules/kanban/
├── components/          # KanbanColumn, KanbanCard, Swimlane, etc.
├── hooks/
│   ├── useKanbanData.ts       # Data fetching + real-time
│   └── useProcessSteps.ts     # Dynamic columns
├── pages/
│   └── CatalystDemandKanban.tsx  # Main kanban page
└── types.ts
```

### Product Roadmap Module
```
src/modules/product-roadmap/
├── components/
│   ├── ProductRoadmap.tsx        # Main roadmap component
│   ├── RoadmapToolbar.tsx
│   ├── RoadmapListPanel.tsx
│   ├── RoadmapListRow.tsx
│   ├── RoadmapTimelinePanel.tsx
│   ├── RoadmapTimelineBar.tsx
│   ├── RoadmapTimelineHeader.tsx
│   ├── RoadmapTodayMarker.tsx
│   ├── RoadmapFilterDialog.tsx
│   ├── RoadmapExportDialog.tsx
│   ├── RoadmapLoadingSkeleton.tsx
│   ├── RoadmapEmptyState.tsx
│   └── index.ts
├── hooks/
│   ├── useBusinessRequestRoadmapItems.ts  # Adapter for roadmap engine
│   ├── useRoadmapDemands.ts              # Direct DB query
│   ├── useRoadmapFilters.ts
│   ├── useRoadmapDragDrop.ts
│   ├── useRoadmapKeyboard.ts
│   ├── useRoadmapViews.ts
│   ├── useProducts.ts
│   └── index.ts
├── lib/
│   ├── design-tokens.ts
│   ├── pdf-export.ts
│   └── useRoadmapTheme.ts
├── types/
│   └── roadmap.ts                # All type definitions
├── utils/
│   ├── grouping.ts               # Group demands by field
│   ├── timeline.ts               # Timeline calculations
│   └── index.ts
└── index.ts
```

### Generic Roadmap Engine
```
src/components/roadmap/
├── RoadmapEngine.tsx             # Reusable roadmap renderer
├── DateRangeFilter.tsx
├── TimelineFilterPopover.tsx
└── index.ts

src/config/roadmaps/
├── types.ts                      # RoadmapConfig, RoadmapItem, etc.
├── businessRequestRoadmapConfig.ts
├── epicRoadmapConfig.ts
├── themeRoadmapConfig.ts
├── demandRoadmapConfig.ts
└── index.ts
```

### Core Hooks & Types
```
src/hooks/useBusinessRequests.ts   # CRUD + real-time
src/types/business-request.ts      # BusinessRequest type + constants
src/stores/useIndustryViewStore.ts  # Shared state (Zustand)
```

### Drawer (Detail Panel)
```
src/components/business-requests/
├── BusinessRequestDrawer.tsx      # Main drawer component
├── CreateBusinessRequestModal.tsx # Create form
└── ...

src/components/industry/drawer-tabs/
├── BusinessScoreViewTab.tsx       # Scoring engine UI
└── ...
```

---

## 9. ROUTES

| Route | Component | Description |
|-------|-----------|-------------|
| `/industry/backlog` | CatalystDemandList | Product Backlog (split panel) |
| `/industry/kanban` | CatalystDemandKanban | Product Kanban board |
| `/industry/roadmaps` | ProductRoadmap | Product Roadmap (timeline) |
| `/industry/roadmaps-v1` | ProductRoadmapV2Page | Alternative roadmap page |
| `/industry/table` | CatalystDemandTable | Demand Table view |

---

## 10. DESIGN SYSTEM NOTES

- **Font**: Plus Jakarta Sans (UI), JetBrains Mono (data/code)
- **Spacing**: 4px base grid
- **Primary**: #2563eb (blue)
- **Row heights**: 36px standard
- **Badges**: Colored dot + label pattern for status; border-outlined for priority
- **Semantic tokens**: Use `--brand-primary`, `--surface-*`, `--text-*`, `--border-*`
- **Dark mode**: Full support via CSS variables
- **Bilingual**: English + Arabic (RTL) support in roadmap
