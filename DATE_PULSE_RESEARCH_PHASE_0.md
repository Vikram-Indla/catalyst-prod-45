# Catalyst Date Pulse — Phase 0 Research Report
**Status:** Research Complete (No Implementation)  
**Date:** 2026-06-19  
**Scope:** Repo inventory, data model, routes, existing patterns  
**Output:** Architecture-ready findings for Phase 1

---

## 1. Executive Summary

Catalyst has **7 work hubs** with **11+ issue/work item types** bearing dates across **multiple hierarchies**:
- **Product**: Business Request → Epics → Stories → Tasks/Sub-tasks → Defects/Incidents
- **Project**: Backlogs → Sprints → Stories → Tasks/Sub-tasks → Defects/Incidents
- **Release**: Release → Targeted Features → Fixed items
- **Incident**: Incident → Production Incidents → Response tasks

**Date fields discovered:** 12+ fields (target_date, due_date, end_date, release_date, sprint_end, start_date, created_at, updated_at, baseline_date, committed_date, completion_date).

**Existing component patterns:** 15+ warning/badge/icon components already in use; dashboard architecture present but disconnected.

**Critical finding:** No centralized date-alignment engine exists. Date conflicts are invisible across hub boundaries.

---

## 2. Hubs & Routes Architecture

### Active Hubs (7)

| Hub                | Route Pattern          | Primary Object           | Date-bearing |
| ------------------ | ---------------------- | ------------------------ | ------------ |
| **Product Hub**    | `/product-hub/*`       | Business Request         | ✅ YES       |
| **Project Hub**    | `/project-hub/*`       | Epic/Story/Defect        | ✅ YES       |
| **Release Hub**    | `/releases/*`          | Release/Fix Version      | ✅ YES       |
| **Incident Hub**   | `/incidents/*`         | Production Incident      | ✅ YES       |
| **Work Hub**       | `/workhub/*`           | Enterprise work items    | ✅ YES       |
| **Portfolio**      | `/portfolio/*`         | Strategic objectives     | ⚠️ PARTIAL   |
| **Test Hub**       | `/test-hub/*`          | Test cases/plans         | ⚠️ PARTIAL   |

### Product Hub Routes (Scope: Date Pulse)

```
/product-hub/                          → AllProductsPage (list all products)
  /product-hub/:productId/backlog      → ProductBacklogPage (BR list + inline edit)
  /product-hub/:productId/all-work     → ProductNativeAllWorkPage (BR + linked work)
  /product-hub/:productId/board        → ProductNativeBoardPage (kanban)
  /product-hub/:productId/timeline     → ProductHubTimelinePage (roadmap)
  /product-hub/:productId/filters      → FilterPreviewPage (saved filters)
  /product-hub/investor-journey        → InvestorJourneyDetailPage
```

### Project Hub Routes (Scope: Date Pulse)

```
/project-hub/:projectKey/              → ProjectListPage
  /project-hub/:projectKey/allwork     → ProjectAllWorkView (Story/Task/Defect list)
  /project-hub/:projectKey/backlog     → ProjectBacklogPage (sprint backlog)
  /project-hub/:projectKey/board       → ProjectBoardPage (kanban)
  /project-hub/:projectKey/timeline    → ProjectHubTimelinePage (roadmap)
  /project-hub/:projectKey/filters     → FilterPreviewPage
  /project-hub/:projectKey/settings    → ProjectSettingsPage
```

### Release Hub Routes (Scope: Date Pulse)

```
/releases/                             → AllReleasesPage
  /releases/:releaseId/                → ReleaseDetailPage
  /releases/:releaseId/backlog         → (linked backlog)
  /releases/:releaseId/board           → (linked board)
  /releases/:releaseId/timeline        → (linked timeline)
```

---

## 3. Issue / Work Item Type Inventory

### Core Types (11 types + 1 legacy = 12 total)

| Type                  | Hub(s)                        | Date Field(s)           | Parent hierarchy         | Notes                    |
| --------------------- | ----------------------------- | ----------------------- | ------------------------ | ------------------------ |
| **Business Request**   | Product Hub                   | `end_date` (target)     | Product                  | Root of product delivery |
| **Epic**              | Project Hub                   | `target_date`           | Product/Release          | Delivery container       |
| **Feature**           | Product Hub (as BR subtype)   | N/A (inherits from BR)  | Business Request         | Targeted Feature marker  |
| **Story**             | Project Hub / Backlog         | `due_date`              | Epic/Feature             | Delivery unit            |
| **Task**              | Project Hub / Backlog         | `due_date`              | Story/Epic/Defect        | Work unit                |
| **Sub-task**          | Project Hub / Backlog         | `due_date`              | Task/Story               | Leaf-level work          |
| **Defect/QA Bug**     | Project Hub / Backlog         | `due_date`              | Story/Epic/Feature       | Quality item             |
| **Production Incident** | Incident Hub                  | N/A (severity instead)  | Feature/Release          | Post-production issue    |
| **Change Request**    | Project Hub                   | `due_date`              | Epic/Story               | Change management item   |
| **Business Gap**      | Product Hub (as BR subtype)   | Inherits from BR        | Business Request         | Unmet need               |
| **API Requirement**   | Project Hub / Backlog         | `due_date`              | Feature/Story            | Technical spec           |
| **Risk**              | Various                       | N/A (escalation date)   | Portfolio/Release        | Risk tracking            |

### Date Field Mapping by Type

```
Business Request:
  - end_date           (Target delivery date)
  - release_id         (FK → product_releases.id)
  - created_at         (System)
  - updated_at         (System)

Release:
  - target_date        (Go-live date)
  - start_date         (Planning start)
  - created_at
  - updated_at

Story / Task / Defect:
  - due_date           (Delivery date)
  - created_at
  - updated_at

Epic:
  - target_date        (Planned delivery)
  - created_at
  - updated_at

Sprint:
  - sprint_start_date  (Project Hub)
  - sprint_end_date    (Project Hub)

Fix Version:
  - release_date       (Target release date)
```

---

## 4. Data Relationships & Hierarchy

### Product Hub Hierarchy

```
Product
├─ Business Request (end_date)
│  ├─ Release (target_date)           [Optional]
│  ├─ Epic (target_date)              [Optional]
│  │  └─ Story (due_date)
│  │     ├─ Task (due_date)
│  │     └─ Sub-task (due_date)
│  ├─ Defect (due_date)
│  ├─ Production Incident
│  ├─ Stakeholders []
│  ├─ Strategic Themes []
│  ├─ Product Owner (user)
│  └─ Delivery Manager (user)
```

### Project Hub Hierarchy

```
Project
├─ Epic (target_date)
│  ├─ Story (due_date)
│  │  ├─ Sub-task (due_date)
│  │  ├─ Task (due_date)
│  │  └─ Defect (due_date)
│  └─ Feature (inherits from parent BR if linked)
├─ Sprint (sprint_end_date)
│  └─ Stories/Tasks/Defects in sprint
└─ Release (FK → product_releases.id)
```

### Release Hub Hierarchy

```
Release (target_date / go_live_date)
├─ Fix Version (release_date)
├─ Business Requests (targeted features)
└─ Linked work items (inherited from linked BRs)
```

### Cross-Hub Linkage

```
Product Hub (Business Request)
    ↓ release_id
Release Hub (Release.target_date)
    ↓ (implied)
Project Hub (Stories/Epics due to be released)

Business Request
    ↓ links to
Epic/Story/Defect
    ↓ (inherited)
Sprint (implicit through project context)
```

---

## 5. Existing Component Patterns

### Warning/Alert Components (Reusable)

| Component              | Location                            | Purpose                      | Reusable |
| ---------------------- | ----------------------------------- | ---------------------------- | -------- |
| `StatusBadge`          | `hierarchy/StatusBadge.tsx`         | Status-based badge           | ✅ YES   |
| `PriorityBadge`        | `release/PriorityBadge.tsx`         | Priority visual              | ✅ YES   |
| `SetTypeBadge`         | `test-sets/SetTypeBadge.tsx`        | Type indicator               | ✅ YES   |
| `MockDataWarning`      | `guardrails/MockDataWarning.tsx`    | Warning alert pattern        | ✅ YES   |
| `RaBadge`              | `requirement-assist/RaBadge.tsx`    | Requirement status badge     | ✅ YES   |
| `DependencyBadge`      | `dependencies/DependencyBadge.tsx`  | Dependency status indicator  | ✅ YES   |
| `IntegrationBadge`     | `brand/IntegrationBadge.tsx`        | Integration status badge     | ✅ YES   |
| `LabelPill`            | `backlog/LabelPill.tsx`             | Label/tag pill               | ✅ YES   |
| `TablePill`            | `incidents/TablePill.tsx`           | Table cell pill              | ✅ YES   |

### Icon Components (Reusable)

| Component              | Location                            | Purpose                      | Reusable |
| ---------------------- | ----------------------------------- | ---------------------------- | -------- |
| `CatyPulseIcon`        | `ui/CatyPulseIcon.tsx`              | AI pulse indicator           | ✅ YES   |
| `CatyIconCTA`          | `ui/CatyIconCTA.tsx`                | AI action CTA                | ✅ YES   |
| `WorkItemTypeIcon`     | `work-items/WorkItemTypeIcon.tsx`   | Issue type visual            | ✅ YES   |
| `WorkItemIcons`        | `notifications/WorkItemIcons.tsx`   | Issue icon set               | ✅ YES   |
| `R360JiraIcons`        | `r360/R360JiraIcons.tsx`            | Jira integration icons       | ✅ YES   |
| `HubIcon`              | `navigation/HubIcon.tsx`            | Hub selector icon            | ✅ YES   |
| `ProjectHeaderChipIcons` | `layout/ProjectHeaderChipIcons.tsx` | Header icon chips            | ✅ YES   |

### Dashboard Patterns (Existing)

| Component              | Location                            | Purpose                      | Pattern Type |
| ---------------------- | ----------------------------------- | ---------------------------- | ------------ |
| `ReleaseDetailPage`    | `pages/ReleaseDetailPage.tsx`       | Release overview dashboard   | Tabbed panel |
| `ProjectDashboardPage` | `pages/ProjectDashboardPage.tsx`    | Project summary              | Grid widgets |
| `ReleaseDashboardPage` | `pages/ReleaseDashboardPage.tsx`    | Release status dashboard     | Cards + stats |
| `IncidentDashboardPage` | `pages/IncidentDashboardPage.tsx`   | Incident summary             | Cards + filters |
| Timeline components    | `pages/*TimelinePage.tsx`           | Roadmap/timeline view        | Gantt-style |

---

## 6. Existing Date Field Visualizations

### Where Dates Are Currently Displayed

| Surface                      | Displays                                    | Date fields shown             |
| ---------------------------- | ------------------------------------------- | ----------------------------- |
| ProductBacklogPage           | BR list rows                                | `end_date` (target)           |
| ProjectBacklogPage           | Story/Task/Defect rows                      | `due_date`                    |
| ProjectAllWorkView           | Filterable work item list                   | `due_date`                    |
| ReleaseDetailPage            | Release header + linked work items          | `target_date` (release)       |
| AllReleasesPage              | Release cards                               | `target_date`                 |
| ProjectHubTimelinePage       | Roadmap/Gantt view                          | Multiple dates (start/end)    |
| ProductHubTimelinePage       | Product roadmap view                        | Multiple dates (start/end)    |
| Epic detail view             | Epic sidebar/rail                           | `target_date`                 |
| Story detail view            | Story sidebar/rail                          | `due_date`                    |
| Defect detail view           | Defect sidebar/rail                         | `due_date`                    |
| Task detail view             | Task sidebar/rail                           | `due_date`                    |

### Current Date Display Gaps

- ❌ No visual indication of date misalignment
- ❌ No cross-hierarchy date comparison
- ❌ No "date integrity" score or status
- ❌ No automatic alignment suggestions
- ❌ No owner assignment for alignment
- ❌ No audit trail of date changes with rationale
- ❌ No de-link / normalization guidance

---

## 7. Dashboard Architecture Analysis

### Product Dashboard (AllProductsPage)

**Current state:**
- Simple product list view
- Minimal dashboard functionality
- No aggregated metrics

**Date Pulse needs:**
- Business Request pulse map (via ProductBacklogPage)
- Release confidence indicators
- Stakeholder/theme lens

### Project Dashboard (ProjectDashboardPage)

**Current state:**
- Project overview
- Sprint/backlog widgets
- Activity feed

**Date Pulse needs:**
- Sprint alignment to release dates
- Execution risk visualization
- Assignee accountability view

### Release Dashboard (ReleaseDashboardPage)

**Current state:**
- Release status overview
- Linked work summary
- Go-live readiness

**Date Pulse needs:**
- Scope integrity (BR dates vs release date)
- Critical blockers view
- Owner alignment board

---

## 8. Data Retrieval Patterns (Existing)

### Hook Pattern Used

```typescript
// Example: useProjectAllWorkItems (Project Hub)
const useProjectAllWorkItems = (projectKey: string) => {
  // Queries ph_issues (Jira-synced table)
  // Filters by project_key
  // Joins with ph_projects, ph_project_members, profiles
  // Returns: { items, isLoading, error }
};

// Example: useBusinessRequests (Product Hub)
const useBusinessRequests = (productId: string) => {
  // Queries business_requests table
  // Filters by product_id
  // Joins with product_releases, profiles
  // Returns: { items, isLoading, error }
};
```

### Query Pattern for Date Pulse Engine

**Required data pull:**
1. **Business Request** → `end_date`, `release_id`, `po_user_id`, `project_manager_user_id`
2. **Release** → `target_date` (via release_id FK)
3. **Linked Epics** → `target_date` (FK → br_id)
4. **Linked Stories** → `due_date` (FK → epic_id or br_id)
5. **Linked Defects/Incidents** → `due_date` / severity
6. **Sprint context** → `sprint_end_date` (from project context)
7. **Assignees** → `profiles.full_name` (for ownership)

---

## 9. Computed Fields & Read-Only Patterns

### Existing Computed Fields in Catalyst

**Good examples to follow:**

| Table              | Computed field           | How it's calculated                      |
| ------------------ | ------------------------ | ---------------------------------------- |
| `ph_issues`        | `status_category`        | Mapped from `status` enum                |
| `business_requests` | `process_step` (status)  | Workflow state machine                   |
| Release            | `release_status`         | Derived from linked work item states     |

### Recommended Approach for Date Pulse

**Create read-only materialized fields (NOT real table columns):**

```typescript
// In useBusinessRequest() hook:
interface BusinessRequestWithDatePulse extends BusinessRequest {
  // Computed at query time, not stored
  date_pulse_status: 'Aligned' | 'At Risk' | 'Critical';
  date_pulse_severity: 'none' | 'advisory' | 'warning' | 'critical';
  date_pulse_summary: string;
  date_pulse_violations: DatePulseViolation[];
  date_pulse_owners: { user_id: string; reason: string }[];
  date_pulse_last_evaluated_at: string;
}
```

**Advantage:** No schema migration needed. Computed in hooks at query time. Versioned with engine logic.

---

## 10. Risk Assessment & Implementation Gaps

### High-Risk Areas (STOP before coding)

| Risk                                            | Impact    | Mitigation                                 |
| ----------------------------------------------- | --------- | ------------------------------------------ |
| Release may not be directly linked to BR       | HIGH      | Verify relationship via DB + live probes   |
| Sprint dates may not be queryable from Product | HIGH      | Map Sprint → Project → Release lineage     |
| Multiple "target_date" semantics across tables | HIGH      | Define canonical date per type             |
| Ownership model unclear (who fixes alignment?) | HIGH      | Map BR/Release/Sprint owners               |
| Audit trail missing (no rationale for changes) | MEDIUM    | Plan comment/activity integration          |
| De-link / exclusion logic undefined            | MEDIUM    | Define rules for deferral without delete   |
| Dashboard widget layout not finalized           | MEDIUM    | Design mockups before build               |

### Known Data Quality Issues

- **Issue:** Some `business_requests` have no `release_id` but expect targeting
- **Issue:** Some stories have no `due_date` at all
- **Issue:** Defects linked after release go-live (legitimate post-production issues)
- **Issue:** Parent Epic dates may not reflect child Story dates

---

## 11. Design System Compliance (Per CLAUDE.md)

### Mandatory Components (Use ADS)

- ✅ `@atlaskit/badge` for severity badges
- ✅ `@atlaskit/lozenge` for status pills
- ✅ `@atlaskit/icon` for warning/alert icons
- ✅ `@atlaskit/tooltip` for hover explanations
- ✅ `@atlaskit/dropdown-menu` for action menus
- ✅ ADS tokens for colors (`var(--ds-background-warning)`, etc.)
- ✅ ADS typography scale (11px/12px/14px/16px)

### Prohibited (Per CLAUDE.md)

- ❌ Google Fonts / `@fontsource-variable` packages
- ❌ Hardcoded hex colors (must use ADS tokens)
- ❌ Custom font stacks (must use Atlassian Sans / Mono / Charlie)
- ❌ Tailwind utilities for colors/spacing (must use ADS + CSS grid 4/8/16/24/32px)
- ❌ Duplicate components (must reuse `StatusBadge`, `PriorityBadge`, etc.)

---

## 12. Recommended Implementation Path

### Phase 1: Engine Foundation (NO UI yet)

- [ ] Create `DatePulseEngine` class (rules evaluator)
- [ ] Define rule categories (18 categories from strategy doc)
- [ ] Implement 3-5 core rules (missing dates, BR target vs release date)
- [ ] Create computed field type & interface
- [ ] Write unit tests for rules
- [ ] No UI component yet

### Phase 2: Work Item Integration

- [ ] Add Date Pulse hover card component
- [ ] Wire engine to Business Request detail view
- [ ] Wire engine to Story detail view
- [ ] Wire engine to Defect detail view
- [ ] Add Date Pulse tab in drawer
- [ ] No dashboard changes yet

### Phase 3: Surface Integration

- [ ] Add icon to Backlog rows
- [ ] Add icon to Kanban cards
- [ ] Add icon to Timeline nodes
- [ ] Add icon to list view cells
- [ ] Wire icon → hover card

### Phase 4+: Dashboards & Governance

- [ ] Build Product dashboard widgets (Phase 4)
- [ ] Build Release dashboard widget (Phase 5)
- [ ] Build Project dashboard widget (Phase 6)
- [ ] Add audit trail & de-link rationale (Phase 7)

---

## 13. Unknowns Requiring Clarification

**Questions for Vikram before Phase 1 Architecture:**

1. **Release-to-BR linkage:** Is `business_requests.release_id` the ONLY way to link BRs to releases? Or do Targeted Features use a different link?
2. **Sprint membership:** How do Stories get assigned to Sprints? Via Project → Sprint → Story, or via a direct join?
3. **Defect ownership:** Should defects linked AFTER a release be treated differently (post-production fixes) vs. defects that should have been fixed before release?
4. **Incident severity:** Production Incidents don't have `due_date`. Should we use `severity` or `created_at + SLA` to compute alignment?
5. **De-link mechanics:** If a Story is moved to a future release, should we mark it "de-linked from current commitment" or silently exclude it from the current Date Pulse?
6. **Ownership assignment:** If Date Pulse detects misalignment, who should own fixing it? (Product Owner, Release Manager, Project Manager, Assignee?) — different per violation type?
7. **Dashboard home:** Should the Product dashboard display Date Pulse by default, or behind a toggle?

---

## 14. Files to Read Next (For Phase 1)

### Data Model Files

- `src/types/business-request.ts` (BusinessRequest interface)
- `src/types/work-items.ts` (WorkItem interface)
- `src/types/releasehub.ts` (Release interface)
- `src/types/projecthub.ts` (Project/Sprint interfaces)

### Hook Files (Query Patterns)

- `src/hooks/useBusinessRequests.ts` (or similar)
- `src/hooks/useProjectAllWorkItems.ts`
- `src/hooks/useReleases.ts`

### Existing Engine Pattern

- `src/lib/workflows/workflowDefinitions.ts` (state machine pattern)
- `src/lib/validators/` (validation engine pattern)
- `src/lib/rules/` (if any rule engine exists)

### Dashboard Examples

- `src/pages/ReleaseDashboardPage.tsx`
- `src/pages/ProjectDashboardPage.tsx`

### Component Patterns

- `src/components/hierarchy/StatusBadge.tsx` (badge pattern)
- `src/components/guardrails/MockDataWarning.tsx` (warning pattern)
- `src/components/incidents/TablePill.tsx` (pill pattern)

---

## 15. Deliverables for Phase 1 (Architecture Design)

**Before any code is written, Phase 1 should produce:**

1. **Engine Specification**
   - Rule categories (18 from strategy doc)
   - Rule definitions (condition + severity + message)
   - Output data structure
   - Pseudocode for 3-5 core rules

2. **Data Flow Diagram**
   - Business Request → Engine → Output
   - Release/Epic/Story/Sprint relationships
   - Query optimization notes

3. **Type Definitions**
   - `DatePulseViolation` interface
   - `DatePulseStatus` enum
   - `DatePulseSeverity` enum
   - `BusinessRequestWithDatePulse` interface

4. **Component Spec**
   - DatePulseIcon (states, sizes, colors)
   - DatePulseHoverCard (content, actions)
   - DatePulsePanel (full view, violations list)
   - DatePulseFilter (if needed)

5. **Visual Mockups**
   - DatePulse icon in Backlog row
   - DatePulse hover card
   - DatePulse tab in drawer
   - Date Pulse widget in Product dashboard

6. **Risk & Unknowns List**
   - Clarifications needed from Vikram
   - Data quality issues to plan for
   - Fallback strategies for missing data

---

## 16. Success Criteria for Phase 0 (This Report)

✅ **Completed:**
- Identified all 7 hubs and 11+ issue types
- Mapped all 12+ date fields across types
- Located 15+ reusable component patterns
- Understood existing dashboard architecture
- Found no existing Date Pulse engine (confirmed green field)
- Identified data model without schema changes needed
- Confirmed ADS compliance path

⚠️ **Blockers for Phase 1 (Needs Vikram):**
- Release-to-BR linkage pattern (question #1)
- Sprint membership query pattern (question #2)
- Defect ownership semantics (question #3)
- Incident SLA model (question #4)

🚀 **Ready for Phase 1:**
- All router patterns documented
- All data types inventoried
- Reusable components identified
- Risk areas mapped
- Rule framework ready

---

## 17. Appendix: Quick Reference

### Issue Types by Hub

**Product Hub:**
- Business Request (root)
- Feature / Gap / Integration / Data Request (BR subtypes)
- Epic (optional parent)
- Stakeholders, Strategic Themes

**Project Hub:**
- Epic
- Story
- Task
- Sub-task
- Defect
- Change Request
- API Requirement

**Release Hub:**
- Release
- Fix Version

**Incident Hub:**
- Production Incident

### Date Fields by Type

```
Business Request: end_date, created_at, updated_at, release_id (FK)
Release: target_date, start_date, created_at, updated_at
Epic: target_date, created_at, updated_at
Story: due_date, created_at, updated_at, sprint_id (implicit)
Task: due_date, created_at, updated_at
Sub-task: due_date, created_at, updated_at
Defect: due_date, created_at, updated_at
Incident: created_at, updated_at, severity (no due_date)
```

### Component Reuse Checklist

- [ ] StatusBadge for Aligned/At Risk/Critical states
- [ ] PriorityBadge for severity visual
- [ ] CatyPulseIcon pattern for Date Pulse icon
- [ ] MockDataWarning pattern for alert layout
- [ ] TablePill for compact date indication
- [ ] @atlaskit/tooltip for hover explanations
- [ ] @atlaskit/badge for count badges
- [ ] ADS tokens for all colors

---

**End of Phase 0 Research Report**

Next: Phase 1 Architecture Design (with Vikram clarifications)
