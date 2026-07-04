# TestHub Code Map — Discovery 01

Feature: CAT-TESTHUB-PROD-20260703-001 · Agent: code-map discovery · Date: 2026-07-03
Evidence basis: all claims cite `file:line` or command output from repo at commit 7213f84ab (main).

---

## 1. Routing

### 1.1 Route builders — `src/lib/routes.ts:114-135` (`testHubRoutes`)

| Builder | Path |
|---|---|
| root | `/testhub` |
| dashboard | `/testhub/dashboard` |
| myWork | `/testhub/my-work` |
| board | `/testhub/board` |
| repository | `/testhub/repository` |
| cycles / cycle(cycleSlug) / cycleExecute(cycleSlug) | `/testhub/cycles`, `/testhub/cycles/:cycleSlug[/execute]` |
| sets / set(setSlug) | `/testhub/sets`, `/testhub/sets/:setSlug` |
| reports / report(slug) | `/testhub/reports`, `/testhub/reports/:slug` (slug = REPORT_REGISTRY id) |
| filters / filterCreate / filter(filterSlug) | `/testhub/filters[...]` |
| timeline / defects / traceability | `/testhub/timeline`, `/testhub/defects`, `/testhub/traceability` |

### 1.2 Router mounts — `src/routes/FullAppRoutes.tsx`

Lazy imports at lines 161-181; routes at lines 665-699. All wrapped in `<S>` (Suspense).

| Route (line) | Page component |
|---|---|
| `/testhub` → redirect `/testhub/dashboard` (666) | Navigate |
| `/testhub/dashboard` (667) | `pages/testhub/DashboardPage` |
| `/testhub/my-work` (668) | `pages/testhub/MyWorkPage` |
| `/testhub/board` (669) | `pages/testhub/BoardPage` |
| `/testhub/repository` (670) | `repository/RepositoryPage` |
| `/testhub/cycles` (671) | `cycles/CyclesPage` |
| `/testhub/:projectKey/cycles/:cycleKey[/execute]` (672-673) | CycleDetailPage / ExecutionPage |
| `/testhub/cycles/:cycleKey[/execute]` (675-676) | CycleDetailPage / ExecutionPage (legacy, no projectKey) |
| `/testhub/timeline` (677) | `timeline/TestHubTimelinePage` |
| `/testhub/dependencies` (678) | `TestHubDependenciesPage` — **not in `testHubRoutes` builders** |
| `/testhub/sets` (679), `/testhub/sets/:id` (680) | TestSetsPage / SetDetailPage |
| `/testhub/traceability` (681) | `traceability/TraceabilityPage` |
| `/testhub/defects` (682) | `pages/testhub/DefectsPage` (top-level, canonical) |
| `/testhub/reports-lab` → redirect (687) | Navigate |
| `/testhub/reports` + `/testhub/reports/:reportSlug` (688, 694) | `reports/ReportsHubPage` |
| 5 legacy report-slug redirects (689-693) | Navigate |
| `/testhub/filters`, `/filters/create`, `/filters/:filterId` (697-699) | FiltersListPage / FilterPreviewPage ×2 |

### 1.3 CONFIRMED route bugs

1. **Sets navigation is broken.** `TestSetsPage.tsx:435` navigates to `` `/testhub/${projectKey}/sets/${set.id}` `` but **no route `/testhub/:projectKey/sets/:id` exists** (only `/testhub/sets/:id`, FullAppRoutes.tsx:680; the `:projectKey` variants exist only for cycles, lines 672-673). Row click lands on an unmatched route. `SetDetailPage.tsx:367` reads `useParams<{ id; projectKey }>()` with `projectKey = 'BAU'` fallback.
2. **Slug contract violation (CAT-SLUGS-UNIVERSAL-20260701-001).** `/testhub/sets/:id` is navigated with `set.id` (a UUID, TestSetsPage.tsx:435), and `/testhub/filters/:filterId` also carries an id param. Builders in routes.ts pretend slugs (`setSlug`) but callers pass UUIDs. New-route slug contract forbids `:id` UUID params.
3. `/testhub/dependencies` has no builder in `testHubRoutes` — navigations must string-concat (contract violation).

---

## 2. Sidebar — `src/components/layout/TestHubSidebar.tsx` (67 lines)

Thin config over canonical `SidebarBase` (line 22, 59). 12 nav items (lines 34-45): Dashboard, Board, My Work, Filters, Repository, Test Sets, Cycles, Timeline, Dependencies, Defects, Traceability, Reports. Badge `TH`, hub icon from `HUB_ICON_REGISTRY['test']` (54). Mounted by `src/components/layout/CatalystShell.tsx` (grep hit). Fully canonical — no hand-rolled UI.

---

## 3. Page inventory — `src/pages/testhub/**` (7,017 LOC total)

### 3.1 Thin canonical wrappers (production-grade pattern — reuse of hub chassis)

| Page (LOC) | Route | Mounts | Notes |
|---|---|---|---|
| `DashboardPage.tsx` (17) | /dashboard | canonical `ProjectDashboardPage mode="test"` | ph_issues-backed widgets filtered by `hideOnTest`; "Test-specific widgets land later" per header comment — **dashboard currently has few/no test widgets** |
| `BoardPage.tsx` (18) | /board | canonical `KanbanPage mode="test"` | columns DRAFT/IN REVIEW/APPROVED/DEPRECATED; cards = tm_test_cases |
| `MyWorkPage.tsx` (60) | /my-work | canonical `BacklogPage.atlaskit` + `useTestCasesSource` adapter | JiraTable surface; spinner while adapter null; row click → repository ?case= |
| `DefectsPage.tsx` (46, top-level) | /defects | canonical `BacklogPage.atlaskit` + `useDefectsSource` adapter | JiraTable; allowedColumnIds key/status/assignee/reporter/urgency |
| `FiltersListPage.tsx` (13) | /filters | canonical project-hub FiltersListPage `hubType="test"` | TESTHUB save sentinel |
| `FilterPreviewPage.tsx` / `FilterDetailPage.tsx` (10 each) | /filters/create, /filters/:filterId | canonical project-hub filter pages `mode="test"` | |
| `timeline/TestHubTimelinePage.tsx` (100) | /timeline | canonical shared `TimelineView` via `useTestHubTimeline` | date-drag persists tm_test_cycles.planned_start/end; create/child/menu/detail disabled (flat cycles) |
| `TestHubDependenciesPage.tsx` (94) | /dependencies | canonical `DependenciesView hubType="test"` | tm_test_cycle_dependencies; passes `query.error` through (only page that surfaces errors) |

### 3.2 Bespoke pages (the heavy, non-canonical core)

**`repository/RepositoryPage.tsx` (1,013)** — /repository. Folder tree left panel (`FolderTreeView` at :478, hooks `useFolderTree`/`useFoldersWithCounts` from `@/hooks/test-management/useFolders` :7-12) + **JiraTable** right (`JiraTable<TMTestCase>` :905). Create/rename folder modal (atlaskit ModalDialog), AI generate dialog (`AIGenerateTestCasesDialog` + `CatyIconCTA` :10-11), `CatalystDetailRouter` for case detail (:24, `entityKind='test_case'`), `CaseDrawer` for create/edit. 13 loading/spinner hits; search Textfield :852.

**`repository/CaseDrawer.tsx` (401)** — create/edit case via atlaskit ModalDialog; `useCreateTestCase`/`useUpdateTestCase`/`useCreateCaseVersion` (:8); embeds `StepEditor`.

**`repository/StepEditor.tsx` (146)** — hand-rolled step rows with raw `<textarea>` elements (:84, :88) and inline styles; no atlaskit form fields; zero loading/error handling (pure controlled component).

**`cycles/CyclesPage.tsx` (563)** — /cycles. **JiraTable** list (`JiraTable<TMCycle>` :178) + hand-rolled create-cycle modal (atlaskit ModalDialog/Textfield/TextArea/Tabs, grid-form layouts :357-384). Hooks: `useProjects`, `useReleases`, `useSprintsByProject`, `useTestCases` (test-management family) + raw supabase. 7 loading-state hits.

**`cycles/CycleDetailPage.tsx` (1,207)** — /cycles/:cycleKey. `useTestCycleByKey`, `useTestCycle`, `useCycleScope`, `useProjects`, raw supabase for team members (:54-57). **Raw `<table>` for scope list (:423)** — JiraTable rule violation. Portal Select (`portalSelectStyles`), DatePicker, inline defect modal (:760), comments (tm_comments). 24 loading-state hits, **zero error-state renders**.

**`cycles/ExecutionPage.tsx` (949)** — /cycles/:cycleKey/execute. Two-panel step runner (hand-rolled layout). Real **offline queue**: `OFFLINE_QUEUE_KEY='testhub_offline_queue'` localStorage (:18, :44-49), `useOnlineStatus` via useSyncExternalStore (:26-27), sync toast (:105). Attachments to storage bucket `testhub-attachments` (:17). Hooks: `useTestCycleByKey`, `useCycleScope`, `useTestCase`, `useProjects`, raw supabase. 8 loading hits, no error renders.

**`sets/TestSetsPage.tsx` (512)** — /sets. **Hand-rolled grid table** (`gridTemplateColumns: '48px 1fr 120px...'` :419, :438) — no JiraTable. createPortal row menus, raw supabase + useQuery/useMutation inline. Broken row navigation (§1.3.1).

**`sets/SetDetailPage.tsx` (792)** — /sets/:id. **Two raw `<table>` elements (:600, :663)** for set cases and cycle-sets. Inline supabase queries (tm_test_sets :382, tm_set_cases :397, tm_cycle_sets :411). Loading spinners; no error states.

**`defects/DefectsPage.tsx` (468)** — **ORPHANED/DEAD.** Not imported by any file (grep for `defects/DefectsPage` returns nothing outside the file + generated usage-map); the mounted /testhub/defects is the top-level canonical wrapper. Contains a hand-rolled grid table (:373). Delete candidate.

**`traceability/TraceabilityPage.tsx` (262)** — /traceability. Uses **`@atlaskit/dynamic-table`** (import :~8) — explicitly banned for work-item lists by CLAUDE.md JiraTable rule and by the module's own handover (`TESTHUB_BUILD_HANDOVER.md:338`, :400). Inline `useTraceability` useQuery over tm_requirement_links/tm_cycle_scope with a **silent `{ data: scopes }` destructure (:86, no error check)**.

### 3.3 Reports

**`reports/ReportsHubPage.tsx` (201)** — /reports/:reportSlug. Chassis: `ReportNavigator` (left, registry grouped by category) + `ReportRenderer`. Registry `src/components/testhub/reports/report-registry.ts`: **26 report ids, all `status: 'wired'`** (26× `status: 'wired'`; ids execution-overview … traceability-detail at lines 41-284). `SaveViewModal` + `useSavedReports` for saved views; `useAuth`; `Routes` builders used correctly. `@atlaskit/empty-state` for unknown slug. Feature CAT-REPORTS-HUB-20260703-001 (closed 2026-07-03).

**`reports/ReportStatusView.tsx` (135)** — shared metric ribbon + governance tables; JiraTable + Lozenge + ADS `Heading` — canonical-clean per its own header.

**`reports/lab/*` (8 files)** — ReportNavigator/ReportSkeleton/ReportFilterBar/ReportCanvas/ReportEmptyState/ReportFormulaDrawer + `reportData.ts` (pure selectors; seeded demo generator deleted in Lane B per header :5-6, now fed by `useRealTestReportData`), `reportCalculations.ts`, `reportDefinitions.ts`. All still imported by ReportsHubPage / WiredReportBody / ReportRenderer — live, not dead. `/testhub/reports-lab` route is a redirect only.

---

## 4. Component families

### 4.1 `src/components/testhub/**` — live, TestHub-owned
- `AIGenerateTestCasesDialog.tsx` (596) — used by RepositoryPage (Gemini generation via `useAIGeneration`).
- `reports/**` (~40 files): ReportRenderer, WiredReportBody, ReportExportMenu, ReportInsightCard, SaveViewModal, `bodies/` (10 report bodies), `charts/ReportChart.tsx`, `hooks/` (13 data hooks incl. `useRealTestReportData`, `useReportInsights`, `useSavedReports`), registry + export rows.
- `versioning/VersionDiffView.tsx` (214) — imported ONLY by `src/components/releases/test-case-detail/TestCaseVersionHistory.tsx` → actually a Releases-module dependency living under components/testhub.

### 4.2 `src/components/test-plans/**` — NOT TestHub
`CreateEditTestPlanDialog` + tabs/hooks. Importers: `src/pages/releases/TestPlansPage.tsx`, `ReleasesManagementSidebar.tsx`, `useTestPlansG26.ts` — **Releases module surface**, mounted under /releases, not /testhub.

### 4.3 `src/components/test-cycles/**` — mixed dead/Releases
- `AddTestCasesToCycleDialog/` (8 files) — **DEAD**: only referenced by generated `usage-map.generated.ts`.
- `assignment-table/` (12), `calendar/` (12), `notifications/` (4) — imported only by `src/components/releases/cycle-command-center/CycleTableView.tsx` → Releases cycle-command-center, not /testhub pages.

### 4.4 `src/features/test-cycles/**` — Releases-side enhanced cycles
CycleConfigPanel, CycleScopeSelector, CycleTimeline, MilestoneEditor, TesterAssignmentGrid + 4 hooks + types. Importers: `src/components/releases/test-cycles/EditTestCycleDialog.tsx`, `src/hooks/test-management/useTestCyclesEnhanced.ts`, `src/hooks/test-cycles/*`. Not mounted from /testhub pages.

### 4.5 `src/features/my-test-scope/**` — Releases-side
Dashboard + 15 components + `useMyTestScope`/`useQuickExecute`. Mounted by `src/pages/releases/MyTestScopePage.tsx` via `ReleasesManagementSidebar.tsx` — **/releases surface, not /testhub/my-work** (which is the BacklogPage adapter).

### 4.6 Detail views (canonical)
- `catalyst-detail-views/test-case/CatalystViewTestCase.tsx` (675) — reads tm_test_cases; routed via `CatalystDetailRouter` short-circuit `entityKind='test_case'` (CatalystDetailRouter.tsx:128-130, D4 2026-06-27).
- `catalyst-detail-views/test-cycle/CatalystViewTestCycle.tsx` (249) — tm_test_cycles UUID-keyed; `entityKind='test_cycle'` short-circuit (:152-154, 2026-06-28), used by timeline side panel.

---

## 5. Data hooks

Primary family `src/hooks/test-management/` (21 files, ~200KB): useTestCases (41.6K), useDefects (32K), useTestCycles (23.8K), useTestCyclesEnhanced (16.2K), useAdminConfig (13.4K), useFolders (13.3K), useTestCaseVersions, useTestSteps, useAutoVersioning, useCreateRunWithDataRows, useDataRowResults, useTestCaseExecutionHistory, useTestCaseRelease, useTestCaseTags, useProjects, useReleases, useSprintsByProject, useRepositoryData, useTestData, useAIGeneration, index.
Also: `src/hooks/testhub/` (useCommandCenter 8.8K, useReleases 6.1K), `src/hooks/useTestCycleByKey.ts`, `src/hooks/useTestHubTimeline.ts`, `src/hooks/test-cycles/` (useCycleDetails, useCycleMutations — Releases side).

Tables hit directly from pages (raw supabase in page files, grep count): tm_cycle_scope ×8, tm_test_sets ×7, tm_test_runs ×5, tm_test_cycles ×5, tm_set_cases ×4, tm_attachments ×3, profiles ×3, tm_step_results, tm_defects, tm_cycle_sets, tm_comments, tm_case_priorities, tm_test_case_versions, tm_requirement_links, tm_projects, tm_case_types. **Zero `th_*` legacy reads** in pages/components/hooks (grep clean). Note: heavy inline supabase in pages (SetDetailPage, TestSetsPage, CycleDetailPage, ExecutionPage, TraceabilityPage) rather than in the hooks layer.

---

## 6. `src/styles/testhub.css` — DEAD FILE

46.6K, 644-perm file. `grep -rn "testhub.css" src/ index.html` → **zero importers**. Class prefixes `.testhub`/`.th-*` are used by **no** page (the only `th-`/`testhub-` grep hits in pages are a storage-bucket name ExecutionPage.tsx:17 and react-query keys). Contains **30 hardcoded-color lines** (hex/rgb/hsl grep) plus non-token font-size and `--cp-*` legacy vars. Safe-delete candidate; deleting it would also ratchet the color baseline down.

---

## 7. Loading / empty / error handling summary

- Loading: every bespoke page shows `@atlaskit/spinner` on isLoading (counts: CycleDetail 24 hits, Repository 13, SetDetail 10, Defects(dead) 9, Execution 8, Traceability 8, Cycles 7, Sets 7).
- Empty: canonical wrappers inherit BacklogPage/Kanban empty states; ReportsHubPage uses `@atlaskit/empty-state`; bespoke pages mostly render dashes/empty rows.
- **Error: effectively absent.** Grep for `isError|error &&|SectionMessage` across `src/pages/testhub` returns ONE hit — TestHubDependenciesPage.tsx:50 passing `query.error` into DependenciesView. All other bespoke pages either throw inside queryFn (react-query retries silently) or use silent `{ data }` destructures (e.g. TraceabilityPage.tsx:86, CycleDetailPage.tsx:57, TestHubDependenciesPage fetchCandidates :63). The repo-wide "silent query-error sweep" (memory) did **not** cover testhub pages.

## 8. Stubs / TODOs

Grep for `TODO|FIXME|coming soon|stub` across pages → **zero real hits** (all matches are input `placeholder=` props). No "coming soon" pages remain. Nearest to a stub: DashboardPage header comment — test-specific widgets deferred ("Test-specific widgets land later by setting hideOnTest=false").

---

## 9. TESTHUB_BUILD_HANDOVER.md summary (src/pages/testhub/TESTHUB_BUILD_HANDOVER.md)

Planning-era doc (says "Status: Planning complete. Awaiting implementation start" :3 — **stale**; Phases 1-3 are now largely built). No literal "Known Issues" section; the equivalent content:

- **Why the old module was deleted** (:25-35): previous `src/modules-dormant/testhub/` read `th_*`/wrote `tm_*` (always empty), 9/14 routes were "coming soon", dashboard RPC `get_dashboard_stats` read `th_*` → always 0.
- **Hard rules**: tm_* only, never th_* (:39-41); `priority_id`/`case_type_id` are UUID FKs — `row.priority` text is a silent-undefined bug (:64-73); no program increments, sprint via `iterations` FK (:76-77); run-status auto-cascade rules (:79-85); zero-assumption rendering (:411).
- **Acceptance**: all 152 PDFs in `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests/` manually testable, data persists to tm_*, admin config drives UI (:10-21). No placeholders (:21).
- **Mandated but NOT found in current code**: `/admin/test/*` admin section (8 pages, :110-124), `tm_case_versions`-style admin custom fields UI, notifications, audit log, `src/lib/test-item-type-icons.tsx`, WORK_ITEM_TYPES test types in useTypeWorkflow — presence unverified in this pass (admin dir not inventoried) → treat as open scope, verify in a follow-up probe.
- **Contradictions with shipped code**: handover demands JiraTable everywhere (:338/:400) — violated by SetDetailPage/CycleDetailPage raw tables and TraceabilityPage DynamicTable; handover file-plan names (`SetsPage.tsx`, `my-work/MyWorkPage.tsx`, `DefectModal.tsx`, `hooks/testhub/useFolders.ts`) diverge from actual layout (hooks live in `hooks/test-management/`); handover icon spec includes hardcoded hex values (:133-138) that would violate the current ADS token law; handover says register routes in `src/components/routing/FullAppRoutes.tsx` — actual file is `src/routes/FullAppRoutes.tsx`.

---

## 10. Risk / opportunity register

| # | Type | Item | Evidence |
|---|---|---|---|
| R1 | Bug | Sets row-click navigates to unregistered `/testhub/:projectKey/sets/:id` | TestSetsPage.tsx:435 vs FullAppRoutes.tsx:679-680 |
| R2 | Contract | UUID `:id` route params (sets, filters) violate slug contract | routes.ts:124-130, FullAppRoutes.tsx:680 |
| R3 | Debt | Zero error-state rendering across all bespoke testhub pages; silent `{data}` destructures | §7; TraceabilityPage.tsx:86 |
| R4 | Ban | Hand-rolled tables: SetDetailPage :600/:663, CycleDetailPage :423, TestSetsPage :419; DynamicTable in TraceabilityPage | §3.2 |
| R5 | Dead code | `defects/DefectsPage.tsx` (468 LOC orphan), `styles/testhub.css` (46.6K, 30 hardcoded colors), `AddTestCasesToCycleDialog/` (8 files) | §3.2, §4.3, §6 |
| R6 | Confusion | 3 parallel "test" UI families: /testhub pages, Releases test-plans/test-cycles/my-test-scope, plus components/testhub/versioning consumed by Releases | §4 |
| O1 | Opportunity | Canonical-wrapper pattern (Dashboard/Board/MyWork/Defects/Filters/Timeline/Dependencies) is proven — bespoke Sets/Cycles pages could adopt same adapters | §3.1 |
| O2 | Opportunity | Reports hub fully wired (26/26) with registry + saved views — reusable chassis | §3.3 |
| O3 | Opportunity | ExecutionPage already has an offline queue + attachment upload — production hardening base exists | ExecutionPage.tsx:17-105 |
| O4 | Opportunity | Handover's admin `/admin/test/*` scope appears unbuilt — clean greenfield for prod revamp | §9 |
