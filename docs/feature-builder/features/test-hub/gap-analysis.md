# Gap Analysis: test-hub

**Date:** 2026-06-26
**Experiment:** test-01 (deep discovery)
**Type:** research (no code changes)
**Source:** Lane 1 (Test Hub archaeology) + Lane 3 (AIO benchmark)

---

## Status Values

| Status | Meaning |
|---|---|
| exists-verified | Built, wired, tested |
| exists-partial | File/hook exists but incomplete or stubs present |
| exists-unwired | Code exists but not connected to UI |
| missing | Not built at all |
| orphaned | Built but not routed/used |
| catalyst-native | Planned as Catalyst-only feature (no AIO equivalent) |

---

## Gap Matrix: Core Test Management

| Feature Area | AIO Has It | Catalyst Status | Notes |
|---|---|---|---|
| **CASE MANAGEMENT** |
| Case list (JiraTable) | ✓ | exists-partial | RepositoryPage has folder tree + list but JiraTable not confirmed |
| Case create (modal) | ✓ | exists-partial | CaseDrawer exists (custom; not CatalystViewBase) |
| Case steps editor | ✓ | exists-verified | StepEditor.tsx confirmed |
| Case versioning | ✓ | exists-unwired | useAutoVersioning + useCreateCaseVersion exist; diff viewer orphaned |
| Shared steps library | ✓ | missing | No shared step concept in codebase |
| Case cloning | ✓ | exists-partial | Bulk actions menu has duplicate — needs verification |
| Bulk import (CSV) | ✓ | missing | No import flow |
| Custom fields | ✓ | exists-partial | tm_case_types/priorities exist; generic custom fields: missing |
| Case lifecycle (Draft→Approved→Deprecated) | ✓ | exists-partial | Status values exist in DB; workflow enforcement unclear |
| Folder hierarchy (recursive) | ✓ | exists-verified | useFolders + folder tree in RepositoryPage |
| Case search (key + title) | ✓ | exists-partial | Filter in RepositoryPage — confirmation pending |
| Bulk operations (status, assignee, delete) | ✓ | exists-partial | Bulk menus confirmed; scope of operations unclear |
| Case linking (related, duplicate) | ✓ | missing | No case-to-case link concept |
| **TEST ORGANIZATION** |
| Test Sets (static groupings) | ✓ | exists-partial | TestSetsPage + SetDetailPage + tm_test_sets; quality unclear |
| Smart/dynamic sets | ✓ | exists-partial | tm_test_sets.is_smart + smart_query exist; UI for smart sets unclear |
| Set cloning | ✓ | exists-partial | Bulk actions — needs verification |
| Folder trees for sets | ✓ | exists-partial | Same folder system used; confirmation needed |
| **TEST PLANNING & CYCLES** |
| Cycle list | ✓ | exists-verified | CyclesPage confirmed working |
| Cycle create (modal) | ✓ | exists-verified | Create dialog in CyclesPage |
| Cycle version locking | ✓ | exists-partial | tm_cycle_scope tracks case versions — enforcement in UI unclear |
| Add cases to cycle (from grid) | ✓ | exists-verified | useAddCasesToScope |
| Add set to cycle | ✓ | exists-partial | Multi-set operations in CyclesPage |
| Cycle assignee management | ✓ | exists-partial | Assignment in cycle scope — confirmation needed |
| Cycle cloning | ✓ | exists-partial | Bulk archive/copy actions in CyclesPage |
| Test Plans (container for cycles) | ✓ | orphaned | useTestPlansG26 + 9 test-plans/ components — NOT routed |
| Planning tab in CycleDetail | ✓ | exists-partial | Planning tab placeholder in CycleDetailPage — TBD in code |
| **TEST EXECUTION** |
| Case-by-case execution (step-by-step) | ✓ | exists-verified | ExecutionPage confirmed working |
| Step pass/fail/blocked controls | ✓ | exists-verified | ExecutionPage |
| Step attachment (screenshot/logs) | ✓ | exists-partial | Evidence panels in CycleDetailPage — confirmation needed |
| Execution timer | ✓ | exists-partial | Timer in ExecutionPage — confirmation needed |
| Case execution notes | ✓ | exists-partial | Notes in execution — confirmation needed |
| Bulk step assign (Pass/Fail) | ✓ | missing | No bulk step operations |
| Execution dashboard (KPIs in cycle) | ✓ | exists-partial | Cycle detail shows some stats; completeness unclear |
| Offline execution / mobile app | ✓ | out-of-scope | Web-first; no mobile app planned |
| **DEFECT MANAGEMENT** |
| Defects list page | ✓ | exists-verified | DefectsPage using canonical BacklogPage |
| Create defect from execution | ✓ | exists-partial | Defect panels in CycleDetailPage; from-step creation unclear |
| Defect lifecycle | ✓ | exists-partial | tm_defects has status; workflow enforcement unclear |
| Jira defect sync (bidirectional) | ✓ | missing | No Jira webhook integration in Test Hub |
| **TRACEABILITY** |
| Requirement → test case linking | ✓ | exists-partial | tm_requirement_tests join + useRequirementLinks; UI unclear |
| Coverage matrix (visual) | ✓ | exists-partial | TraceabilityPage exists; content/quality unclear |
| Automatic coverage percolation | ✓ | exists-partial | tm_get_requirement_test_cases RPC (suspect; needs probe) |
| Uncovered requirements dashboard | ✓ | missing | No dedicated uncovered-req view |
| **REPORTING** |
| Reports list page | ✓ | exists-partial | ReportsPage: 13 report tile grid — stubs only |
| Execution Summary report | ✓ | missing | ReportDetailPage is stub |
| Execution History/Trend report | ✓ | missing | Stub |
| Case Distribution report | ✓ | missing | Stub |
| Automation Activity report | ✓ | missing | Stub |
| Defect Trend report | ✓ | missing | Stub |
| Release Readiness report | ✓ | missing | Stub |
| Traceability Summary report | ✓ | missing | Stub |
| Dynamic/filter-based reports | ✓ | missing | No dynamic report engine |
| Export (PDF, Excel, CSV) | ✓ | missing | No export functionality |
| **AI FEATURES** |
| Generate test cases from requirements | ✓ | exists-unwired | useAIGeneration.ts + Edge Fn ai-generate-test-cases — dead code in UI |
| Generate edge/negative/boundary cases | ✓ | missing | Not in useAIGeneration.ts scope |
| AI step generation | ✓ | missing | Not in useAIGeneration.ts |
| AI defect analysis/linking | ✓ | missing | No AI in defect flow |
| AI token tracking/budget | ✓ | missing | No AI cost management |
| BDD/Gherkin scenario generation | ✓ | missing | No Gherkin support |
| AI use case confidence scoring | ✓ | missing | No confidence UI |
| **ADMIN & CONFIG** |
| Test priorities admin | ✓ | exists-verified | TestPrioritiesPage — routed at /admin/test/priorities |
| Test case types admin | ✓ | exists-verified | TestCaseTypesPage — routed |
| Test case statuses admin | ✓ | exists-verified | TestCaseStatusesPage — routed |
| Test run statuses admin | ✓ | exists-verified | TestRunStatusesPage — routed |
| Test permissions admin | ✓ | exists-verified | TestPermissionsPage — routed |
| Custom fields admin | ✓ | missing | No generic custom field system |
| Audit log | ✓ | missing | No Test Hub-specific audit trail |
| Cycle templates | ✓ | missing | No template system |
| **CATALYST-NATIVE FEATURES** |
| Dashboard KPI widgets (tm_* powered) | - | missing | ProjectDashboardPage mode='test' mounted; test widgets absent |
| AI test case generation with CATY chat | - | catalyst-native | CATY conversational layer is Catalyst-only |
| Risk-based test prioritization | - | catalyst-native | AI-driven; Catalyst-only opportunity |
| Release readiness gate (visual checklist) | - | catalyst-native | No AIO equivalent; Catalyst advantage |
| Failure cluster detection | - | catalyst-native | Real-time ML; Catalyst-only |
| My Work (assigned test cases view) | ✓ | exists-verified | MyWorkPage using canonical BacklogPage |
| Board (Kanban for test cases) | ✓ | exists-verified | BoardPage using canonical KanbanPage |

---

## Gap Summary

```
Total features catalogued:     ~65
Exists and verified:           14  (21%)
Exists partial/unwired:        28  (43%)
Missing:                       18  (28%)
Orphaned:                       2   (3%)
Out of scope:                   1   (2%)
Catalyst-native planned:        5   (8%)
```

**Critical missing:**
1. Reports — 13 report types all stubs (highest UX gap vs AIO)
2. AI UI integration — hook exists, zero UI
3. Jira defect sync — no bidirectional connection
4. Shared steps library — no concept in codebase
5. Release Readiness view — Catalyst-native; high strategic value
6. Custom fields system — AIO core feature; not present

**Highest risk partial:**
1. CaseDrawer (custom, not CatalystViewBase — parity defect risk)
2. Test Plans (9 orphaned components — wire or delete decision needed)
3. tm_get_requirement_test_cases (suspect SQL — staging probe needed)
4. Traceability matrix (page exists; quality/completeness unknown)

---

## Priority Recommendations

| Priority | Capability | Rationale |
|---|---|---|
| P0 | Reports (5 core types) | Biggest visible gap; users cannot get results view |
| P0 | CaseDrawer → CatalystViewBase migration | Parity risk; ActivityPanel missing |
| P0 | AI UI integration (useAIGeneration wired) | Hook ready; just needs UI trigger |
| P1 | Dashboard test KPI widgets | DashboardPage mounted but empty |
| P1 | Defect → Jira sync | Key enterprise feature |
| P1 | Traceability matrix quality audit + fix | tm_get_requirement_test_cases suspect |
| P2 | Shared steps library | Important for test reuse; new schema needed |
| P2 | Custom fields system | Complex; needs Gate 4 |
| P2 | Release Readiness view | Catalyst-native strategic differentiator |
