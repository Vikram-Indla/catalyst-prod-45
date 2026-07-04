# Discovery 13 — Release/Sprint ↔ Test Integration

Feature: CAT-TESTHUB-PROD-20260703-001 · Agent: release/sprint integration mapper · Date: 2026-07-03
Rules of evidence: every claim cites file:line or command output. UNKNOWN stated where applicable.

---

## 1. Executive summary

There are **four distinct "release" identity spaces** in the codebase, and every test↔release
linkage points at the **legacy `releases` table**, while the **live, routed release UX runs on
`ph_releases`** (releases-management) and **`rh_releases`** (release-hub command center). The
entire release-side test surface (`src/pages/releases/**` + most of
`src/components/releases/{test-cycles,test-execution,add-tests,test-case-detail,cycle-command-center,quality-gates}`)
is **orphaned — no route mounts it** (`/releases/*` redirects to `/release-hub/overview`,
`src/routes/FullAppRoutes.tsx:897`). Quality gates and release readiness are a fully built
schema + RPC + hook + component stack that **no live page renders**. TestHub cycles pages fork
completely from the release-side cycle components (zero shared components), but both sit on the
same `tm_test_cycles` hooks — so data converges while UI diverges. Sprint↔test linkage is clean
and recent (`sprint_id → ph_jira_sprints` FKs, 2026-06-27), but reports resolve sprint scope from
`ph_issues.sprint_release` JSONB — two parallel sprint-linkage models.

---

## 2. The four release identity spaces (verified)

| # | Table | Who reads/writes it | Evidence |
|---|-------|---------------------|----------|
| 1 | `releases` (legacy) | `tm_test_cases.release_id` FK, `tm_test_cycles.release_id` FK, `tm_release_quality_gates.release_id` FK, `useTestCaseRelease`, `useAllReleases`, `useReleasesV2`, all orphaned `src/pages/releases/**` | bootstrap migration `20260516120000` lines 80346, 80778, 80826; `src/hooks/test-management/useTestCaseRelease.ts:29-33`; `src/hooks/releases/useAllReleases.ts:31`; `src/hooks/releases/useReleasesV2.ts:77` |
| 2 | `rh_releases` (release-hub ops) | Live `/release-hub/overview` CommandCenterPage — carries its own denormalized `readiness_pct` column (NOT computed from quality gates) | `src/hooks/useReleaseHub.ts:82-83` (`readiness_pct` in select), consumed at `src/pages/releasehub/CommandCenterPage.tsx:165` |
| 3 | `ph_releases` (project-hub / live releases-management) | Live `/release-hub/releases-management` + `:releaseSlug` detail; work linkage via `ph_issues.sprint_release` JSONB | `src/hooks/workhub/useReleases.ts:16,50,128`; `src/pages/release-hub/ReleaseDetailPage.tsx:152-172` (rename loop rewrites `ph_issues.sprint_release` JSONB) |
| 4 | `release_versions` (older still) | `tm_test_cases.release_version_id` FK still exists alongside `release_id` | bootstrap `20260516120000` line 80786; explicitly deprecated in `useTestCaseRelease.ts:20-22` comment ("not release_versions") |

**Consequence:** a test case, test cycle, or quality gate "assigned to a release" is assigned to
a `releases` row that the live release surfaces never display. The live `ph_releases` detail page
has **zero** test/tm_/quality references (grep of
`src/pages/release-hub/ReleaseDetailPage.tsx` for `test|quality|gate|readiness|tm_` matched only
`useNavigate`; grep of `src/components/releases/detail/ReleaseSidePanel.tsx` (60.6K) and
`WorkItemsSection.tsx` (53.9K) for `tm_|quality|readiness|test` returned 0 functional hits).

---

## 3. Routing truth — what is live vs orphaned

### Live (mounted in `src/routes/FullAppRoutes.tsx`)
- `/release-hub/overview` → `src/pages/releasehub/CommandCenterPage.tsx` (rh_releases) — line 753
- `/release-hub/releases-management` → `src/pages/project-hub/ReleasesPage.tsx` (ph_releases via `useWHReleases`, `vw_release_jira_progress`) — line 764; page imports at `ReleasesPage.tsx:15,67`
- `/release-hub/releases-management/:releaseSlug` → `src/pages/release-hub/ReleaseDetailPage.tsx` — line 765
- `/testhub/cycles`, `/testhub/:projectKey/cycles/:cycleKey`, `.../execute` → `src/pages/testhub/cycles/{CyclesPage,CycleDetailPage,ExecutionPage}.tsx` — lines 671-676
- `/releases/*` → **redirect** to `/release-hub/overview` — line 897

### Orphaned (NO route file imports them)
`rtk proxy grep -rn "pages/releases" src/routes/` → **zero matches**. The only importers of
`src/pages/releases/**` outside itself are `src/components/releases/cycle-command-center/CycleTabNavigation.tsx`
(itself only reachable from the orphan cluster), `src/registry/usage-map.generated.ts`, and
`src/utils/releaseModuleDocumentation.ts` (docs).

Orphaned pages (all of `src/pages/releases/`, 19 files):
`AllReleasesPage.tsx` (88.6K), `QualityGatesPage.tsx` (33.1K), `TestCyclesPage.tsx` (22.5K),
`CycleCommandCenter.tsx`, `CommandCenterPage.tsx` (35.7K), `ExecutionPage.tsx`,
`CoverageReportsPage.tsx` (34.3K), `TestPlansPage.tsx` (24K), `DefectsPage.tsx`,
`DefectDetailPage.tsx` (44K), `ReleaseDashboardPage.tsx`, `CalendarPage.tsx`, `ComparePage.tsx`,
`MyTestScopePage.tsx`, `TestCyclesPage`, etc.

Orphaned component clusters under `src/components/releases/` (only consumed by the orphan pages):
- `test-cycles/` (CreateCycleModal, CycleCardEnhanced, CycleKPICards, CycleTableView, EditTestCycleDialog …)
- `test-execution/` (ExecutionHeader, StepExecutionCard, TestCaseNavigator, LogDefectModal …)
- `test-case-detail/` (TestCasePropertiesPanel 26.8K, TestCaseSteps 23.6K, TestCaseDataTab 27.8K, RequirementsCoverage, ExecutionSummaryCard …)
- `add-tests/` (AddTestsSlideOver, TestRepositoryBrowser 14K, BulkAssignmentForm …)
- `cycle-command-center/` (CommandCenterView, ExecutionProgressChart, StatusDonutChart, TeamWorkloadBars …)
- `quality-gates/` (QualityGateEditor, ReadinessStatusCard, ReadinessHistoryTable, GateHistoryPanel, ReleaseTestSummaryPanel, EditQualityGateDialog, DeleteGateConfirmationDialog) — only page importer is orphaned `src/pages/releases/CommandCenterPage.tsx` / `QualityGatesPage.tsx`
- `analytics/`, `dashboard/`, `defects/` subdirs — same orphan cluster (UNKNOWN whether any single file has a live importer; spot checks found none)

### Live components inside `src/components/releases/`
- `detail/WorkItemsSection.tsx` + `detail/ReleaseSidePanel.tsx` — imported by the routed
  `ReleaseDetailPage.tsx:25-26`. **Neither touches test data.**
- `detail/summarize/useReleaseSummaryStream.ts` — used at `ReleaseDetailPage.tsx:31,269`.

---

## 4. How releases consume test data today

### 4.1 Live surfaces: they don't
- Live `ph_releases` detail (`ReleaseDetailPage.tsx`): no test queries at all (§2).
- Live `rh_releases` command center: shows `readiness_pct` as a **stored column** on
  `rh_releases` (`useReleaseHub.ts:83`), not derived from test executions or quality gates.
  "Release Health (readiness bars)" header comment at `CommandCenterPage.tsx:7`.
- Live releases-management list: progress from `vw_release_jira_progress`
  (`ReleasesPage.tsx:67`) — Jira issue progress, not test results.

**Net: zero live release surface consumes tm_* test data. All release↔test consumption is in the
orphan cluster.**

### 4.2 Orphaned-but-built consumption (the buried asset)
- `useReleaseTestSummary(releaseId)` → RPC `tm_get_release_test_summary` aggregates
  `tm_test_cycles` per release (cycle pass/fail/blocked/not_run, execution %, pass %, defect
  totals incl. blockers/criticals) — `src/hooks/releases/useReleaseQualityGates.ts:195-208`;
  RPC reads `FROM tm_test_cycles c` (bootstrap line 21598).
- Quality gates: `tm_release_quality_gates` (gate_type ∈ pass_rate | execution_rate |
  defect_count | blocker_count | coverage | custom; threshold operator/value; `is_blocking`;
  waiver fields `waived_by/waiver_reason/waiver_expires_at`) — hook interface
  `useReleaseQualityGates.ts:10-29`; RPC `tm_evaluate_quality_gates` reads gates + release
  (bootstrap 20492-20515). Gate templates table `tm_gate_templates` + apply-template hook
  (`useReleaseQualityGates.ts:296-358`). Per-gate audit history via `tm_get_gate_history`
  (`useReleaseQualityGates.ts:280-293`) backed by `tm_gate_evaluation_history` (FK bootstrap 80146).
- Readiness: `tm_release_readiness` snapshots (overall_status ∈ not_ready | at_risk | ready |
  approved; gates passed/total; blocking passed/total; exec %; pass %; open blockers/criticals;
  recommendation; approve workflow) — `src/hooks/releases/useReleaseReadiness.ts:10-26`; RPCs
  `tm_create_readiness_snapshot` / `tm_approve_release_readiness` (`useReleaseReadiness.ts:68,102`).
- Test-case ↔ release assignment: `tm_test_cases.release_id` (writes via
  `useUpdateTestCaseRelease`, `useTestCaseRelease.ts:63-86`), selectable list =
  `releases` with status planned/ready (`useTestCaseRelease.ts:29-33`). A DB trigger
  `trg_tm_test_cases_release_sync` maintains release test-case counts (bootstrap 70083-70086).
- Cycle ↔ release: `tm_test_cycles.release_id → releases(id)` (bootstrap 80826).

### 4.3 `src/lib/shared-quality/` — the ownership contract, currently dead weight
`src/lib/shared-quality/index.ts` declares: "Defects: TestHub owns full CRUD, ReleaseHub reads;
Quality Gates: ReleaseHub owns full CRUD, TestHub reads; Readiness: ReleaseHub owns." It is pure
re-exports of `useReleaseQualityGates` / `useReleaseReadiness` / **`useDefectsG25`**
(`shared-quality/hooks/useDefects.ts` re-exports from `@/hooks/useDefectsG25` — the G25 hook file
still exists at `src/hooks/useDefectsG25.ts` (17.1K) even though G25 UI was deleted per memory).
Consumers of shared-quality: only the orphaned quality-gates components +
`src/pages/releases/QualityGatesPage.tsx` (grep list, §5 command output). **No live consumer.**

---

## 5. Duplication: release test surfaces vs TestHub surfaces (fork confirmed)

| Concern | Release-side (orphaned) | TestHub-side (live) | Shared? |
|---|---|---|---|
| Cycles list | `src/pages/releases/TestCyclesPage.tsx` + `components/releases/test-cycles/*` (CycleCard/Table/Calendar/KPI) | `src/pages/testhub/cycles/CyclesPage.tsx` (24.6K, self-contained JiraTable — imports only `ProjectPageHeader` + `JiraTable`, lines 22-24) | **Hooks only** (`useTestCycles`/`useTestCyclesEnhanced` → `tm_test_cycles`, `tm_cycle_scope`) — component layer forks |
| Cycle detail / command center | `pages/releases/CycleCommandCenter.tsx` + `components/releases/cycle-command-center/*` (donut, workload bars, activity feed) | `pages/testhub/cycles/CycleDetailPage.tsx` (49.1K, imports only `ProjectPageHeader` from components) | Fork |
| Execution runner | `components/releases/test-execution/*` (StepExecutionCard, ExecutionHeader, LogDefectModal) | `pages/testhub/cycles/ExecutionPage.tsx` (35.1K, zero components/ imports) | Fork |
| Test case detail | `components/releases/test-case-detail/*` (PropertiesPanel 26.8K, Steps 23.6K) — **this is the only place `useTestCaseRelease` is consumed** (import at test-case-detail, §4 grep) | TestHub repository detail (separate discovery doc scope) | Fork |
| Add tests to cycle | `components/releases/add-tests/AddTestsSlideOver` + `TestRepositoryBrowser` | CycleDetailPage inline (UNKNOWN exact mechanism — page is self-contained) | Fork |
| Defects | `components/releases/defects/*` + orphaned `pages/releases/DefectsPage` | live `pages/testhub/DefectsPage.tsx` + canonical QA-Bug modal (memory: defect-creation-canonical-qabug) | Fork |
| Cycle detail view (modal) | — | `src/components/catalyst-detail-views/test-cycle/CatalystViewTestCycle.tsx` consumes `useTestCycles` (live) | n/a |
| Dashboard widget | — | `src/components/project-hub/dashboard/widgets/TestCyclesProgressWidget.tsx` consumes `useTestCycles` (live) | n/a |

Both sides converge on the same hooks/tables (`useTestCycles` grep hit list spans both trees), so
**data cannot drift, but UI/UX already has**: two cycle creation modals
(`components/releases/test-cycles/CreateCycleModal.tsx` + `CreateCycleModalEnhanced.tsx` vs
TestHub CyclesPage inline create with sprint select, `CyclesPage.tsx:258-293,360-362`), two
execution runners, two defect surfaces.

---

## 6. Sprint ↔ test integration

- **FK model (canonical, 2026-06-27):** `sprint_id uuid REFERENCES ph_jira_sprints(id)` added to
  `tm_test_cycles`, `tm_test_plans`, `tm_test_cases`, `tm_defects` + indexes —
  `supabase/migrations/20260627192541_testhub_sprint_id.sql:4-19` (CAT-TESTHUB-SPRINT-20260627-001).
- **Hook:** `useSprintsByProject` reads `ph_jira_sprints` (`src/hooks/test-management/useSprintsByProject.ts:19`).
  Consumers: TestHub `CyclesPage.tsx:271` (sprint select on cycle create, writes `sprint_id`,
  line 293) and `src/components/test-plans/dialogs/tabs/BasicInfoTab.tsx`.
- **JSONB model (reports):** `SprintTestingStatusBody.tsx:4` — "Scope resolved from
  `ph_issues.sprint_release` JSONB"; also `PointsBurndownBody.tsx`. The live release detail rename
  flow also rewrites `ph_issues.sprint_release` JSONB and explicitly warns `sprint_name` text is
  wiped by jira-sync (`ReleaseDetailPage.tsx:152-156`).
- **Two sprint-linkage models coexist:** tm_* FK to `ph_jira_sprints` vs delivery-side
  `ph_issues.sprint_release` JSONB. Sprint testing reports use JSONB scope; cycle/plan/case/defect
  records use the FK. Any "sprint quality gate" feature must bridge both.
- `rh_release_sprints` also exists on the rh_ side (`useReleaseHub.ts:161`) — a third
  sprint↔release linkage, release-hub-local.

---

## 7. Quality gates / release readiness — enterprise gap analysis

**What already exists (schema + RPC + hooks + components, all functional but unmounted):**
- Gate CRUD, 6 gate types, blocking/non-blocking, thresholds with 5 operators
  (`useReleaseQualityGates.ts:14-15`)
- Auto-evaluation RPC with per-gate results + blocking summary (`GateEvaluation`, lines 72-84)
- Waivers with reason + expiry + audit (`useWaiveQualityGate`, lines 240-277)
- Gate templates + apply (`tm_gate_templates`, lines 296-358)
- Gate evaluation history (`tm_gate_evaluation_history` FK bootstrap 80146; `tm_release_gate_results` FK 80322)
- Readiness snapshots + approval workflow (`useReleaseReadiness.ts`)
- UI: editor, dialogs, readiness card, history table, test summary panel (`components/releases/quality-gates/`)

**Gaps for production-grade release-readiness:**
1. **Identity mismatch (blocking):** everything is FK'd to legacy `releases(id)`; the live release
   surfaces are `ph_releases` (slug-routed) and `rh_releases`. Gates cannot be shown on any live
   release page without either re-pointing FKs, a mapping table, or migrating the live surface to
   consume `releases`. UNKNOWN whether `releases`, `ph_releases`, `rh_releases` rows are
   mirrored/synced anywhere (no sync code found in the hooks read).
2. **No mount point:** zero routes render the gate/readiness UI (§3).
3. **`rh_releases.readiness_pct` is a manually stored column**, not derived from gate evaluation —
   two competing "readiness" definitions.
4. **No sprint-level gates:** gate model is release-only (`release_id NOT NULL`, bootstrap 43425);
   no sprint_id despite sprint FKs existing on all tm_* artifacts.
5. **Coverage gate type exists but no coverage source is wired** — coverage = stories
   (`linked_story_key` on `tm_test_cases`, `story-test-cases/TestCasesSection.tsx:9`); the
   evaluate RPC's coverage computation basis is UNKNOWN (not read in full).
6. **`useTestCaseRelease` fallback anti-pattern:** on status-filter error it silently returns all
   releases (`useTestCaseRelease.ts:36-45`) — violates zero-assumption rendering.
7. **Dual legacy FKs on tm_test_cases:** both `release_version_id` (→ release_versions) and
   `release_id` (→ releases) survive (bootstrap 80778, 80786) — needs deprecation decision.

---

## 8. Fork/drift risk verdict

- **Release test surfaces and TestHub surfaces FORK at the component level** (zero shared
  components; TestHub pages import only `ProjectPageHeader`/`JiraTable`) while **sharing the
  hook/table layer**. Since the release side is unrouted, the *practical* drift risk today is not
  dual maintenance but **resurrection risk**: re-mounting any `pages/releases/**` page would ship
  a second, stale, non-JiraTable cycle/execution/defect UX on the legacy `releases` id space.
- The valuable, non-duplicated assets in the orphan cluster are the **quality-gates/readiness
  stack** (schema, RPCs, hooks) and arguably `TestRepositoryBrowser`/`AddTestsSlideOver` patterns
  — candidates to lift into TestHub or the live `ph_releases` detail page rather than revive
  wholesale.
- `src/lib/shared-quality/` is the right ownership contract on paper; today it has no live
  consumer and still re-exports G25 defect hooks (`useDefectsG25`) that the defect surface has
  moved away from (canonical QA-Bug modal → `tm_defects`).

## 9. Open unknowns

- Whether `releases` ↔ `ph_releases` ↔ `rh_releases` rows are synced by any job/trigger: UNKNOWN
  (no evidence found in hooks or migrations read; a full trigger sweep was not done).
- Exact coverage formula inside `tm_evaluate_quality_gates` / `tm_get_release_test_summary`
  (functions only partially read): UNKNOWN.
- Whether `components/releases/analytics|dashboard|defects` have any live importer beyond the
  orphan pages: spot-checked negative, exhaustive sweep not done.
