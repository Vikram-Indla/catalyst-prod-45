# Target Catalyst Design: test-hub

**Date:** 2026-06-26
**Experiment:** test-01 (deep discovery)
**Type:** research (no code changes)
**Gate required:** Human approval (Gate 3 = design approval + direction decision) before build phase starts

---

## 1. SELECTED DIRECTION: Hybrid B+C (Execution-First with Intelligence Layer)

**Primary model:** Option B (Execution-First) — My Work as landing; Board as daily workflow
**Secondary layer:** Option C (Quality Intelligence) — Dashboard KPIs + Release Readiness in phase 2

**Rationale:**
- Option B solves the daily QA tester's pain ("What do I test today?") — high-velocity, actionable
- Option C adds strategic value (PM/executive visibility) — fits phase 2 without blocking phase 1
- Option A (Repository-First) is strongest for QA automation teams authoring many tests — secondary workflow, not home

**Open for Vikram decision:**
- [ ] Confirm Hybrid B+C as target direction
- [ ] Confirm sidebar order (My Work first vs Dashboard first)
- [ ] Confirm Release Readiness as phase 2 (not phase 1)
- [ ] Confirm CATY AI sidebar on Board page (persistent panel vs on-demand button)

---

## 2. TARGET NAVIGATION MODEL

```
Test Hub (sidebar)
├── 📊 Dashboard        ← Phase 2: rich KPI cards + AI summary
├── 👤 My Work          ← Phase 1 HOME: assigned cases + 3 KPI chips
├── 📋 Board            ← Phase 1: Kanban (JiraTable-based or KanbanPage)
├── ─────────────────
├── 📁 Repository       ← Phase 1: folder tree + JiraTable + CaseDrawer
├── 🔄 Cycles           ← Phase 1: cycle list + detail + execution
├── 🐛 Defects          ← Phase 1: canonical BacklogPage (already working)
├── 📈 Reports          ← Phase 1 → Phase 2: 5 core report types
├── ─────────────────
├── 📋 Traceability     ← Phase 2: matrix + coverage
├── 📦 Test Sets        ← Phase 2: sets + set detail
├── 🚀 Release Readiness← Phase 2: gate checklist + go/no-go
├── ⚙️ Filters          ← Phase 1 (already working via canonical mount)
```

---

## 3. SCREEN ARCHITECTURE

### Phase 1 Screens

| Route | Target Design | Key Components | Priority |
|---|---|---|---|
| `/testhub/my-work` | My Work (HOME): JiraTable of assigned cases + 3-chip KPI row (Assigned/Overdue/Blocked) + AI spotlight | JiraTable, SidebarBase, CatyIconCTA | P0 |
| `/testhub/board` | Kanban: swim-lanes by assignee; columns: To Test/In Progress/Blocked/Passed; AI sidebar | KanbanPage (already mounted) or custom | P0 |
| `/testhub/repository` | Folder tree (left) + JiraTable (center) + CaseDrawer (CatalystViewBase right) | JiraTable, CatalystViewBase, ActivityPanel | P0 |
| `/testhub/cycles` | Cycles JiraTable: Name, Status, Pass Rate%, Case Count, Dates; create dialog | JiraTable, create modal | P0 |
| `/testhub/cycles/:id` | Cycle detail (CatalystViewBase): left=case list+results; right=stats+AI recommendations | CatalystViewBase, JiraTable, CatyIconCTA | P0 |
| `/testhub/cycles/:id/execute` | Full-screen workbench: steps (left) + controls (right) + defect link + evidence | Custom (existing ExecutionPage enhanced) | P0 |
| `/testhub/reports` | Reports list (JiraTable) → 5 core report pages: Execution Summary, Case Distribution, Defect Trend, Automation Activity, Traceability Summary | JiraTable, custom charts | P1 |
| `/testhub/filters` | Already canonical (FiltersListPage hubType='test') — no changes | Canonical | ✅ Done |
| `/testhub/defects` | Already canonical (BacklogPage + defectsDataSource) — no changes | Canonical | ✅ Done |
| `/testhub/dashboard` | Lightweight v1: 4 KPI cards (Pass Rate, Coverage, Flakiest Tests, Active Cycles) | ProjectDashboardPage + test widgets | P1 |

### Phase 2 Screens

| Route | Target Design | Components | Priority |
|---|---|---|---|
| `/testhub/traceability` | Requirements × Tests coverage matrix with heat-map coloring; "Generate case for gap" inline | Custom grid (new component) | P2 |
| `/testhub/sets` | Sets JiraTable + SetDetail (CatalystViewBase) | JiraTable, CatalystViewBase | P2 |
| `/testhub/readiness` (NEW) | Release gate checklist + Go/No-Go decision card + AI readiness narrative | Custom layout (new component) | P2 |

---

## 4. COMPONENT PLAN

| Need | Use | Justification |
|---|---|---|
| Sidebar navigation | `SidebarBase` + `TestHubSidebar.tsx` | Already mounted; extend config only |
| All list pages (cases, cycles, sets, reports, filters) | `JiraTable` | Canonical list component; proven in MyWork and DefectsPage |
| All detail drawers (case, cycle, defect) | `CatalystViewBase` | Canonical detail view; provides splitter, activity, breadcrumb |
| Case/cycle activity/comments | `ActivityPanel` | Canonical; must be wired to CaseDrawer (currently missing) |
| Status badges on cases/cycles | `JiraStatusLozenge` | Canonical status pill; unified color palette |
| AI trigger buttons (inline, per-case) | `CatyIconCTA` | Inline AI CTA on case detail, cycle detail |
| AI chat panel (Board/Dashboard) | `CatyAIChat` | Persistent sidebar panel for insights |
| Dashboard KPI grid | `ProjectDashboardPage` with `mode='test'` | Already mounted; add test-specific widgets |
| Filters | `FiltersListPage` with `hubType='test'` | Already mounted; no changes |
| Defects list | `BacklogPage` + defectsDataSource | Already mounted; no changes |
| Board/Kanban | `KanbanPage` with `mode='test'` | Already mounted; verify swimlane support |
| Empty states | `EmptyBoardState` pattern | Standard empty state component |
| Page headers | `ProjectPageHeader` with `hubType='test'` | Standard hub header + breadcrumbs |
| NEW: Execution workbench | Custom (extend existing ExecutionPage) | Existing code is strong; add: AI defect draft, evidence upload, CATY |
| NEW: Traceability matrix | Custom grid component | Nothing canonical fits; new component needed |
| NEW: Release Readiness page | Custom checklist + decision card | Nothing canonical fits; new component needed |
| NEW: Report charts | `ExecutionTrendChart`, `ResultsPieChart`, `ModuleBarChart` (check existence) | Use existing chart components if available |

---

## 5. AI INTEGRATION PLAN

### MVP AI Use Cases (6 — ship with Phase 1)
1. **Generate test cases from linked Jira work item** — CaseDrawer: "Generate Tests" button → modal → 5-10 draft cases
2. **Summarize failed test run results** — ExecutionPage/CycleDetail: auto-generated summary card on cycle load
3. **Draft defect from failed test step** — ExecutionPage: "Create Defect" → "Auto-Draft with Caty" pre-fills defect modal
4. **Generate BDD/Gherkin from steps** — CaseDrawer: "Export as Gherkin" in case more-menu (deterministic transform)
5. **Improve weak test case descriptions** — CaseDrawer: "✨ Improve with Caty" inline button on description field
6. **Detect duplicate test cases** — Repository: "Find Duplicates" bulk action → grouped similarity results

### P1 AI Use Cases (Phase 2)
7-14. Edge cases, negative cases, missing expected results, duplicate detection, automation candidates, risk-based prioritization, failure cluster detection, regression scope suggestion

### Architecture:
- Extend `useAIGeneration.ts` → `useAITestGeneration` hook
- Add `useAITestReporting` hook for defect drafting + run summarization
- New edge functions: `ai-test-generation`, `ai-test-analysis`, `ai-execution-intelligence`, `ai-test-reporting`
- New table: `ai_suggestions` (entity_type, entity_id, use_case_id, confidence, content, status, reviewed_by)

---

## 6. DATA/BACKEND RULES

| Rule | Rationale |
|---|---|
| ALL reads/writes → `tm_*` tables only | `th_*` is legacy dead code; never touch |
| `priority_id` is UUID FK → `tm_case_priorities` | Never render `row.priority` text; always join |
| Admin config drives all UI dropdowns | Never hardcode status, priority, type values |
| Version locking on cycle scope | When case scoped → lock version in `tm_cycle_scope.locked_version` |
| Zero-assumption on case status | If `row.status` null → render empty, never default |
| Test Plans require Gate decision | `useTestPlansG26` + 9 components orphaned; wire vs delete |
| `tm_get_requirement_test_cases` needs staging probe | Suspect SQL — before using TraceabilityPage in prod |

---

## 7. PROPOSED ENTITY MODEL (Target State)

```
Project
├── Requirement (REQ-XXX)
│   └── ←→ TestCase (TC-XXX) via tm_requirement_tests
│
├── TestCase (TC-XXX)
│   ├── TestStep[] (ordered action + expected result)
│   ├── Tags/Labels[]
│   ├── Folder (recursive hierarchy)
│   ├── Versions[] (immutable snapshots on edit)
│   ├── Comments/Activity (ActivityPanel)
│   └── Attachments[]
│
├── TestSet (TS-XXX)
│   ├── TestCase[] (via tm_set_cases)
│   └── Folder
│
├── TestCycle (CY-XXX)
│   ├── CycleScope[] (TestCase + locked_version → via tm_cycle_scope)
│   │   └── TestRun (execution record per case in cycle)
│   │       ├── StepResult[] (pass/fail/blocked per step)
│   │       └── Defect[] (defects linked from execution)
│   └── Folder
│
├── Defect
│   ├── ← TestRun (defect logged from execution)
│   └── → ExternalJiraIssue (via external_id + external_url)
│
└── AIGeneration (useAIGeneration hook → Edge Fn → CATY)
    └── ai_suggestions[] (draft test cases, defect drafts, summaries)
```

---

## 8. IMPLEMENTATION SEQUENCE (6 Build Experiments)

| Exp # | Title | Scope | Gate |
|---|---|---|---|
| build-01 | My Work + Repository (JiraTable) | Wire JiraTable to tm_test_cases; folder tree; page header | Gate 3 |
| build-02 | CaseDrawer → CatalystViewBase | Migrate CaseDrawer to CatalystViewBase; wire ActivityPanel; AI trigger | Gate 3 |
| build-03 | Cycles + Execution Enhancement | Cycle JiraTable + CycleDetail (CatalystViewBase) + ExecutionPage AI | Gate 3 |
| build-04 | Reports — 5 Core Types | Execution Summary, Case Distribution, Defect Trend, Automation Activity, Traceability | Gate 3 |
| build-05 | Dashboard KPI Widgets + AI Wiring | Test-specific widgets for ProjectDashboardPage; wire useAIGeneration to 3 MVP AI use cases | Gate 7 (AI) |
| build-06 | Traceability + Sets + Release Readiness | Traceability matrix; SetDetail; Release Readiness page; remaining AI use cases | Gate 3 + Gate 7 |

---

## 9. HUMAN APPROVAL CHECKLIST (Gate 3)

- [ ] Vikram approved target direction (Hybrid B+C)
- [ ] Navigation model approved (sidebar order)
- [ ] Component plan approved (CatalystViewBase for CaseDrawer confirmed)
- [ ] AI use case MVP selection approved (6 selected)
- [ ] Test Plans decision: wire `/testhub/plans` OR delete 9 orphaned components
- [ ] Reports scope: confirm which 5 report types to implement first
- [ ] Release Readiness: confirm as Phase 2 (not Phase 1)
- **Decision date:** _pending_
