# Test Hub — Gap Analysis Template

**Version:** 1.0  
**Date:** 2026-06-25  
**Purpose:** Structured comparison of AIO Tests features vs Catalyst Test Hub state

---

## How to Use This Template

Fill in one row per AIO Tests feature. Source from PDF documentation. Status column updated as experiments complete.

**Status values:**
- `exists-verified` — built, wired to tm_* tables, tested
- `exists-unverified` — file exists but DB wiring / functional state unknown
- `partial` — partially built (e.g. read works, write broken)
- `missing` — not built
- `out-of-scope` — explicitly excluded (see research program)
- `catalyst-native` — Catalyst has superior implementation not in AIO Tests

---

## Feature Gap Matrix

### 1. Test Case Repository

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Folder tree navigation | exists-unverified | RepositoryPage.tsx 49.8K | 004 |
| Create test case | exists-unverified | CaseDrawer.tsx 14.4K | 005 |
| Edit case details (title, priority, type, folder) | exists-unverified | CaseDrawer | 005 |
| Edit test steps (action, expected, data) | exists-unverified | StepEditor.tsx 4.9K | 005 |
| Reorder test steps (drag) | exists-unverified | StepEditor | 005 |
| Copy test case | exists-unverified | RepositoryPage | 006 |
| Move test case to folder | exists-unverified | RepositoryPage | 006 |
| Delete test case (soft delete) | exists-unverified | RepositoryPage | 006 |
| Archive test case | exists-unverified | RepositoryPage | 006 |
| Quick view (drawer, not full page) | exists-unverified | CaseDrawer | 005 |
| Link to Jira work item | partial | tm_test_cases.linked_work_item_id exists | 005 |
| Case version history | exists-unverified | components/releases/test-case-detail/ | 016 |
| Create new case version | missing | Need to probe | 016 |
| View specific version | missing | | 016 |
| Add specific version to cycle | missing | | 016 |
| Case labels | missing | tm_labels + tm_case_labels tables | 005 |
| Case custom fields | missing | Phase 3 | 029 |

### 2. Folder Management

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Create folder | exists-unverified | RepositoryPage | 004 |
| Rename folder | exists-unverified | RepositoryPage | 004 |
| Move folder (drag + context menu) | exists-unverified | RepositoryPage | 004 |
| Reorder folder (drag) | exists-unverified | RepositoryPage | 004 |
| Delete folder | exists-unverified | RepositoryPage | 004 |
| Archive folder | missing | | 006 |
| Folder-level actions (copy all cases, etc.) | missing | | 006 |

### 3. Test Cycles

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Create cycle | exists-unverified | CyclesPage.tsx 33.8K | 007 |
| Edit cycle name/status | exists-unverified | CyclesPage | 007 |
| Copy cycle | exists-unverified | CyclesPage | 007 |
| Move cycle | exists-unverified | CyclesPage | 007 |
| Delete cycle | exists-unverified | CyclesPage | 007 |
| Archive cycle | exists-unverified | CyclesPage | 007 |
| Sprint picker (iterations table) | exists-unverified | CyclesPage | 007 |
| Add cases to cycle | exists-unverified | CycleDetailPage.tsx 47.6K | 008 |
| Add multiple cases at once | exists-unverified | CycleDetailPage | 008 |
| Add case from Jira issue | missing | Requires ph_issues integration | 008 |
| Assign case to cycle member | exists-unverified | CycleDetailPage | 008 |
| Change case scope within cycle | exists-unverified | CycleDetailPage | 008 |
| Remove case from cycle | exists-unverified | CycleDetailPage | 008 |
| View cycle scope list | exists-unverified | CycleDetailPage | 008 |
| Cycle progress bar (pass %/ fail %) | exists-unverified | CyclesPage KPI | 007 |
| Cycle management from Jira (AIO panel) | partial | AioTests-AIO Tests Panel | Phase 3 |

### 4. Test Execution

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Execution overview (list of cases in cycle) | exists-unverified | ExecutionPage.tsx 24.5K | 009 |
| Step-by-step execution (pass/fail/block/skip) | exists-unverified | ExecutionPage | 009 |
| Auto-cascade run status from steps | exists-unverified | ExecutionPage | 010 |
| Record actual result per step | exists-unverified | ExecutionPage | 009 |
| Raise defect from failed step | exists-unverified | ExecutionPage | 011 |
| Attach screenshot to step result | missing | File upload to Supabase Storage | 011 |
| Attach file as evidence | missing | File upload | 011 |
| Bulk pass all steps | missing | | 019 |
| Bulk assign in execution | missing | | 019 |
| Dataset-based execution | missing | Run case with multiple data sets | Phase 3 |
| Offline execution | missing | localStorage queue | Phase 3 |
| Import results (CSV) | missing | | 021 |
| Re-run a failed case | missing | Run number increment | 010 |
| Skip a step | exists-unverified | ExecutionPage | 009 |

### 5. Test Sets

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Create static test set | exists-unverified | TestSetsPage.tsx 20.0K | 014 |
| Edit set name/description | exists-unverified | TestSetsPage | 014 |
| Add/remove cases from set | exists-unverified | SetDetailPage.tsx 27.8K | 014 |
| Copy set | exists-unverified | TestSetsPage | 014 |
| Move set | exists-unverified | TestSetsPage | 014 |
| Delete set | exists-unverified | TestSetsPage | 014 |
| Create smart set (query-based) | exists-unverified | TestSetsPage | 015 |
| Smart set auto-refresh | exists-unverified | | 015 |
| Add set to cycle | missing | | 015 |
| Add set to another set | missing | | 015 |

### 6. Defects

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Defect summary list | exists-unverified | DefectsPage.tsx 15.2K | 017 |
| Defect detail view | missing | | 017 |
| Defect impact (affected cases) | missing | | 017 |
| Defect trend (over time) | missing | Phase 3 report | 024 |
| Link defect to Jira issue | missing | tm_defects.external_id | 017 |
| Create defect from execution | exists-unverified | ExecutionPage | 011 |
| Defect status management | exists-unverified | DefectsPage | 017 |

### 7. Traceability

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Coverage summary (% cases covered per epic/story) | exists-unverified | TraceabilityPage.tsx 14.7K | 018 |
| Traceability detail (issue → cases) | exists-unverified | TraceabilityPage | 018 |
| Case → Jira issue link | partial | tm_test_cases.linked_work_item_id | 018 |
| Jira issue → case coverage in Jira panel | missing | AIO Tests Panel integration | Phase 3 |
| Business Request → test coverage | missing | Catalyst-native (cross-hub) | Phase 2+ |
| Release gate: coverage % threshold | missing | Catalyst-native | Phase 3 |

### 8. Reports (30+ types)

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Test execution report | exists-unverified | ReportDetailPage.tsx 50.4K | 024 |
| Test result report | exists-unverified | ReportsPage.tsx 10.6K | 024 |
| Defect distribution | missing | | 024 |
| Coverage by component | missing | | 024 |
| Coverage by assignee | missing | | 024 |
| Test progress report | missing | | 024 |
| Flaky test report | missing | | 025 |
| Traceability report | missing | | 025 |
| Burndown by cycle | missing | | 025 |
| Save report | missing | | 024 |
| Share report | missing | | 024 |
| Schedule report | missing | Phase 3 | 024 |

### 9. Grid Actions (Cross-cutting)

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Search across list | exists-unverified | All list pages | 020 |
| Filter by status | exists-unverified | All list pages | 020 |
| Filter by priority | exists-unverified | All list pages | 020 |
| Filter by assignee | exists-unverified | All list pages | 020 |
| Filter by cycle | exists-unverified | All list pages | 020 |
| Sort by any column | exists-unverified | JiraTable built-in | 020 |
| Customize visible columns | exists-unverified | JiraTable ColumnManager | 020 |
| Bulk select | exists-unverified | JiraTable built-in | 019 |

### 10. Admin Configuration

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Custom case priorities | missing | tm_case_priorities (table exists) | 026 |
| Custom case types | missing | tm_case_types (table exists) | 026 |
| Custom case statuses | missing | | 027 |
| Custom run statuses | missing | | 027 |
| Environments | missing | tm_environments (table exists) | 028 |
| Custom fields | missing | | 029 |
| Email notifications | missing | | 030 |
| Project permissions | missing | | Phase 3 |
| Audit log | missing | | 031 |

### 11. My Work

| AIO Tests Feature | Catalyst Status | Notes | Experiment |
|---|---|---|---|
| Cases assigned to me in active cycles | exists-unverified | MyWorkPage.tsx (BacklogPage adapter) | 013 |
| Priority order (urgency scoring) | partial | types.ts has scoring model | 013 |
| AI recommendation (next test to run) | partial | AIRecommendation type defined | 032 |
| Workload analysis | partial | WorkloadAnalysis type defined | 033 |
| Defects linked to my cases | missing | | 017 |
| Incidents linked to my cases | missing | Cross-hub | Phase 3 |

### 12. Catalyst-Native Features (Not in AIO Tests)

| Feature | Status | Experiment |
|---|---|---|
| AI test case generation from work item description | missing | 032 |
| AI execution run summary | missing | 033 |
| Cross-hub traceability (BR → test cases) | missing | Phase 2+ |
| Capacity-aware assignment (resource_inventory) | missing | Phase 3 |
| Release gate integration | missing | Phase 3 |
| My Test Scope with AI scoring | partial (typed, not wired) | 032 |
| AIO Tests Panel equivalent in Catalyst work item drawer | missing | Phase 3 |

---

## Gap Summary (as of 2026-06-25)

```
Total AIO Tests features catalogued: ~120
Exists and verified: 0  (nothing verified yet — all exist-unverified)
Exists unverified:  ~45
Partial:             3
Missing:            ~65
Out of scope:        7
Catalyst-native:     7 (planned)

NOTE: "exists-unverified" → all existing pages need R1 code archaeology + 
functional probe before they can be reclassified as "exists-verified".
This is the primary task of experiments 001-003.
```

---

## Next Action (Before Experiments Start)

1. **Run R1 code archaeology** — determine if existing pages read tm_* or th_* tables
2. **Run R2 DB schema probe** — confirm tm_* tables populated on staging
3. **Get AIO Tests PDF access** — read at least the Cases, Cycles, and Execution PDFs
4. **Run baseline scorecard** — score all existing pages as Experiment 001

These four actions complete the Research Phase and unlock the Build Phase.
