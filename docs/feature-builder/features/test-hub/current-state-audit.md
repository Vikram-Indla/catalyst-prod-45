# Current State Audit: test-hub

**Date:** 2026-06-26
**Experiments:** exp-001 + exp-002 + test-01
**Source:** Code read + TESTHUB_GAP_ANALYSIS.md + TESTHUB_VERIFICATION_REPORT.md + TESTHUB_BUILD_HANDOVER.md + Lane 1 deep audit

---

## Routes (FullAppRoutes.tsx lines 655–673)

16 routes registered (14 in exp-001 doc was incomplete; corrected in test-01):

| Route | Page component | Status |
|---|---|---|
| `/testhub` | → redirect to `/testhub/dashboard` | ✅ |
| `/testhub/dashboard` | `DashboardPage` | ✅ canonical thin wrapper |
| `/testhub/my-work` | `MyWorkPage` | ✅ canonical thin wrapper |
| `/testhub/board` | `BoardPage` | ✅ canonical thin wrapper |
| `/testhub/repository` | `RepositoryPage` | ⚠️ custom — needs JiraTable |
| `/testhub/repository/:caseId` | `CaseDrawer` | ❌ custom portal — HIGH RISK |
| `/testhub/cycles` | `CyclesPage` | ⚠️ unknown table type |
| `/testhub/cycles/:id` | `CycleDetailPage` | ⚠️ planning tab empty |
| `/testhub/cycles/:id/execute` | `ExecutionPage` | ⚠️ partially implemented |
| `/testhub/sets` | `TestSetsPage` | ⚠️ unknown table type |
| `/testhub/sets/:id` | `SetDetailPage` | ⚠️ not fully read |
| `/testhub/traceability` | `TraceabilityPage` | ⚠️ content not verified |
| `/testhub/reports` | `ReportsPage` | ❌ 13 stub tiles |
| `/testhub/reports/:type` | `ReportDetailPage` | ❌ stub body |
| `/testhub/filters` | `FiltersListPage` | ✅ canonical thin wrapper |
| `/testhub/filters/:filterId` | `FilterDetailPage` | ✅ canonical thin wrapper |

**Admin routes (FullAppRoutes.tsx lines 139–144):**
- `TestPrioritiesPage`, `TestCaseTypesPage`, `TestCaseStatusesPage`, `TestRunStatusesPage`, `TestPermissionsPage`

---

## Pages — Full Page-by-Page Audit (test-01 Lane 1)

| File | Verdict | Notes |
|---|---|---|
| `DashboardPage.tsx` | ✅ EXCELLENT | Mounts `ProjectDashboardPage mode='test'`; test widgets absent (feature gap, not bug) |
| `MyWorkPage.tsx` | ✅ EXCELLENT | Mounts `BacklogPage` + testCasesDataSource adapter; correct pattern |
| `BoardPage.tsx` | ✅ EXCELLENT | Mounts `KanbanPage mode='test'`; correct pattern |
| `DefectsPage.tsx` | ✅ EXCELLENT | Mounts `BacklogPage` + defectsDataSource adapter; correct pattern |
| `FiltersListPage.tsx` | ✅ EXCELLENT | Mounts canonical `FiltersListPage hubType='test'`; correct pattern |
| `FilterDetailPage.tsx` | ✅ EXCELLENT | Mounts canonical `FilterDetailPage hubType='test'`; correct pattern |
| `RepositoryPage.tsx` | ⚠️ NEEDS REBUILD | Custom list UI; not JiraTable; folder sidebar basic; needs full build-01 rebuild |
| `repository/CaseDrawer.tsx` | ❌ HIGH RISK | 426 lines; `createPortal(panel, document.body)`; NOT CatalystViewBase; missing ActivityPanel, keyboard nav, breadcrumb |
| `repository/StepEditor.tsx` | ⚠️ UNKNOWN | Not fully audited; likely custom form — verify against ADS inline edit |
| `cycles/CyclesPage.tsx` | ⚠️ PARTIAL | List exists; table type unknown; no confirmed JiraTable use |
| `cycles/CycleDetailPage.tsx` | ⚠️ PARTIAL | Has tabs structure; Planning tab has no content (TBD placeholder) |
| `cycles/ExecutionPage.tsx` | ⚠️ PARTIAL | Step-by-step execution UI exists; completion state handling unknown |
| `sets/TestSetsPage.tsx` | ⚠️ UNKNOWN | Not fully audited; table type unknown |
| `sets/SetDetailPage.tsx` | ⚠️ UNKNOWN | Not fully audited; case list within set not verified |
| `traceability/TraceabilityPage.tsx` | ⚠️ UNKNOWN | File exists; content quality not verified in test-01 |
| `reports/ReportsPage.tsx` | ❌ ALL STUBS | 13 tile grid; clicking any tile routes to ReportDetailPage stub |
| `reports/ReportDetailPage.tsx` | ❌ STUB | Body is placeholder text; no report renders |
| `defects/DefectsPage.tsx` | ✅ EXCELLENT | Duplicate mount point; same as root DefectsPage — correct canonical pattern |
| `filters/FilterPreviewPage.tsx` | ⚠️ UNKNOWN | Not fully audited |

**Summary:** 6 excellent (37%), 7 partial/unknown (44%), 3 high risk/stub (19%)

---

## Hooks (src/hooks/test-management/) — 28+ files, ~6,276 lines

| Hook | Purpose | Status |
|---|---|---|
| `useTestCases.ts` | CRUD on tm_test_cases | ✅ active |
| `useTestCycles.ts` | CRUD on tm_test_cycles | ✅ active |
| `useTestCyclesEnhanced.ts` | Extended cycle queries | ✅ active |
| `useFolders.ts` | Folder tree (tm_folders) | ✅ active |
| `useDefects.ts` | Defect tracking | ✅ active |
| `useRepositoryData.ts` | Repository page data | ✅ active |
| `useAIGeneration.ts` | CATY AI test content generation | ❌ DEAD CODE — no UI trigger wired |
| `useAdminConfig.ts` | Reads admin tables (priorities, types, statuses) | ✅ active |
| `useAutoVersioning.ts` | Case version management | ✅ active |
| `useCreateRunWithDataRows.ts` | Execution run creation | ✅ active |
| `useDataRowResults.ts` | Result rows | ✅ active |
| `useTestCaseExecutionHistory.ts` | Execution history per case | ✅ active |
| `useTestCaseRelease.ts` | Case↔release linkage | ✅ active |
| `useTestCaseTags.ts` | Label/tag management | ✅ active |
| `useTestCaseVersions.ts` | Version list | ✅ active |
| `useReleases.ts` | Release picker | ✅ active |
| `useProjects.ts` | Project scoping | ✅ active |
| `useTestData.ts` | Generic data hook | ✅ active |
| `useTestSteps.ts` | Step CRUD | ✅ active |
| `useTestPlansG26.ts` | Test Plans data | ❌ ORPHANED — uses `as any`; types not generated |
| `index.ts` | Barrel export | ✅ active |
| Additional hooks (parallel dirs) | hooks/test-cases/, hooks/testhub/, hooks/test-cycles/ | ⚠️ fragmented — parallel hook directories |

**Total:** 28+ hooks across 4 parallel directories. Core CRUD complete. 2 dead/orphaned.

---

## Components — Active

| Component | Location | Status |
|---|---|---|
| `TestHubSidebar` | `src/components/layout/TestHubSidebar.tsx` | ✅ correct SidebarBase pattern |
| `StepEditor` | `src/pages/testhub/repository/StepEditor.tsx` | ⚠️ active but custom form — needs ADS audit |

---

## Components — Orphaned (built but not routed/used)

| Component folder | Count | Notes |
|---|---|---|
| `src/components/test-plans/` | 9 files | AIGeneratorModal, SaveAsTemplateModal, OverviewTab, ScopeTab, BulkAssignModal, RunProgressCard, TestPlanHealthBadge, TemplateSelector, TestPlanFilters — all orphaned |
| `src/components/test-cycles/calendar/` | 5 files | CycleCalendarView, DayView, CalendarDayCell, CalendarHeader, TestEventCard — built, not used |
| `src/components/test-cycles/assignment-table/` | 2+ files | Not integrated |
| `src/components/testhub/versioning/VersionDiffView.tsx` | 1 file | Imported nowhere |

**Total orphaned:** 14+ components. Vikram decision required: wire or delete. **Wire-vs-delete is a Gate 3 item.**

---

## Schema State

| Schema family | Status |
|---|---|
| `tm_*` | CANONICAL — all active src/ code reads tm_* only |
| `th_*` | DEAD — 27+ tables in DB; 0 active code references; cleanup = optional migration |

**Active tm_* tables:** `tm_test_cases`, `tm_test_steps`, `tm_test_cycles`, `tm_cycle_scope`, `tm_test_runs`, `tm_step_results`, `tm_defects`, `tm_defect_links`, `tm_folders`, `tm_test_sets`, `tm_set_cases`, `tm_environments`, `tm_case_priorities`, `tm_case_types`, `tm_labels`, `tm_case_labels`

---

## AI Capability State

| Capability | File | Status |
|---|---|---|
| Test case generation Edge Fn | `supabase/functions/ai-generate-test-cases/` | ✅ exists |
| useAIGeneration hook | `src/hooks/test-management/useAIGeneration.ts` | ✅ exists, calls Edge Fn |
| AIGeneratorModal component | `src/components/test-plans/AIGeneratorModal.tsx` | ❌ ORPHANED — not wired |
| AI CTA in any Test Hub page | Any Test Hub page | ❌ NONE — zero UI trigger exists |
| useAIIntelligence shared hook | `src/hooks/useAIIntelligence.ts` | ✅ exists (shared) |

**Verdict:** Complete AI generation capability exists at infra level; zero UI exposure. Highest-value unwired feature.

---

## Known Critical Issues

### Issue 1 — DUAL SCHEMA: RESOLVED AT UI LAYER ✅

Prior `th_*` references confirmed eliminated. All active src/ reads `tm_*`. `th_*` tables remain in DB (zero UI exposure; cleanup optional).

### Issue 2 — CaseDrawer Custom Portal (HIGH RISK — build-02 gate item) ❌

`src/pages/testhub/repository/CaseDrawer.tsx` (426 lines):
- `createPortal(panel, document.body)` — NOT CatalystViewBase
- Missing: ActivityPanel, keyboard handling (Escape), canonical breadcrumb, mobile responsiveness
- Risk: same defect pattern as BrSidebarDetails (18+ parity defects 2026-06-01)
- Fix: full migration to CatalystViewBase in build-02

### Issue 3 — useAIGeneration Dead Code (HIGH OPPORTUNITY — build-05 gate item)

`useAIGeneration.ts` calls Edge Fn `ai-generate-test-cases` and is fully functional at hook level. Zero UI trigger. Wire with `AIIntelligenceButton` + Gate 7 approval in build-05.

### Issue 4 — Reports All Stubs (HIGH GAP — build-04 gate item) ❌

`ReportsPage.tsx`: 13 tile stubs. `ReportDetailPage.tsx`: stub body. Zero report renders implemented. Largest visible gap vs AIO Tests. Target: 5 core reports in build-04.

### Issue 5 — `tm_get_requirement_test_cases` Suspect SQL (P1 — exp-003 gate item)

RPC exists in types.ts (line 69796), called by `useRequirementLinks`. Prior session flagged possible reference to deleted `tm_test_executions` table. Cannot verify internal SQL without staging DB probe. **Block before Traceability build (build-03). Run staging probe in exp-003.**

### Issue 6 — Test Plans Orphaned (P1 — Vikram decision required) ❌

`useTestPlansG26.ts` uses `as any` for `tm_test_plans` + `plan_test_cycles` (types not generated). 9 components in `test-plans/` built but wired to zero routes. Two options: (A) wire as Phase 1 feature with `/testhub/plans` route; (B) delete and defer to Phase 2. **Gate 3 decision.**

### Issue 7 — Dashboard Test Widgets Absent (P2 — build-06 scope)

`ProjectDashboardPage mode='test'` renders empty grid (no test widgets registered). No crash, no bad data — just feature gap. Address in build-06 after core pages complete.

### Issue 8 — Parallel Hook Directories (P3 — tech debt)

4 parallel hook directories: `hooks/test-management/`, `hooks/test-cases/`, `hooks/testhub/`, `hooks/test-cycles/`. Fragmented. Non-blocking but confusing. Consolidation recommended in Phase 2.

---

## Quality Score Summary

| Dimension | Score | Notes |
|---|---|---|
| Route coverage | 16/16 | All routes registered; 6 need rebuild |
| Page quality | 6/16 excellent, 7 partial, 3 stubs | 37% excellent; 19% stub/high-risk |
| Hook coverage | 26/28 active | 2 dead/orphaned |
| Schema health | tm_* canonical ✅ | th_* dead; cleanup optional |
| AI capability | 0/4 wired to UI | Infrastructure complete; UI missing |
| Reports | 0/13 implemented | Largest gap |
| **Overall:** | **~70%** | Solid foundation; incomplete on AI, reports, and key detail views |

---

## Existing Documentation

| Doc | Location | Notes |
|---|---|---|
| `TESTHUB_GAP_ANALYSIS.md` | repo root | Dual schema analysis, column-level schema mapping (Apr 2026) |
| `TESTHUB_VERIFICATION_REPORT.md` | repo root | Source code pattern verification vs migration SQL |
| `TESTHUB_BUILD_HANDOVER.md` | `src/pages/testhub/` | Phase 1/2/3 build plan, DB table map, acceptance criteria |
| Tests README | `tests/test-management/README.md` | Test suite info |
| Golden path spec | `tests/test-management/golden-path.spec.ts` | E2E test |
| Smoke spec | `tests/test-management/smoke.spec.ts` | Smoke test |

---

## Next Actions (Gate 3 decisions required before build experiments)

| Decision | Owner | Default if no response |
|---|---|---|
| Test Plans: wire (`/testhub/plans`) or delete 9 components? | Vikram | BLOCK build-01 |
| CaseDrawer migration: build-01 or build-02? | Vikram/JK | build-02 (after Repository base lands) |
| AI features Gate 7: approve 6 MVP AI use cases? | Vikram/JK/Aiden | BLOCK build-05 |
| Reports Gate 3: approve 5 core report types? | Vikram/JK | BLOCK build-04 |
| exp-003 staging probe: approve before build-03? | Vikram | BLOCK build-03 |
