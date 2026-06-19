# Catalyst Date Pulse — Phase 0 Research (Extended)
**Date:** 2026-06-19  
**Based on:** Phase 2A Foundation + Strategic Brief Requirements  
**Objective:** Full inventory of Date Pulse surface integration requirements

---

## 1. Issue & Work Item Types

### Primary Work Item Types (Synced from Jira)

| Type | Table | Date Fields | Status | BR Linkable |
|------|-------|-------------|--------|-------------|
| **Story** | `ph_issues` | `due_date` (nullable) | Active | ✅ Yes |
| **Epic** | `ph_issues` | `target_date` (inferred) | Active | ✅ Yes |
| **Feature** | `ph_issues` | `target_date` (inferred) | Active | ✅ Yes |
| **Task** | `ph_issues` | `due_date` (nullable) | Active | ✅ Yes |
| **Sub-task** | `ph_issues` | `due_date` (nullable) | Active | ✅ Yes |
| **QA Bug / Defect** | `ph_issues` | `due_date` (nullable) | Active | ✅ Yes |
| **Production Incident** | `ph_issues` + `incidents` | `due_date` / `target_resolution_date` | Active | ✅ Yes |
| **Change Request** | `ph_issues` | `due_date` (nullable) | Active | ✅ Yes |
| **Backend / Frontend / Integration** | `ph_issues` | `due_date` (nullable) | Active | ✅ Yes |

### Product Hub Work Item Type

| Type | Table | Date Fields | Status | BR Linkable |
|------|-------|-------------|--------|-------------|
| **Business Request** | `business_requests` | `target_date`, `created_at`, `updated_at` | Active | ✅ Root item |
| **Business Gap** | Derived from BR type | Inherits from BR | Active | ✅ Yes |
| **Integration Request** | Derived from BR type | Inherits from BR | Active | ✅ Yes |
| **Data Request** | Derived from BR type | Inherits from BR | Active | ✅ Yes |

### Production / Release Work Items

| Type | Table | Date Fields | Status |
|------|-------|-------------|--------|
| **Release** | `releases` | `release_date`, `planned_date` | Active |
| **Sprint** | Inferred via `ph_issues.sprint_id` | `start_date`, `end_date` (via sprint) | Active |

### Schema Status: Missing Date Fields

**Identified Gaps (from strategic brief research):**
- ❌ `ph_issues` (Story/Task/Defect/Incident) may be missing `due_date` on some types
- ❌ Epic `target_date` not explicit column (inferred from linked work)
- ❌ Production Incident may use `incidents.target_resolution_date` instead of `ph_issues.due_date`
- ❌ Release `planned_date` vs `release_date` — clarify which is authoritative
- ⚠️ Sub-task date inheritance — unclear if sub-tasks automatically inherit story due_date

**Migration needed before Phase 1:**
```sql
-- Verify all these columns exist:
ALTER TABLE ph_issues ADD COLUMN due_date DATE NULL;
ALTER TABLE incidents ADD COLUMN target_resolution_date DATE NULL;
ALTER TABLE releases VERIFY COLUMN release_date DATE NOT NULL;
ALTER TABLE releases VERIFY COLUMN planned_date DATE NULL;
```

---

## 2. Routes & Surfaces Where Dates Appear

### Business Request Surfaces

| Surface | Route | Type | Status |
|---------|-------|------|--------|
| BR List | `/product-hub/[product]/backlog` | Table | ✅ ProductBacklogPage |
| BR Create Modal | `/product-hub/[product]/create` | Modal form | ✅ Has target_date field |
| BR Detail Drawer | `/product-hub/[product]/backlog?issue=[key]` | Side panel | ✅ Shows details |
| BR Kanban Card | `/product-hub/[product]/kanban` | Card | ❌ No health badge yet |
| BR Timeline View | `/product-hub/[product]/timeline` | Gantt/roadmap | ❌ No health badge yet |
| Product Dashboard | `/product-hub/dashboard` | Dashboard | ❌ Not wired yet |
| Global Search Results | `/search?q=[query]` | List | ❌ No date pulse |
| BR Linked Issues Tab | `/product-hub/[product]/backlog?issue=[key]` | Linked list | ❌ No date pulse |

### Epic/Story/Task/Defect Surfaces

| Surface | Route | Type | Status |
|---------|-------|------|--------|
| Project Backlog | `/project-hub/[key]/backlog` | Table | ❌ No health badge |
| Project All Work | `/project-hub/[key]/allwork` | Table | ❌ No health badge |
| Kanban Board | `/project-hub/[key]/kanban` | Cards | ❌ No health badge |
| Sprint Board | `/project-hub/[key]/sprint/[id]` | Cards | ❌ No health badge |
| Timeline / Roadmap | `/releases/timeline` | Gantt | ❌ No health badge |
| Epic Detail | `/project-hub/[key]/epic/[key]` | Side panel | ❌ No Date Pulse tab |
| Story Detail | `/project-hub/[key]/story/[key]` | Side panel | ❌ No Date Pulse tab |
| Defect Detail | `/incidents/[key]` | Side panel | ❌ No Date Pulse tab |
| Search Results | `/search?q=[query]` | List | ❌ No date pulse |

### Release & Sprint Surfaces

| Surface | Route | Type | Status |
|---------|-------|------|--------|
| Release List | `/releases` | Table | ❌ No health widget |
| Release Detail | `/releases/[id]` | Page | ❌ No date violations widget |
| Sprint Board | `/project-hub/[key]/sprint/[id]` | Kanban | ❌ No alignment warnings |
| Sprint Backlog | `/project-hub/[key]/backlog?sprint=[id]` | Table | ❌ No date pulse |

### Dashboard Surfaces (Target for Phase 4-6)

| Dashboard | Route | Status | Phase |
|-----------|-------|--------|-------|
| Product Dashboard | `/product-hub/dashboard` | Not designed | Phase 4 |
| Release Dashboard | `/releases/dashboard` | Not designed | Phase 5 |
| Project Dashboard | `/project-hub/[key]/dashboard` | Not designed | Phase 6 |
| Portfolio Dashboard | `/portfolio/dashboard` | Not scoped | Future |

---

## 3. Date Fields Inventory

### Business Request Date Fields

```typescript
business_requests {
  target_date: Date | null,           // Primary business expectation
  created_at: Timestamp,               // Implicit creation baseline
  updated_at: Timestamp,               // Last change
  // Inferred:
  release_id: UUID,                    // Links to release.release_date
  linked_epics: UUID[],                // Links to epic target_dates
  linked_stories: UUID[],              // Links to story due_dates
}
```

### Work Item Date Fields (ph_issues)

```typescript
ph_issues {
  due_date: Date | null,               // Story/Task/Defect due date
  // Derived:
  sprint_id: UUID,                     // Links to sprint end_date
  parent_key: String | null,           // Links to parent's due_date
  // Implicit:
  created_at: Timestamp,
  updated_at: Timestamp,
}
```

### Release Date Fields

```typescript
releases {
  release_date: Date,                  // Authoritative production date
  planned_date: Date | null,           // Initial plan (may differ)
  created_at: Timestamp,
  updated_at: Timestamp,
}
```

### Sprint Date Fields (Inferred)

```typescript
sprints {
  start_date: Date,
  end_date: Date,
  created_at: Timestamp,
  updated_at: Timestamp,
}
```

### Incident Date Fields

```typescript
incidents {
  target_resolution_date: Date | null, // Resolution expectation
  created_at: Timestamp,
  resolved_at: Timestamp | null,
  updated_at: Timestamp,
}
```

---

## 4. Data Relationships Map

### Business Request Hierarchy (ProductHub)

```
Product
  └─ Business Request
      ├─ target_date (primary date)
      ├─ release_id → Release.release_date
      ├─ linked_epics → Epic (inferred dates)
      │    └─ linked_stories → Story.due_date
      │         └─ linked_subtasks → Sub-task.due_date
      ├─ linked_stories → Story.due_date (direct)
      │    └─ sprint_id → Sprint.end_date
      ├─ linked_defects → Defect.due_date
      ├─ linked_incidents → Incident.target_resolution_date
      └─ stakeholders, product_owner, delivery_manager
```

### Work Item Hierarchy (ProjectHub)

```
Project
  └─ Epic
      ├─ target_date (inferred from children)
      └─ linked_stories → Story.due_date
           ├─ sprint_id → Sprint.end_date
           └─ linked_subtasks → Sub-task.due_date
  └─ Story (standalone)
      ├─ due_date (primary)
      ├─ sprint_id → Sprint.end_date
      ├─ parent_key → Epic or Feature
      └─ linked_subtasks → Sub-task.due_date
  └─ Task / Sub-task / Defect / Incident
      ├─ due_date
      └─ parent_key (optional)
```

### Release Hierarchy

```
Release
  ├─ release_date (primary production date)
  ├─ planned_date (initial plan)
  └─ linked_business_requests → Business Request.target_date
       └─ linked_epics/stories → work item dates
```

### Cross-Module Relationships

**Business Request → Release:**
- Explicit: `business_requests.release_id` → `releases.release_date`
- Comparison rule: `Business Request.target_date` vs `Release.release_date` (may differ)

**Work Item → Sprint:**
- Via: `ph_issues.sprint_id` → Sprint
- Comparison rule: `Story.due_date` vs `Sprint.end_date`

**Work Item → Release:**
- Implicit: Story linked to Epic linked to BR linked to Release
- Path: Story.parent_key → Epic → BR.release_id → Release

**Epic → Business Request:**
- Explicit: `business_requests.linked_epics[]` contains Epic key
- Implicit: Epic may link to BR via shared stories

---

## 5. Current Component Patterns

### Existing Badge/Icon/Warning Components

| Component | Location | Use | Reusable? |
|-----------|----------|-----|-----------|
| `CatalystStatusPill` | `JiraTable/cells.tsx` | Status color badge | ✅ Phase 2A uses it |
| `StatusPill` | `components/shared/JiraTable` | Canonical status renderer | ✅ Yes |
| `HealthStatusBadge` | `components/business-request/` | Date Pulse health (NEW) | ✅ Phase 2A |
| `@atlaskit/badge` | Atlaskit | Severity chips | ✅ DatePulseHoverCard uses |
| `@atlaskit/lozenge` | Atlaskit | Status lozenge | ✅ Can reuse |
| `@atlaskit/tooltip` | Atlaskit | Hover tips | ✅ Can reuse |
| `SectionMessage` | `components/ads` | Info/warning messages | ✅ Can reuse |
| `JiraIssueTypeIcon` | `lib/jira-issue-type-icons` | Type icons | ✅ Can reuse |

### Existing Hover Card / Popover Patterns

| Pattern | Location | Use | Reusable? |
|---------|----------|-----|-----------|
| Portal-based popover | `DatePulseHoverCard.tsx` (Phase 2A) | Fixed-position popover | ✅ Yes |
| `WatchersChip` popover | `WorkItemList` | Avatar list popover | ✅ Yes |
| `CatalystDetailPanel` | Shared | Side-panel detail | ✅ Can adapt |
| Inline edit popover | `makeStatusEditCell` | Dropdown on edit | ✅ Can reuse |

### Existing Dashboard Patterns

| Dashboard | Location | Structure | Status |
|-----------|----------|-----------|--------|
| Product Dashboard | `/product-hub/dashboard` | Unknown (may be blank) | ❌ Not inspected |
| Project Dashboard | `/project-hub/[key]/dashboard` | Unknown | ❌ Not inspected |
| Release Dashboard | `/releases/dashboard` | Unknown | ❌ Not inspected |
| Kanban Analytics | `KanbanBoardAnalytics.tsx` | Cards + charts | ✅ Reuse patterns |
| Workload Dashboard | `WorkloadDashboard.tsx` | Grid layout | ✅ Reuse patterns |

---

## 6. Data Model Gaps & Clarifications Needed

### Critical Questions for Next Phase

1. **Epic target_date:** Is there an explicit `epics.target_date` column, or inferred from children?
2. **Release authority:** Is `release_date` or `planned_date` the authoritative production date?
3. **Sprint data source:** Do sprints live in a separate `sprints` table, or inferred from `ph_issues.sprint_id` grouping?
4. **Post-release defects:** Should defects linked AFTER `release_date` be flagged as critical or marked as post-prod?
5. **Sub-task inheritance:** Do sub-tasks inherit parent story due_date, or are they independent?
6. **BR → Release → Sprint path:** Can a BR be linked to multiple releases? Can stories in one BR belong to different releases?
7. **Incident resolution date:** Is `incidents.target_resolution_date` authoritative, or should it be `ph_issues.due_date` (if incident is in ph_issues)?
8. **Strategic theme dates:** Do strategic themes have target completion dates?

---

## 7. Surfaces Requiring Date Pulse (Prioritized)

### MVP (Phase 2A ✅)
- [x] Business Request backlog row

### High Priority (Phase 2B-3)
- [ ] Business Request kanban card
- [ ] Business Request timeline node
- [ ] Epic detail "Date Pulse" tab
- [ ] Story detail "Date Pulse" tab
- [ ] Defect/Incident detail "Date Pulse" tab
- [ ] Project backlog row
- [ ] Project all-work row
- [ ] Kanban card (story/task/defect)
- [ ] Sprint board card

### Medium Priority (Phase 3-4)
- [ ] Product dashboard widgets (5 widgets, Phase 4 design pending)
- [ ] Release dashboard widgets (5 widgets, Phase 5 design pending)
- [ ] Project dashboard widgets (5 widgets, Phase 6 design pending)
- [ ] Timeline/roadmap node markers
- [ ] Search results row
- [ ] Linked items tab

### Lower Priority (Phase 5+)
- [ ] Global navigation badges
- [ ] Smart notifications for date violations
- [ ] Audit/history panel for date changes

---

## 8. Design System & Component Reuse Rules

### Mandatory Reuse (Per CLAUDE.md)

- ✅ `CatalystStatusPill` for all status/health badges (Phase 2A uses)
- ✅ `@atlaskit/lozenge` for severity chips (Phase 2A uses)
- ✅ `@atlaskit/tooltip` for hover tips
- ✅ `JiraIssueTypeIcon` for work item type markers
- ✅ Portal-based popovers, NOT `@atlaskit/popup` (has known empty-portal bug)
- ✅ ADS tokens for all colors (no hardcoded hex)
- ✅ Stacked field-row pattern for detail panels (see `CatalystSidebarDetails`)

### Components to NOT Duplicate

- ❌ `StatusPill` / `StatusTransitionDropdown` (use canonical)
- ❌ Dropdown menus (use `@atlaskit/dropdown-menu`)
- ❌ Hover cards (use portal pattern)
- ❌ Date pickers (use `@atlaskit/datetime-picker`)
- ❌ Work item type icons (use `JiraIssueTypeIcon`)
- ❌ Avatar chips (use `@atlaskit/avatar`)

---

## 9. Rule Implementation Map

### Phase 2A Rules (18 implemented)

**Category A (Missing Dates):**
- [x] A1: BR target date missing
- [x] A2: Linked work missing due dates
- [x] A3: Release missing go-live date

**Category B (Date Conflicts):**
- [x] B1: Release after BR target date
- [x] B2: Sprint after release
- [x] B3: Story due after release
- [x] B4: Epic end after BR target
- [x] B5: Sub-task after story
- [x] B6: Defect due after release

**Category C (Scope Creep):**
- [x] C1: New story after BR targeted
- [x] C2: Story added to later sprint
- [x] C3: Defect added near release

**Category D (Status/State):**
- [x] D1: Start date after due date
- [x] D2: Due date in past (overdue)
- [x] D3: Closed item with future date
- [x] D4: Parent closed while child open

**Category E (Alignment):**
- [x] E1: BR unassigned (no owner)
- [x] E2: Story assignee missing

### Future Rules (Phase 3+, from strategic brief)

**Category F (Release/Sprint):** 6 rules  
**Category G (Timeline Integrity):** 5 rules  
**Category H (Data Quality/Gaming):** 5 rules  
**Category I (De-link/Normalize):** 5 rules  

**Total future rules: 21**  
**Grand total when complete: 39 rules (A-I)**

---

## 10. Risks & Unknowns

### Data Model Risks

- **Risk:** Epic `target_date` may not exist as column; inferred from children
  - **Mitigation:** Confirm via schema inspection before Phase 1
- **Risk:** Sprint dates may not be directly queryable (only via `ph_issues` grouping)
  - **Mitigation:** Verify sprint data model in project-hub schema
- **Risk:** Business Request may link to multiple releases simultaneously
  - **Mitigation:** Clarify scope rules: which release is authoritative?

### Performance Risks

- **Risk:** Date Pulse computed on every render of 50+ BR rows = N queries
  - **Mitigation:** Phase 2A uses 30s in-memory cache; sufficient for MVP
  - **Escalation:** Phase 3+ may need DB-side computed columns or cron refresh

### Scope Creep Risks

- **Risk:** "We should add Date Pulse to all 15 surfaces simultaneously"
  - **Mitigation:** Phased 7-phase plan enforces boundaries per strategic brief
- **Risk:** "Why doesn't Date Pulse auto-fix dates?"
  - **Mitigation:** Strategic brief is explicit: inform, don't force

---

## 11. Testing Strategy

### Unit Tests (Phase 2A, pending)

- DatePulseEngine: 18 rule tests (1 per rule)
- HealthStatusEngine: 7 state tests (1 per state)
- useBusinessRequestHealth hook: 5 tests (fetch, cache, error, refetch, missing data)
- Components: 3 tests (Badge render, Descriptor on click, HoverCard violations list)

### Integration Tests (Phase 2B+)

- BR list with health column: badges render for all states
- BR detail: Date Pulse tab shows violations + suggested actions
- Kanban card: health badge visible and clickable
- Timeline node: color-coded by health status
- Dashboard widget: filters by Date Pulse status work correctly

### Performance Tests (Phase 3+)

- ProductBacklogPage with 50 BRs: <2s load time
- Badge compute + render: <100ms per item
- Popover open: <50ms

---

## 12. Governance & Audit (Phase 7)

### Not Yet Implemented

- [ ] Audit trail for date changes (who changed what when)
- [ ] Rationale capture for de-links (why was this removed from BR scope?)
- [ ] "Mark as reviewed" → violation history state
- [ ] Computed "Date Pulse Owner" field (who is responsible for fixing this?)

---

## 13. Success Criteria for Phase 0 Research

- ✅ All work item types identified
- ✅ All date-bearing surfaces mapped
- ✅ Data relationships clarified
- ✅ Component reuse patterns documented
- ✅ Rules inventory complete
- ⏳ Data model gaps identified
- ⏳ Critical questions documented

---

## 14. Recommended Phase 1 Entry Point

1. **Clarify unknowns** (5 questions above) with Vikram
2. **Inspect dashboard architecture** (`ProductDashboard.tsx`, `ReleaseDashboard.tsx`, `ProjectDashboard.tsx`)
3. **Verify sprint data model** (source of sprint end_date)
4. **Confirm epic target_date** column existence
5. **Then:** Design Phase 1 computed fields (Date Pulse Status, Summary, Owner)
6. **Then:** Expand engine to all 9 rule categories (A-I)

---

## 15. Handoff to Next Session

**What Phase 2A built:**
- Foundation engine (18 rules, 5 categories)
- 7-state health status machine
- React hook with cache
- 3 UI components (Badge, Descriptor, HoverCard)
- ProductBacklogPage integration
- Migration for `health_status` column on BR

**What Phase 0 research discovered:**
- All surfaces needing Date Pulse (20+ pages/modals/dashboards)
- All date-bearing fields across 10+ work item types
- Data relationship complexities (Sprint, Release, Epic lineage)
- 21 additional rules needed for full strategic brief
- 5 critical data model clarifications needed

**What Phase 1-7 must build:**
- Dashboard architecture (Product, Release, Project)
- Surface expansion (Epic, Story, Defect, Incident, Kanban, Timeline)
- Rule engine completion (9 categories, 39 total rules)
- Governance layer (audit, rationale, ownership resolution)
- Performance optimization (caching, computed columns, cron refresh)

---

**End of Phase 0 Research**

See `DATE_PULSE_ARCHITECTURE_PHASE_1.md` for the foundation spec that Phase 2A implemented.  
See `DATE_PULSE_PHASE2_HANDOVER.md` for the strategic vision covering Phases 1-7.
