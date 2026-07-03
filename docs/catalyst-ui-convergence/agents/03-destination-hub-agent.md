# Agent 03 — Destination Hub Inventory (Release Hub · Test Hub · Incident Hub · Defect Surfaces)

**Pass type:** CODE-ONLY (browser probing owned by agents 04–06)
**Date:** 2026-07-03
**Repo:** catalyst-prod-45 @ main (7437425c8)
**Feeds:** Agent 07 (component mapping), Agent 10 (consolidation)

---

## 1. Scope covered

- **Release Hub** — all routes under `/release-hub/*` (17 routed surfaces + 3 retired/redirected), incl. `src/pages/releasehub/*` and `src/pages/release-hub/*`.
- **Test Hub** — all routes under `/testhub/*` (16 routed surfaces): dashboard, my-work, board, repository (+CaseDrawer/StepEditor), cycles (+detail/execution), sets (+detail), timeline, dependencies, traceability, defects, reports, filters.
- **Incident Hub** — all routes under `/incident-hub/*` (14 routed surfaces + local components) **plus** the still-routed legacy generation under `/release/incidents/*` and `/release/incident-command-center`, `/release/committee-queue`.
- **Defect surfaces** — `/testhub/defects`, `defectsDataSource` adapter, `CreateStoryModal` isDefect branch, `CatalystViewDefect`, QA-defects dashboard widget, defect report body, and the dead `src/pages/releases/Defects*.tsx` generation.
- **Canon baseline verified:** `JiraTable` (`src/components/shared/JiraTable`), `BacklogPage.atlaskit` (8,894 lines), `KanbanPage` (`src/features/kanban-board/KanbanPage.tsx`), `ProjectAllWorkView`, canonical Filters trio, `ProjectPageHeader` (274 lines), `CatalystDetailRouter` (`src/components/catalyst-detail-views/CatalystDetailRouter.tsx` — defect L202, incident L203, test-case L134, test-cycle L158), `TimelineView`, `DependenciesView`, `ProjectDashboardPage`.

Out of scope: live DOM probing, screenshots, Storybook diffing (agents 04–06), admin surfaces.

## 2. Screenshots captured

**N/A — code pass.**

## 3. Routes inspected (code-level)

All route evidence from `src/routes/FullAppRoutes.tsx` (App.tsx is a 312-line shell; routing lives here).

| Hub | Routes (FullAppRoutes.tsx lines) |
|---|---|
| Test Hub | L669–703: `/testhub/{dashboard,my-work,board,repository,cycles,cycles/:cycleKey[/execute],timeline,dependencies,sets[/:id],traceability,defects,reports[/:reportSlug],filters[/create,/:filterId]}` + legacy report-slug redirects L693–697 |
| Incident Hub | L705–753: `/incident-hub/{dashboard,all-incidents,board,work,timeline,dependencies,filters[…],analytics,reports,committee-queue,view/:incidentKey,backlog/:key}`; `/incident-hub/kanban`→board redirect L717 |
| Release Hub | L755–793: `/release-hub/{overview,release-kanban,work,filters[…],timeline,production-events,calendar,releases-management[/:releaseSlug[/work]],changes[/:changeId],sop-templates,sign-off-queue,freeze-windows,settings,:releaseId}`; retired: compare/triage/command-center → overview (L779–781); legacy `/releasehub/*` redirects L786–795 |
| Legacy incidents (STILL ROUTED) | L910–922: `/release/incidents{,/dashboard,/analytics,/insights,/kanban,/create,/reports,/:incidentId}`, `/release/incident-command-center`, `/release/committee-queue` |
| Legacy releases (DEAD) | `/releases/*` → `/release-hub/overview` redirect (~L901); `src/pages/releases/*` referenced only by `src/utils/releaseModuleDocumentation.ts` (docs strings) |

## 4. Files inspected (primary)

**Release Hub:** `src/pages/releasehub/{CommandCenterPage,AllReleasesPage,AllChangesPage,ReleaseDetailPage,ChangeDetailPage,ReleaseBoardCanonical,ReleasesWorkCanonical,ReleasesTimelineCanonical,ReleaseFiltersListPage,ReleaseFilterPreviewPage,ReleaseFilterDetailPage,ProductionEventsPage,ReleaseCalendarPage,FreezeWindowsPage,SignOffQueuePage,SopTemplatesPage,ReleaseSettingsPage,ReleaseComparePage,TriageQueuePage}.tsx`, `src/pages/release-hub/{ReleaseDetailPage,ReleaseWorkNavigatorPage}.tsx`, `src/pages/project-hub/ReleasesPage.tsx` (shared mount, FullAppRoutes L63), `src/constants/releasehub.design.ts`.

**Test Hub:** `src/pages/testhub/{DashboardPage,MyWorkPage,BoardPage,DefectsPage,TestHubDependenciesPage,FiltersListPage,FilterPreviewPage,FilterDetailPage}.tsx`, `repository/{RepositoryPage,CaseDrawer,StepEditor}.tsx`, `cycles/{CyclesPage,CycleDetailPage,ExecutionPage}.tsx`, `sets/{TestSetsPage,SetDetailPage}.tsx`, `timeline/TestHubTimelinePage.tsx`, `traceability/TraceabilityPage.tsx`, `reports/ReportsHubPage.tsx` + `reports/lab/*`.

**Incident Hub:** `src/pages/incidenthub/*.tsx` (14 pages + `components/{NewIncidentModal,CommitteeModal,ConvertDialog,PriorityChip,SeverityChip}.tsx` + `incidentsBacklogDataSource.ts`), `src/modules/incidents/analytics/pages/{IncidentReportPage,IncidentAnalyticsPage,IncidentInsightsPage}.tsx`, `src/modules/incidents/kanban/pages/IncidentKanbanPage.tsx`, `src/pages/release/{IncidentRoomList,IncidentRoomDetail,IncidentsDashboard,CreateIncidentPage,IncidentCommandCenter,CAPCommitteeQueuePage,IncidentReportsPage,IncidentsListPage,IncidentsList,IncidentDashboardPage,IncidentViewPage}.tsx`, `src/components/ja/CreateDropdown.tsx`.

**Defects:** `src/modules/project-work-hub/adapters/defectsDataSource.ts`, `src/components/workhub/create-story/CreateStoryModal.tsx`, `src/components/catalyst-detail-views/defect/CatalystViewDefect.tsx`, `src/components/project-hub/dashboard/widgets/QADefectsWidget.tsx`, `src/components/testhub/reports/bodies/DefectSummaryBody.tsx`, `src/pages/releases/{DefectsPage,DefectDetailPage,AllReleasesPage}.tsx` (dead).

---

## 5. Inventory — RELEASE HUB

Overall: **highest canonical adoption of the three hubs.** 4 surfaces are thin canonical mounts; the list surfaces are JiraTable-based; detail pages are hand-rolled-but-ADS-tokened shells.

| Surface (route) | Page file | Table impl | Modal impl | Detail impl | Verdict |
|---|---|---|---|---|---|
| Overview `/release-hub/overview` | `releasehub/CommandCenterPage.tsx` (321L) | Hand-rolled div panels/rows (L241–314), no JiraTable | — | drill links | ⚠️ bespoke dashboard |
| Releases list `/release-hub/releases-management` | `project-hub/ReleasesPage.tsx` (shared with `/project-hub/:key/releases` — same component, FullAppRoutes L63/768/1069) | canonical | CreateReleaseModal (@atlaskit) | → ReleaseDetailPage | ✅ shared canon |
| Releases list (legacy mount) | `releasehub/AllReleasesPage.tsx` (307L) | **JiraTable** (rebuilt Phase 4a from hand-rolled `<table>`) | CreateReleaseModal | — | ✅ |
| Kanban `/release-hub/release-kanban` | `ReleaseBoardCanonical.tsx` (23L) | canonical `KanbanPage mode="release"` | canonical | card→`/release-hub/:id` | ✅ |
| Work `/release-hub/work` | `ReleasesWorkCanonical.tsx` (39L) | canonical `ProjectAllWorkView entityKind='release'` | canonical | row→`/release-hub/:id` | ✅ |
| Timeline `/release-hub/timeline` | `ReleasesTimelineCanonical.tsx` (216L) | canonical `TimelineView` | — | `CatalystDetailPanel` detailEntityKind='release' | ✅ |
| Filters trio | `ReleaseFilters{List,Preview,Detail}Page.tsx` (10–12L each) | canonical Filters pages hubType/mode='release' | canonical | canonical | ✅ |
| Changes `/release-hub/changes` | `AllChangesPage.tsx` (230L) | **JiraTable** | CreateChgModal (@atlaskit) — header comment: ADS-clean rebuild "lands in Phase 7b" | rows clickable → ChangeDetailPage | ✅ table / ⚠️ modal debt |
| Change detail `/release-hub/changes/:changeId` | `ChangeDetailPage.tsx` (246L) | — | — | hand-rolled shell: header + 9-step Tracker (L64–88) + @atlaskit Tabs; RiskPill local (L52–62, ADS tokens) | ⚠️ bespoke detail |
| Release detail `/release-hub/:releaseId` | `releasehub/ReleaseDetailPage.tsx` (314L) | — | — | hand-rolled 8-tab shell; HealthPill local (L64–73); Tracker (L75–100) | ⚠️ bespoke detail |
| Slug detail `/release-hub/releases-management/:releaseSlug` | `release-hub/ReleaseDetailPage.tsx` | — | — | ADS shell; **TODO L8: "wire canonical Description with ADF adapter"** | ⚠️ TODO stub |
| Work navigator `…/:releaseSlug/work` | `release-hub/ReleaseWorkNavigatorPage.tsx` (930L) | canonical **BacklogPage** with `hideChrome`+`customChromeBand` (L487–491) | — | canonical | ✅ hybrid; ⚠️ 3× silent `{data}` destructures L274/286/297 |
| Production events | `ProductionEventsPage.tsx` (143L) | **JiraTable** | @atlaskit/modal-dialog detail modal (L62–86) | modal | ✅; ResultBadge local L34–45 |
| Calendar | `ReleaseCalendarPage.tsx` (281L) | custom month grid (net-new surface by design) | click-peek overlay: hand-rolled fixed-position drawer **L269–270 with rgba fallbacks** | peek drawer | ⚠️ hand-rolled drawer |
| Freeze windows | `FreezeWindowsPage.tsx` (150L) | card list (low-count, intentional) | CreateFreezeWindowModal + ConfirmDeleteDialog | — | ✅ ErrorState+Retry |
| Sign-off queue | `SignOffQueuePage.tsx` (135L) | custom approval rows (not JiraTable) | @atlaskit/modal-dialog review modal | — | ✅/⚠️ |
| SOP templates | `SopTemplatesPage.tsx` (90L) | **JiraTable** | CreateSopTemplateModal | — | ✅ |
| Settings | `ReleaseSettingsPage.tsx` (101L) | read-only chips | — | — | ✅ |
| RETIRED (redirect L779–781) | `ReleaseComparePage.tsx` (raw `<table>` L88 + Tailwind colors), `TriageQueuePage.tsx` (raw `<table>` L71, `bg-white` utilities L65/70/122/143/149, rgba fallbacks) | dead | dead | dead | 🪦 delete candidates |

**Release Hub error convention:** list pages use a local `ErrorState`+Retry / `EmptyState` pair (AllChangesPage L204–209 etc.) — functional but not the shared `SectionMessage` convention. CommandCenterPage has no error state at all.

**Release Hub pills:** five near-identical local pill components (HealthPill ×2, RiskPill ×2, ResultBadge, StatusPill — all ADS-token-clean) duplicating `StatusLozenge`/`@atlaskit/lozenge` — consolidation target for Agent 07.

**Modal violation:** `ReleaseDrawer.tsx` (src/components/releases/) uses shadcn `Dialog` (L14) instead of @atlaskit/modal-dialog — the only shadcn modal left in the release stack.

---

## 6. Inventory — TEST HUB

Overall: top-level tabs are canonical thin wrappers; the test-management interior (cycles/sets detail) is where hand-rolling concentrates.

| Surface (route) | Page file | Table impl | Modal impl | Detail impl | Verdict |
|---|---|---|---|---|---|
| Dashboard | `DashboardPage.tsx` (17L) | canonical `ProjectDashboardPage mode="test"` | canonical | canonical | ✅ |
| My Work | `MyWorkPage.tsx` (60L) | canonical **BacklogPage** + `useTestCasesSource` | canonical inline create | row→`/testhub/repository?case=<id>` (CaseDrawer) | ✅/⚠️ detail bypasses CatalystViewTestCase |
| Board | `BoardPage.tsx` (18L) | canonical `KanbanPage mode="test"` | canonical | card→repository?case= | ✅ |
| Repository | `repository/RepositoryPage.tsx` (1,013L) | **JiraTable** (L905) + hand-rolled folder tree (L791–836) | folder CRUD via @atlaskit ModalDialog (L27); create case = `CaseDrawer` | view/edit = canonical **CatalystDetailRouter** (L932–941, D4 directive 2026-06-27) | ✅ mostly; ⚠️ silent `{data}` L638 |
| CaseDrawer | `repository/CaseDrawer.tsx` (401L) | — | @atlaskit ModalDialog (named "Drawer", is a modal) | create/edit test case form + StepEditor | ⚠️ competing create/detail surface vs CatalystViewTestCase; silent `{data}` L51/64 |
| Cycles | `cycles/CyclesPage.tsx` (478L) | **JiraTable** (L177) | **hand-rolled CreateCycleModal** (L252–398, @atlaskit ModalDialog chrome, 2-tab) | row→CycleDetailPage | ⚠️ create modal |
| Cycle detail | `cycles/CycleDetailPage.tsx` (1,220L) | 🚩 **raw `<table>` L424** (scope rows) | AddCasesModal (hand-rolled) | inline panels (defects/comments/evidence per row) | 🔴 raw table; silent `{data}` L58/69/1039; defect-from-run via `useCreateDefect` (L711) not CreateStoryModal |
| Execution | `cycles/ExecutionPage.tsx` (975L) | step runner (no table) | @atlaskit ModalDialog | inline step execution + offline queue | ✅ **only TestHub page with SectionMessage+Retry (L170–176)** |
| Sets | `sets/TestSetsPage.tsx` (512L) | 🚩 **hand-rolled CSS-grid row list (L415–437)**, not JiraTable | hand-rolled CreateSetModal (raw boxShadow rgba L328) | row→SetDetailPage | 🔴 custom grid table; rgba fallbacks L198/204/210/447 |
| Set detail | `sets/SetDetailPage.tsx` (791L) | 🚩 **raw `<table>` ×2 (L600, L663)** | AddCasesModal (hand-rolled L94–170) | inline | 🔴 raw tables |
| Timeline | `timeline/TestHubTimelinePage.tsx` (~100L) | canonical `TimelineView` (cycles) | — | disabled by design (flat cycles) | ✅ |
| Dependencies | `TestHubDependenciesPage.tsx` (94L) | canonical `DependenciesView` | canonical | canonical | ✅ |
| Traceability | `traceability/TraceabilityPage.tsx` (264L) | @atlaskit `DynamicTable` (L234) | — (read-only) | lozenges only | ✅ |
| Defects | `DefectsPage.tsx` (46L) | canonical **BacklogPage** + `useDefectsSource` | inline quick-create via adapter `onCreate` (title-only, hardcodes `severity:'MINOR'` — defectsDataSource.ts L182–186); global Create → CreateStoryModal isDefect branch | 🚩 **`onOpenItem: () => {}` — row click intentionally inert** (defectsDataSource.ts L148–152, "full-page tm_defects view does not exist yet (P1 slice)") while `CatalystViewDefect` exists in CatalystDetailRouter (L202) | ⚠️ detail gap |
| Reports | `reports/ReportsHubPage.tsx` (201L) + lab shell | JiraTable inside bodies (ReportStatusView, ReportCanvas) | SaveViewModal (custom, simple) | ReportNavigator selection | ✅ specialist domain |
| Filters trio | `Filters{List,Preview,Detail}Page` (10–13L) | canonical | canonical | canonical | ✅ |

**Headers:** all 16 pages use `ProjectPageHeader hubType="test"` (or inherit via canonical mount) — layout skeleton fully converged.
**Colors:** zero bare hex/Tailwind-color utilities in `src/pages/testhub`; violations are limited to rgba-in-var() fallbacks (TestSetsPage L198/204/210/328/447) — banned by the color law's "no hex/rgba fallbacks" clause.
**Lozenges:** @atlaskit/lozenge everywhere (CaseStatusPill, CycleStatusPill, SetTypePill wrappers).

---

## 7. Inventory — INCIDENT HUB

Overall: the `/incident-hub/*` generation is the **model convergence citizen** (BacklogPage/KanbanPage/AllWork/Dashboard/Timeline/Dependencies/Filters/CatalystDetailRouter all thin-mounted). Divergence lives in the create flow, two analytics pages, and the entire still-routed `/release/incidents/*` legacy generation.

| Surface (route) | Page file | Table impl | Modal impl | Detail impl | Verdict |
|---|---|---|---|---|---|
| All incidents | `IncidentListPage.tsx` (54L) | canonical **BacklogPage** + `incidentsBacklogDataSource` | 🚩 adapter `onCreate` **throws READ_ONLY_MSG** (incidentsBacklogDataSource.ts L142) | canonical | ✅ list; ⚠️ create disabled |
| Board | `IncidentBoardPage.tsx` (23L) | canonical `KanbanPage mode='incident'` | canonical | canonical | ✅ |
| Work | `IncidentWorkPage.tsx` (32L) | canonical `ProjectAllWorkView mode='incident'` | — | canonical | ✅ |
| Dashboard | `IncidentDashboardPage.tsx` (18L) | canonical `ProjectDashboardPage mode='incident'` | — | — | ✅ |
| Timeline | `IncidentTimelinePage.tsx` (381L) | canonical `TimelineView` | — | route → `/incident-hub/view/:id` | ✅ |
| Dependencies | `IncidentHubDependenciesPage.tsx` (110L) | canonical `DependenciesView` | canonical | canonical | ✅ |
| Filters trio | `IncidentFilter*` (11–12L each) | canonical | canonical | canonical | ✅ |
| Reports | `modules/incidents/analytics/pages/IncidentReportPage.tsx` (231L) | **JiraTable** + SectionMessage + Lozenge | — | — | ✅ |
| Committee queue | `CommitteeQueuePage.tsx` (33L) | `CommitteeQueueTable` shared component | drawer on select | drawer | ✅ |
| Detail | `IncidentDetailPage.tsx` (157L) | — | — | canonical **CatalystDetailRouter fullPageMode** (same pattern as `/browse/:key`) | ✅ |
| Analytics | `IncidentAnalyticsPage.tsx` (133L) | 🚩 hand-rolled stat cards + custom bar charts (L66–125) | — | — | 🔴 bespoke; rgba fallbacks L66/76/92/124/125; `--cp-*` tokens |
| Local create | `components/NewIncidentModal.tsx` (139L) | — | 🚩 **shadcn Dialog** + local SEV color map with rgba fallbacks (L26–29); writes via `useCreateIncident` → `incidents` table, NOT ph_issues/CreateStoryModal | — | 🔴 hand-rolled create canon |
| Create entry point | `src/components/ja/CreateDropdown.tsx` L22/L105 | — | global Create on `/incident-hub/*` routes → **NewIncidentModal** | — | 🚩 hub create diverges from CreateStoryModal |
| Local governance | `components/CommitteeModal.tsx` (140L), `ConvertDialog.tsx` (80L) | — | shadcn Dialog; rgba fallbacks (CommitteeModal L32/37/66/99/121; ConvertDialog L41/54/71) | — | 🔴 |
| Chips | `components/PriorityChip.tsx` (13L → canonical PriorityIndicator ✅); `components/SeverityChip.tsx` (47L — hand-rolled, **bare `rgba(248,113,113,…)` L10** + rgba fallbacks L11–12, inline isDark logic) | — | — | — | 🔴 SeverityChip |
| DEAD in dir | `incidenthub/IncidentKanbanPage.tsx` (123L, KanbanBoardShell) — imported at FullAppRoutes L135 but **never mounted** (`<IncidentHubKanbanPage` grep = 0; `/incident-hub/kanban` redirects to board); `incidenthub/IncidentInsightsPage.tsx` (101L) unrouted | — | — | — | 🪦 dead import + dead file |

### Legacy `/release/incidents/*` generation — STILL ROUTED (FullAppRoutes L910–922)

Entire parallel incident UI predating the hub, all hand-rolled, shadcn/Tailwind-era:

| Route | File | Key violations |
|---|---|---|
| `/release/incidents` | `release/IncidentRoomList.tsx` (394L) | custom shadcn table; `GlobalPageHeader` not ProjectPageHeader |
| `/release/incidents/dashboard` | `release/IncidentsDashboard.tsx` (287L) | 🚩 **HARDCODED MOCK STATS** — `value: 3`, `value: 24`, `value: 18`, `value: '4.2h'` literals (L~8–14) rendered as live KPIs → zero-assumption-data violation (renders lies) |
| `/release/incidents/analytics` | `modules/incidents/analytics/pages/IncidentAnalyticsPage.tsx` (207L) | bespoke shell |
| `/release/incidents/insights` | `modules/incidents/analytics/pages/IncidentInsightsPage.tsx` (1,367L) | massive bespoke print-styled report |
| `/release/incidents/kanban` | `modules/incidents/kanban/pages/IncidentKanbanPage.tsx` (719L) | full custom kanban competing with canonical `/incident-hub/board`; **27 Tailwind color-utility hits** in `release/IncidentCommandCenter.tsx`, 16 in `release/IncidentDashboardPage.tsx`, 13 in `release/IncidentViewPage.tsx`, 7 in `release/IncidentsList.tsx` (grep `(bg|text|border)-(red|green|blue|amber|…)-[0-9]`) |
| `/release/incidents/create` | `release/CreateIncidentPage.tsx` (658L) | full-page hand-rolled create form (shadcn Select), third incident-create path |
| `/release/incidents/:incidentId` | `release/IncidentRoomDetail.tsx` (698L) | bespoke detail (sticky header/context rail) — competes with canonical CatalystDetailRouter detail |
| `/release/incident-command-center` | `release/IncidentCommandCenter.tsx` (547L) | raw `<table>` L379 |
| `/release/committee-queue` | `release/CAPCommitteeQueuePage.tsx` (203L) | duplicate committee queue vs `/incident-hub/committee-queue` |

Unrouted in `src/pages/release`: `IncidentsListPage.tsx` (raw `<table>` L368), `IncidentsList.tsx` (raw `<table>` L292), `IncidentDashboardPage.tsx` (raw `<table>` L400), `IncidentViewPage.tsx`, `IncidentDetail.tsx` (lazy-imported L348 but no Route mounts it) — dead weight.

---

## 8. Inventory — DEFECT SURFACES

**Live canon (all converged):**
- List: `/testhub/defects` → canonical BacklogPage + `defectsDataSource.ts` (JiraTable, Lozenge appearance map, canonical-workflow status bridge via `useCanonicalIssueWorkflow('Defect')`).
- Create: (a) BacklogPage inline quick-create → `adapter.onCreate` (`defectsDataSource.ts` L180–186 — title-only, hardcoded `severity:'MINOR'`); (b) global Create → `CreateStoryModal.tsx` **isDefect branch** (`src/components/workhub/create-story/CreateStoryModal.tsx` ~L570–890: `isDefect = workType === 'QA Bug'`, defect-specific fields severity/component/environment/expected-actual ADF, submits `useCreateDefect` → `tm_defects`).
- Detail: `CatalystViewDefect` exists and is wired in `CatalystDetailRouter.tsx` L202 — **but `/testhub/defects` row click is `onOpenItem: () => {}`** (intentionally inert, P1 slice pending).
- Widget: `QADefectsWidget.tsx` (project-hub dashboard) — ResizableDynamicTable + StatusLozenge, token-clean.
- Report: `DefectSummaryBody.tsx` (`/testhub/reports/defect-summary`) — JiraTable + Lozenge, token-clean.
- Cycle-run defect logging: `CycleDetailPage.tsx` L711 `useCreateDefect` direct mutation (bypasses CreateStoryModal — third defect-create path).

**Dead generation `src/pages/releases/*` (12 files, 0 routed):** includes `DefectsPage.tsx` (657L — raw `<table>`, 8 bare Tailwind colors L615–632, hand-rolled ReportDefectModal/EditDefectModal/ReassignModal) and `DefectDetailPage.tsx` (1,052L — 18 bare Tailwind colors L52–129, hardcoded status transitions L61–120 that don't match the `tm_defect_status` enum). `AllReleasesPage.tsx` raw `<table>` L778. Delete candidates.

---

## 9. Findings count

- **Total findings: 41** (per-surface verdicts above)
- 🔴 High-risk / P0-P1: **12**
- ⚠️ Medium / P2: **17**
- 🪦 Dead-code / P3: **12** (12 `pages/releases/*` files, 5 unrouted `pages/release/Incident*` files counted as one group each, 2 dead `incidenthub` files, 2 retired releasehub pages, dead lazy imports)

## 10. High-risk findings (top 12)

| # | Finding | Evidence |
|---|---|---|
| 1 | **Incident create canon fork**: global Create on `/incident-hub/*` opens hand-rolled shadcn `NewIncidentModal` → `incidents` table, while hub lists/boards read `ph_issues` (Production Incident); backlog adapter `onCreate` throws READ_ONLY | `ja/CreateDropdown.tsx:105`, `incidenthub/components/NewIncidentModal.tsx:13,26–29`, `incidentsBacklogDataSource.ts:142` |
| 2 | **Entire legacy `/release/incidents/*` generation still routed** — 9 live routes of hand-rolled tables/kanban/detail/create competing with canonical Incident Hub | `FullAppRoutes.tsx:910–922`; files in §7 |
| 3 | **Hardcoded mock KPIs rendered as live data** on routed `/release/incidents/dashboard` | `release/IncidentsDashboard.tsx` stats array (`value: 3`, `'4.2h'`) |
| 4 | **Defect detail gap**: row click inert while CatalystViewDefect exists | `defectsDataSource.ts:148–152`, `CatalystDetailRouter.tsx:202` |
| 5 | Raw `<table>` in live TestHub surfaces | `cycles/CycleDetailPage.tsx:424`, `sets/SetDetailPage.tsx:600,663` |
| 6 | TestSetsPage hand-rolled CSS-grid table instead of JiraTable | `sets/TestSetsPage.tsx:415–437` |
| 7 | 63 Tailwind color-utility hits across routed legacy incident pages | `release/IncidentCommandCenter.tsx` (27), `IncidentDashboardPage.tsx` (16), `IncidentViewPage.tsx` (13), `IncidentsList.tsx` (7) |
| 8 | Bare `rgba()` literal (not even a fallback) in live chip | `incidenthub/components/SeverityChip.tsx:10` |
| 9 | 38 rgba-fallback color-law violations across live hub pages | grep evidence §12; NewIncidentModal L26–29, CommitteeModal L32–121, ConvertDialog L41–71, IncidentAnalyticsPage L66–125, TestSetsPage L198–447, ReleaseCalendarPage L269–270 |
| 10 | shadcn Dialog in release stack (`ReleaseDrawer`) + all three incidenthub local modals — modal canon fork vs @atlaskit/modal-dialog | `components/releases/ReleaseDrawer.tsx:14`; incidenthub components |
| 11 | Silent `{data}`-only destructures (errors render as empty UI) | `CycleDetailPage.tsx:58,69,1039`, `CaseDrawer.tsx:51,64`, `RepositoryPage.tsx:638`, `ReleaseWorkNavigatorPage.tsx:274,286,297` |
| 12 | SectionMessage+Retry convention nearly absent in destination hubs (1/16 TestHub pages — ExecutionPage L170–176; Release Hub uses local ErrorState; CommandCenterPage has none) | grep: single SectionMessage hit in `pages/testhub` |

## 11. Convergence scorecard (feeds Agent 07/10)

| Hub | Surfaces | Canonical mounts | Hand-rolled-but-token-clean | Hard divergence | Detail canon | Create canon |
|---|---|---|---|---|---|---|
| Incident Hub (new) | 14 | 11 | 1 (CommitteeQueue) | 2 (analytics, create modals) | ✅ CatalystDetailRouter | ❌ NewIncidentModal fork |
| Incident (legacy routed) | 9 | 0 | 0 | 9 | ❌ IncidentRoomDetail | ❌ CreateIncidentPage |
| Test Hub | 16 | 11 | 2 (reports, execution) | 3 (cycle detail, sets ×2) | ⚠️ split (CatalystDetailRouter in repo vs CaseDrawer elsewhere; defect detail inert) | ⚠️ split (BacklogPage inline + CreateStoryModal isDefect vs 3 hand-rolled modals) |
| Release Hub | 17 | 7 | 8 | 2 (overview panels, calendar peek) | ⚠️ bespoke 8-tab shells (ADS-clean) | ✅ mostly @atlaskit modals; 1 shadcn |
| Defects | 5 live | 5 | 0 | 0 (live) | ❌ inert row click | ✅ CreateStoryModal isDefect + inline |

## 12. Evidence references

- Route table: `src/routes/FullAppRoutes.tsx` L63–104, L134–185, L272–276, L348–358, L669–793, L910–922.
- Color-law grep (`(#hex|rgba?\(|hsla?\()` over hub page dirs): **38 hits**, all rgba-in-fallback or bare rgba; per-file list in §6–§7. Tailwind color utilities: 10 hits in releasehub (both in RETIRED pages), 63 in `pages/release/*`.
- Silent destructure grep (`const { data } =` over hub dirs): 9 hits (§10 #11).
- TODO/stub grep: 1 hit — `release-hub/ReleaseDetailPage.tsx:8` (Description ADF adapter TODO). No console.log stubs in hub pages.
- Dead-import proof: `IncidentHubKanbanPage` lazy-declared (L135) with zero `<IncidentHubKanbanPage` mounts.
- Canon detail proof: `CatalystDetailRouter.tsx` L13–40 lazy views; defect L202, incident L203, test-case L134, test-cycle L158.

## 13. Confidence level

**HIGH** for routing truth, table/modal/detail implementations, and color evidence (all grep/read-verified with file:line; four independent sub-inventories cross-checked against a direct verification pass — two sub-agent claims corrected: (a) "defect create doesn't use CreateStoryModal" is wrong for the global-Create path (isDefect branch exists and is live); (b) IncidentKanbanPage is a dead *import*, not merely a dead file).
**MEDIUM** for exact line numbers inside 900+-line legacy files (spot-checked, not exhaustively read) and for behavioral claims (dead buttons vs. wired) that only agents 04–06 can prove live.

## 14. Open questions (for agents 04–07/10)

1. Should incident creation converge on `CreateStoryModal` writing `ph_issues` (issue_type='Production Incident'), and is the `incidents` table written by NewIncidentModal even read by any live hub surface? (CRE Grid A says Production Incident → INCIDENT module.)
2. Is the legacy `/release/incidents/*` generation intentionally kept (linked from Release Ops sidebar?) or a freeze-and-delete candidate? SidebarBase.tsx references need checking (agent 07).
3. Test-case detail canon: converge MyWork/Board row-click on CatalystDetailRouter (as Repository did under D4) and retire CaseDrawer's edit mode, or keep CaseDrawer as the create-only form?
4. Defect detail (P1 slice): route `/testhub/defects/:key` → CatalystViewDefect via CatalystDetailRouter — confirm slug/key contract (no `:id` UUIDs per SLUG CONTRACT).
5. Release/Change detail 8-tab shells: acceptable bespoke (no canonical multi-tab entity-detail exists for rh_* entities) or should they adopt CatalystDetailPanel patterns?
6. Do the five Release Hub pill components consolidate into StatusLozenge variants (agent 07 mapping)?
