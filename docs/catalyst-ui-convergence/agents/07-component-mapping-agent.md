# Agent 07 — Component Mapping Agent

**Pass type:** CODE-ONLY (verification by Read/Grep against main @ 7437425c8)
**Date:** 2026-07-03
**Inputs:** Agents 01 (routes), 02 (canonical registry), 03 (destination inventory), 09 (ADS violations)
**Feeds:** Agent 10 (consolidation)

---

## Scope covered

Every non-canonical destination component across Release Hub, Test Hub, Incident Hub (including the legacy `/release/incidents` stack), and Defect surfaces (including the dead `src/pages/releases` generation), mapped to its closest Project Hub canonical replacement. Categories covered: tables/lists, boards/kanban, detail views/drawers, create/edit modals, status pills/badges/chips, avatars/user display, icons, toolbars/filters, breadcrumb/header, empty/error/loading states, dashboards/analytics panels.

Input-report claims were **not taken on faith** — 14 high-risk claims were re-verified directly against source (see "Verification pass" below), and one material claim from Agent 01 was **overturned** (legacy incident stack IS nav-referenced).

## Screenshots captured

N/A — code pass.

## Files inspected (verification pass)

| Claim (from input reports) | Verified against | Result |
|---|---|---|
| ReleaseDrawer uses shadcn Dialog | `src/components/releasehub/ReleaseDrawer.tsx:14,616-650` | ✅ confirmed — AND zero imports repo-wide → **dead code**, moves to DELETE list (Agent 03 listed it as a live modal-canon fork; it is unreferenced) |
| NewIncidentModal shadcn + rgba fallbacks | `src/pages/incidenthub/components/NewIncidentModal.tsx:8,25-30` | ✅ confirmed — `@/components/ui/dialog` + SEV_STYLES map with `rgba(239,68,68,…)` fallbacks; writes `useCreateIncident` → `incidents` table |
| Global Create on /incident-hub/* → NewIncidentModal | `src/components/ja/CreateDropdown.tsx:7,22,105` | ✅ confirmed |
| SeverityBadge hand-rolled Tailwind badge | `src/components/releases/defects/SeverityBadge.tsx:11-17` | ✅ confirmed — `bg-red-600 text-white`, lucide icons, hand-built span; consumers are DefectTableView/DefectKanbanView/DefectDetailPage only (all in the dead generation) |
| Raw `<table>` in CycleDetailPage / SetDetailPage | `CycleDetailPage.tsx:424`, `SetDetailPage.tsx:600,663` | ✅ confirmed |
| TestSetsPage CSS-grid table | `TestSetsPage.tsx` gridTemplateColumns ×7 | ✅ confirmed |
| CaseDrawer hand-rolled drawer | `src/pages/testhub/repository/CaseDrawer.tsx:172` (`role="dialog"` custom overlay; @atlaskit ModalDialog only for inner version modal L359) | ✅ confirmed |
| Defect row click inert | `src/modules/project-work-hub/adapters/defectsDataSource.ts:152` (`onOpenItem: () => {}`) | ✅ confirmed; `CatalystViewDefect` wired in `CatalystDetailRouter.tsx:202` |
| Incident backlog adapter READ_ONLY | `src/pages/incidenthub/incidentsBacklogDataSource.ts:139-143` | ✅ confirmed |
| 5 local Release pill components | `AllChangesPage.tsx:40`, `ChangeDetailPage.tsx:52` (RiskPill ×2), `AllReleasesPage.tsx:45`, `ReleaseDetailPage.tsx:64` (HealthPill ×2), `FreezeWindowsPage.tsx:38` (StatusPill), `ProductionEventsPage.tsx:34` (ResultBadge) | ✅ confirmed — actually **6** local pills |
| Hand-rolled initials avatars in Release Hub | `borderRadius:'50%'` hits: ReleaseDetailPage(1), ChangeDetailPage(1), ReleaseCalendarPage(4) + Agent 09's wider list | ✅ confirmed (spot-checked 3 of ~20 files) |
| Legacy /release/incidents stack still routed | `src/routes/FullAppRoutes.tsx:909-922` incl. broken literal `:incidentId` redirect at L919 | ✅ confirmed |
| "No nav points at legacy incident stack" (Agent 01) | `src/components/layout/OperationsSidebar.tsx:22,37`, `src/components/ja/ItemsDropdown.tsx:48`, `src/components/layout/dropdowns/ItemsDropdown.tsx:72`, `GlobalPageHeader.tsx:174-175`; OperationsSidebar lazy-mounted from `CatalystShell.tsx:138` | ❌ **OVERTURNED — legacy stack IS reachable from live nav** (OperationsSidebar + two ItemsDropdown variants). Retirement requires nav rewires, not just route deletion |
| RepositoryPage detail = CatalystDetailRouter | `RepositoryPage.tsx:46,933` | ✅ confirmed |
| `features/all-releases`, `release-compare`, `release-calendar`, `my-test-scope` consumers | grep across `src/pages`+`src/routes` | ✅ consumed ONLY by dead `src/pages/releases/{AllReleasesPage,ComparePage,CalendarPage,MyTestScopePage}.tsx` → whole feature dirs are DELETE candidates |
| CyclesPage uses JiraTable + local CreateCycleModal | `CyclesPage.tsx:22,177,252` | ✅ confirmed |

## Routes inspected

All destination routes from Agent 01's tables: `/release-hub/*` (FAR:756-794), `/testhub/*` (FAR:669-703), `/incident-hub/*` (FAR:705-753), legacy `/release/incidents*` (FAR:909-922), dead `/releases/*` redirect (FAR:~901). Canonical baseline routes per Agent 02.

---

## Canonical target vocabulary (from Agent 02)

| Canon | File |
|---|---|
| JiraTable | `src/components/shared/JiraTable/JiraTable.tsx` (+ cells/editors/flags satellites) |
| BacklogPage (data-source adapter mount) | `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` |
| KanbanPage (multi-mode board) | `src/features/kanban-board/KanbanPage.tsx` |
| ProjectAllWorkView | `src/pages/project-hub/jira-list/ProjectAllWorkView.tsx` |
| ProjectDashboardPage (multi-mode) | `src/pages/project-hub/ProjectDashboardPage.tsx` |
| TimelineView / DependenciesView | canonical timeline + dependencies mounts |
| CatalystDetailRouter / CatalystViewBase / CatalystDetailPanel | `src/components/catalyst-detail-views/…`, `src/components/shared/CatalystDetailPanel.tsx` |
| CreateStoryModal | `src/components/workhub/create-story/CreateStoryModal.tsx` |
| StatusLozenge (+Dropdown) | `src/components/shared/StatusLozenge/StatusLozenge.tsx` |
| CatalystAvatar | `src/components/shared/CatalystAvatar.tsx` |
| JiraIssueTypeIcon / PriorityIcon / ProjectIcon | `src/components/shared/…`, `src/components/icons/…` |
| ProjectPageHeader | `src/components/layout/ProjectPageHeader.tsx` |
| CatalystListPageLayout (+Toolbar/BulkActionBar) | `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx` |
| SectionMessage + Retry / @atlaskit/empty-state / Spinner | `src/components/ads/SectionMessage.tsx`, Agent 02 §8 |
| SprintCreateModal / ReleaseCreateModal pattern | `SprintsPage.tsx:391-448`, `ReleasesPage.tsx:460-527` |
| @atlaskit/modal-dialog + ModalTransition | modal canon |

---

## MAPPING TABLES

Confidence: **High** = canonical replacement exists with the needed API today; **Med** = canonical fits but needs a mode/adapter/variant added; **Low** = no exact canonical exists, nearest pattern named.

### A. RELEASE HUB (18 mappings)

| # | Destination component | Destination file | Canonical replacement | Canonical file | Conf | Why right replacement | Must preserve | Must change |
|---|---|---|---|---|---|---|---|---|
| A1 | RiskPill (list) | `src/pages/releasehub/AllChangesPage.tsx:40` | StatusLozenge (or @atlaskit/lozenge appearance map) | `src/components/shared/StatusLozenge/StatusLozenge.tsx` | High | CAT-ADS-STATUSPILL-UNIFY made StatusLozenge THE pill; risk levels map to appearances (high→danger/removed, medium→warning/moved, low→success) | risk-level → color semantics | delete local component; component owns color |
| A2 | RiskPill (detail) | `src/pages/releasehub/ChangeDetailPage.tsx:52` | same as A1 (shared risk→appearance util) | same | High | duplicate of A1 — one mapping, two deletions | same | same; extract ONE `riskToAppearance()` helper, not two |
| A3 | HealthPill (list) | `src/pages/releasehub/AllReleasesPage.tsx:45` | ProjectHealthBadge or StatusLozenge | `src/components/projecthub/ProjectHealthBadge.tsx` | High | health (on-track/at-risk/off-track) is exactly ProjectHealthBadge's domain | health vocabulary | delete local pill |
| A4 | HealthPill (detail) | `src/pages/releasehub/ReleaseDetailPage.tsx:64` | same as A3 | same | High | duplicate | same | same |
| A5 | StatusPill | `src/pages/releasehub/FreezeWindowsPage.tsx:38` | StatusLozenge | StatusLozenge.tsx | High | freeze-window status (active/scheduled/expired) fits statusToAppearance | status vocabulary | delete local pill |
| A6 | ResultBadge | `src/pages/releasehub/ProductionEventsPage.tsx:34` | @atlaskit/lozenge (success/removed/inprogress) | `@atlaskit/lozenge` | High | binary-ish result (success/failed/rolled-back) is Lozenge's native use | result semantics | delete local badge |
| A7 | Hand-rolled initials avatars (~8 RH files) | `ReleaseDetailPage.tsx`, `ChangeDetailPage.tsx`, `ReleaseCalendarPage.tsx` (×4), `SopTemplatesPage.tsx`, `ProductionEventsPage.tsx`, `AllReleasesPage.tsx`, `FreezeWindowsPage.tsx`, `AllChangesPage.tsx`, `CommandCenterPage.tsx` | CatalystAvatar | `src/components/shared/CatalystAvatar.tsx` | High | icon contract: face avatar + name tooltip everywhere users are listed; CatalystAvatar has deterministic initials fallback already | initials fallback when no photo | replace every `borderRadius:'50%'`+`charAt(0)` circle |
| A8 | CommandCenterPage bespoke dashboard (stat panels + hand-rolled rows L241-314, no error state) | `src/pages/releasehub/CommandCenterPage.tsx` | ProjectDashboardPage mode='release' (widget grid) | `src/pages/project-hub/ProjectDashboardPage.tsx` | Med | Test Hub (`DashboardPage.tsx`, 17L) and Incident Hub (`IncidentDashboardPage.tsx`, 18L) already prove the thin-mount pattern; release needs a `mode='release'` + release widget set | drill-through links to releases/changes | add release mode + widgets; add SectionMessage error state (today: none) |
| A9 | Bespoke 8-tab release detail | `src/pages/releasehub/ReleaseDetailPage.tsx` (mounted at `/release-hub/:releaseId`) | Consolidate onto slug detail (`pages/release-hub/ReleaseDetailPage.tsx`) + CatalystViewBase section patterns | `src/pages/release-hub/ReleaseDetailPage.tsx`, `catalyst-detail-views/shared/CatalystViewBase.tsx` | Med | Agent 01 flagged the duplicate detail surface; slug route is the SLUG-CONTRACT-compliant one; CatalystViewBase gives top-bar/breadcrumb/sections canon | 8-tab content (scope, gates, sign-offs…) until parity proven | retire `/release-hub/:releaseId` (redirect to slug), fold HealthPill/Tracker into canon components |
| A10 | 9-step Tracker (hand-rolled stepper) | `ChangeDetailPage.tsx:64-88`, `releasehub/ReleaseDetailPage.tsx:75-100` | @atlaskit progress-tracker | `@atlaskit/progress-tracker` | Med | ADS primitive exists for exactly this; no Catalyst wrapper yet (ADS hierarchy step 4) | step semantics + current-step logic | replace two hand-rolled steppers with one shared wrapper |
| A11 | ChangeDetailPage bespoke shell | `src/pages/releasehub/ChangeDetailPage.tsx` | ProjectPageHeader + CatalystViewBase-style sections (keep @atlaskit Tabs — unbanned) | ProjectPageHeader.tsx, CatalystViewBase.tsx | Low | no canonical rh_change detail exists; nearest canon is the detail-view shell grammar | tracker steps, tabs, risk data | adopt ProjectPageHeader breadcrumb canon; A2 pill swap; SectionMessage errors |
| A12 | Calendar click-peek drawer (hand-rolled fixed-position, rgba fallbacks L269-270) | `src/pages/releasehub/ReleaseCalendarPage.tsx:269-270` | CatalystDetailPanel (entityKind='release') — same panel ReleasesTimelineCanonical already uses | `src/components/shared/CatalystDetailPanel.tsx` | High | the sibling timeline surface already peeks releases via CatalystDetailPanel; calendar should match | peek-on-click interaction | delete hand-rolled drawer + rgba fallbacks |
| A13 | SignOffQueuePage custom approval rows | `src/pages/releasehub/SignOffQueuePage.tsx` | JiraTable (columns: item, requester CatalystAvatar, status StatusLozenge, actions) | JiraTable.tsx | Med | JiraTable-mandatory rule for enterprise admin lists; review modal already @atlaskit | approve/reject review modal flow | rows → JiraTable columns |
| A14 | CreateChgModal (@atlaskit but flagged "ADS-clean rebuild lands in Phase 7b") | `src/pages/releasehub/AllChangesPage.tsx` | keep @atlaskit/modal-dialog; align field grammar with CreateStoryModal (form + select + ADF description) | `src/components/workhub/create-story/CreateStoryModal.tsx` | Med | already on modal canon; the debt is form internals | change-record fields | Phase 7b rebuild per its own header comment |
| A15 | Local ErrorState/EmptyState pair (RH list pages) | `AllChangesPage.tsx:204-209` + siblings | SectionMessage appearance="error" + Retry; @atlaskit/empty-state | `src/components/ads/SectionMessage.tsx` | High | canonical error/empty grammar (Agent 02 §8); prevents silent-error class | retry behavior | swap local components; sweep 3 silent `{data}` destructures in `ReleaseWorkNavigatorPage.tsx:274,286,297` |
| A16 | RH parallel style constant system (`RH.fontBody`, `RH.ink1`, `--cp-*`) | `src/pages/releasehub/*` (e.g. `ReleaseCalendarPage.tsx:95,235,242`) | ADS tokens directly (`var(--ds-*)` / `token()`) | design-system layer | High | CLAUDE.md color law; RH object is a banned parallel mini design system | nothing — visual parity via tokens | replace RH.* constant lookups with tokens |
| A17 | Slug detail Description stub | `src/pages/release-hub/ReleaseDetailPage.tsx:8` (TODO) | canonical Description section w/ ADF adapter from CatalystView* sections | `catalyst-detail-views/shared/sections/…` | High | TODO in the file names exactly this target | — | wire ADF description |
| A18 | Release Hub Filters nav gap | `ReleaseHubSidebar.tsx` (no Filters entry; pages exist) | add sidebar item pointing at existing canonical `ReleaseFiltersListPage` | `src/components/layout/ReleaseHubSidebar.tsx` | High | canonical trio already mounted (FAR:762-764) — this is wiring, not building | existing filter pages | one sidebar entry |

### B. TEST HUB (15 mappings)

| # | Destination component | Destination file | Canonical replacement | Canonical file | Conf | Why right replacement | Must preserve | Must change |
|---|---|---|---|---|---|---|---|---|
| B1 | Raw `<table>` scope rows | `src/pages/testhub/cycles/CycleDetailPage.tsx:424` | JiraTable | `src/components/shared/JiraTable/JiraTable.tsx` | High | JiraTable rule — work-item-shaped rows (case, status, assignee, run result); inline panels map to `expandedRowIds`/`getRowHasChildren` | per-row defects/comments/evidence panels; execute affordance | table → JiraTable columns + row expansion |
| B2 | Raw `<table>` ×2 (cases in set) | `src/pages/testhub/sets/SetDetailPage.tsx:600,663` | JiraTable | same | High | same rule | add/remove-case actions | tables → JiraTable; ALSO fix stale status filter at `:433` (`draft/in_progress/paused` invalid post-P1-S5 — use `src/lib/testhub/enums.ts`) |
| B3 | Hand-rolled CSS-grid row list | `src/pages/testhub/sets/TestSetsPage.tsx:415-437` | JiraTable inside CatalystListPageLayout | JiraTable.tsx + `CatalystListPage/CatalystListPageLayout.tsx` | High | sibling CyclesPage already uses JiraTable (L177) — sets list is the same shape | row→SetDetailPage navigation | grid rows → JiraTable; kill rgba fallbacks L198/204/210/447 |
| B4 | CreateSetModal (hand-rolled, raw boxShadow rgba L328) | `TestSetsPage.tsx` | @atlaskit/modal-dialog form per SprintCreateModal pattern | `SprintsPage.tsx:391-448` pattern | High | sets≈sprints as named containers; SprintCreateModal is the list-entity create canon | set fields (name/type/description) | rebuild on modal canon |
| B5 | CreateCycleModal (local, 2-tab, @atlaskit chrome) | `src/pages/testhub/cycles/CyclesPage.tsx:252-398` | keep @atlaskit chrome; converge form grammar on SprintCreateModal pattern | same pattern | Med | already on ModalDialog; divergence is form internals & duplication risk | 2-tab create flow if UX-approved | extract from page file; shared field grammar |
| B6 | AddCasesModal (hand-rolled picker, duplicated) | `CycleDetailPage.tsx` + `SetDetailPage.tsx:94-170` | ONE shared @atlaskit/modal-dialog + JiraTable-based case picker (selectable rows) | JiraTable selection API (`selectable`, `onSelectionChange`) | Med | two hand-rolled copies of the same picker; JiraTable's checkbox+shift-range selection is built for this | search + multi-select add | dedupe into one component |
| B7 | CaseDrawer (edit/view mode) | `src/pages/testhub/repository/CaseDrawer.tsx:172` (role="dialog" custom overlay) | CatalystViewTestCase via CatalystDetailRouter | `CatalystDetailRouter.tsx:134`, `test-case/CatalystViewTestCase.tsx` | High | RepositoryPage row-click ALREADY mounts CatalystDetailRouter (D4, `RepositoryPage.tsx:933`) — CaseDrawer's view/edit mode is the competing legacy path | StepEditor step-editing capability (verify parity inside CatalystViewTestCase first) | retire edit mode; decide create-only fate (see B8) |
| B8 | CaseDrawer (create mode) | same file | CreateStoryModal-style canonical create OR keep as @atlaskit ModalDialog create-only form | `CreateStoryModal.tsx` grammar | Med | test-case create needs steps editor which CreateStoryModal lacks; nearest canon is modal-dialog + form; open question for Vikram | StepEditor create flow | fix hand-rolled overlay → real ModalDialog/@atlaskit drawer; fix silent `{data}` L51/64 |
| B9 | MyWork/Board row-click → `repository?case=` (CaseDrawer bypass) | `MyWorkPage.tsx:9` comment, `BoardPage.tsx` card click | CatalystDetailRouter (panel or modal) same as Repository D4 | CatalystDetailRouter.tsx | High | detail canon should not depend on which tab you started from | navigation context | point row/card click at CatalystDetailRouter |
| B10 | Inert defect row click | `src/modules/project-work-hub/adapters/defectsDataSource.ts:152` | CatalystDetailPanel/CatalystDetailRouter with CatalystViewDefect (already wired at router L202) | `CatalystDetailRouter.tsx:202` | High | view exists; adapter stub is the only gap (P1 slice); BacklogPage already knows how to open panels | quick-create + list behavior | implement `onOpenItem`; new route must use display key not UUID (slug contract) |
| B11 | Defect-from-run direct mutation | `CycleDetailPage.tsx:711` (`useCreateDefect` raw) | CreateStoryModal isDefect branch (defaultWorkType 'QA Bug') | `CreateStoryModal.tsx` (~L570-890 isDefect) | Med | third defect-create path; canon per memory defect-creation-canonical-qabug; needs cycle-run context prefill support | link defect→run/cycle context | open CreateStoryModal prefilled instead of silent insert |
| B12 | TraceabilityPage @atlaskit DynamicTable | `src/pages/testhub/traceability/TraceabilityPage.tsx:234` | JiraTable | JiraTable.tsx | Med | @atlaskit/dynamic-table was retired from canon Apr 2026 (Agent 02 §2); read-only matrix still fits JiraTable columns | matrix/read-only semantics | swap table engine (low urgency — token-clean today) |
| B13 | Coverage-status Tailwind color map in hook | `src/hooks/test-cases/useRequirementLinks.ts:216-218` | return status keys; render StatusLozenge/@atlaskit lozenge at call site | StatusLozenge.tsx | High | hooks must not own colors; component-owns-color rule | coverage statuses | strip color map from hook |
| B14 | Hand-rolled folder tree | `RepositoryPage.tsx:791-836` | keep (no Catalyst canonical tree) — nearest ADS primitive `@atlaskit/tree` if rebuilt | — | Low | no canonical tree exists in Project Hub; hand-roll is currently tolerated | drag/organize + counts | only ADS-token hygiene; fix silent `{data}` L638 |
| B15 | Error-state convention gap (1/16 pages have SectionMessage) | all `src/pages/testhub/*` except `ExecutionPage.tsx:170-176` | SectionMessage + Retry (+ isPending spinner) | `src/components/ads/SectionMessage.tsx` | High | silent-query-error sweep pattern; ExecutionPage is the in-hub reference | — | sweep `{data}`-only destructures: `CycleDetailPage.tsx:58,69,1039`, `CaseDrawer.tsx:51,64`, `RepositoryPage.tsx:638` |

### C. INCIDENT HUB — new generation (9 mappings)

| # | Destination component | Destination file | Canonical replacement | Canonical file | Conf | Why right replacement | Must preserve | Must change |
|---|---|---|---|---|---|---|---|---|
| C1 | NewIncidentModal (shadcn Dialog, SEV rgba map, writes `incidents` table) | `src/pages/incidenthub/components/NewIncidentModal.tsx` | CreateStoryModal (defaultWorkType 'Production Incident' → ph_issues) | `CreateStoryModal.tsx` | High | hub lists/boards READ ph_issues while this modal WRITES `incidents` — split-brain; CreateStoryModal already parameterizes work type (QA Bug precedent) and CRE Grid maps Production Incident → INCIDENT module | severity capture (add severity field to incident branch), post-create navigate to `/incident-hub/view/:key` | swap CreateDropdown wiring (`ja/CreateDropdown.tsx:105`); delete shadcn modal; confirm whether `incidents` table has any live readers before dropping the write path |
| C2 | Create disabled in backlog adapter | `src/pages/incidenthub/incidentsBacklogDataSource.ts:142` (throws READ_ONLY) | wire `onCreate` to the C1 canonical path (or inline quick-create writing ph_issues) | defectsDataSource.ts pattern | Med | defects adapter shows the working quick-create shape | read-only guards on update/delete if intentional | enable create once C1 lands |
| C3 | CommitteeModal (shadcn Dialog, rgba fallbacks) | `src/pages/incidenthub/components/CommitteeModal.tsx:32-121` | @atlaskit/modal-dialog + ModalTransition | modal canon | High | modal canon; content is a simple form | committee routing semantics | rebuild chrome; strip rgba |
| C4 | ConvertDialog (shadcn Dialog, rgba fallbacks) | `src/pages/incidenthub/components/ConvertDialog.tsx:41-71` | @atlaskit/modal-dialog (DangerConfirmModal if destructive) | modal canon / `shared/DangerConfirmModal.tsx` | High | same | convert semantics | rebuild chrome |
| C5 | SeverityChip (hand-rolled, bare `rgba(248,113,113,…)` L10, inline isDark) | `src/pages/incidenthub/components/SeverityChip.tsx` | StatusLozenge with severity→appearance map (SEV1 danger-bold … SEV4 neutral) or @atlaskit/lozenge | StatusLozenge.tsx | High | pill canon; statusPalette gives dark-aware tokens for free — deletes the inline isDark logic | SEV1-4 vocabulary | delete chip; share ONE severityToAppearance util with C1's modal |
| C6 | IncidentAnalyticsPage bespoke stat cards + custom bar charts (rgba, `--cp-*`) | `src/pages/incidenthub/IncidentAnalyticsPage.tsx:66-125` | ProjectDashboardPage widget canon (mode='incident' widgets, e.g. ProductionIncidentsWidget family) | `src/components/project-hub/dashboard/widgets/…` | Med | dashboard widget grid is the analytics canon; incident dashboard mode already exists | MTTR/severity breakdown metrics | rebuild panels as widgets OR fold into `/incident-hub/dashboard`; tokens only |
| C7 | PriorityChip | `src/pages/incidenthub/components/PriorityChip.tsx` | — already canonical (delegates to PriorityIndicator) | — | High | Agent 03 verdict ✅ | — | nothing (ALREADY CANONICAL) |
| C8 | Dead: IncidentKanbanPage (imported FAR:135, never mounted) | `src/pages/incidenthub/IncidentKanbanPage.tsx` | none — IncidentBoardPage is live canon | — | High | dead import; `/incident-hub/kanban` already redirects to board | — | DELETE file + FAR lazy import |
| C9 | Dead: IncidentInsightsPage (unrouted) | `src/pages/incidenthub/IncidentInsightsPage.tsx` | none | — | High | unrouted | — | DELETE |

### D. LEGACY `/release/incidents` STACK (11 mappings — replace = retire route → canonical mount + redirect)

Every row: **Must preserve** = nothing UI-wise (canonical surface already exists); preserve only any data-read not covered by the hub. **Must change** = delete page, add redirect, rewire nav (see D11).

| # | Legacy surface (route) | Legacy file | Canonical replacement (live today) | Canonical file | Conf |
|---|---|---|---|---|---|
| D1 | Incident list `/release/incidents` | `src/pages/release/IncidentRoomList.tsx` (394L, shadcn table) | IncidentListPage (BacklogPage + adapter) | `src/pages/incidenthub/IncidentListPage.tsx` | High |
| D2 | Dashboard `/release/incidents/dashboard` — **renders hardcoded mock KPIs (`value: 3`, `'4.2h'`) as live data** | `src/pages/release/IncidentsDashboard.tsx` | IncidentDashboardPage | `src/pages/incidenthub/IncidentDashboardPage.tsx` | High — **P0: zero-assumption violation live** |
| D3 | Analytics `/release/incidents/analytics` | `src/modules/incidents/analytics/pages/IncidentAnalyticsPage.tsx` | `/incident-hub/analytics` | `src/pages/incidenthub/IncidentAnalyticsPage.tsx` (itself C6 target) | High |
| D4 | Insights `/release/incidents/insights` | `modules/incidents/analytics/pages/IncidentInsightsPage.tsx` (1,367L print report) | `/incident-hub/reports` (IncidentReportPage) | `src/modules/incidents/analytics/pages/IncidentReportPage.tsx` | Med — verify no unique print/report content before retiring |
| D5 | Kanban `/release/incidents/kanban` | `modules/incidents/kanban/pages/IncidentKanbanPage.tsx` (719L custom board) | IncidentBoardPage (KanbanPage mode='incident') | `src/pages/incidenthub/IncidentBoardPage.tsx` | High |
| D6 | Create `/release/incidents/create` (658L full-page form, shadcn) | `src/pages/release/CreateIncidentPage.tsx` | CreateStoryModal Production-Incident path (C1) | `CreateStoryModal.tsx` | High (after C1) |
| D7 | Reports `/release/incidents/reports` | `src/pages/release/IncidentReportsPage.tsx` | `/incident-hub/reports` | IncidentReportPage.tsx | High |
| D8 | Detail `/release/incidents/:incidentId` (UUID param) | `src/pages/release/IncidentRoomDetail.tsx` (698L bespoke) | IncidentDetailPage (CatalystDetailRouter fullPageMode, display key) | `src/pages/incidenthub/IncidentDetailPage.tsx` | High — needs UUID→key redirect shim |
| D9 | Command center `/release/incident-command-center` (raw `<table>` L379, 27 Tailwind color hits) | `src/pages/release/IncidentCommandCenter.tsx` | `/incident-hub/dashboard` (+ board) | IncidentDashboardPage.tsx | Med — audit for unique command-center widgets first |
| D10 | Committee queue `/release/committee-queue` | `src/pages/release/CAPCommitteeQueuePage.tsx` | CommitteeQueuePage | `src/pages/incidenthub/CommitteeQueuePage.tsx` (revived 2026-07-03) | High |
| D11 | **Nav rewires (blocking for D1-D10)** | `src/components/layout/OperationsSidebar.tsx:22,37` (mounted via `CatalystShell.tsx:138`), `src/components/ja/ItemsDropdown.tsx:48`, `src/components/layout/dropdowns/ItemsDropdown.tsx:72`, `src/components/layout/GlobalPageHeader.tsx:174-175` | point at `/incident-hub/*` builders from `src/lib/routes.ts` | routes.ts incidentHub builders | High — **Agent 01's "no nav references" is wrong; these are live entry points** |

Also fix while here: broken literal-param redirect `FullAppRoutes.tsx:919` (`Navigate to="/release/incidents/:incidentId"`).

### E. DEFECT SURFACES (4 mappings)

| # | Destination component | Destination file | Canonical replacement | Canonical file | Conf | Why | Must preserve | Must change |
|---|---|---|---|---|---|---|---|---|
| E1 | SeverityBadge (Tailwind pill + lucide icons) | `src/components/releases/defects/SeverityBadge.tsx` | @atlaskit/lozenge severity→appearance (blocker=removed-bold, critical=removed, major=moved, minor=default, trivial=subtle) | `@atlaskit/lozenge` | High | hand-rolled badge ban; only live severity display needed is `/testhub/defects` columns (adapter already Lozenge-based) | severity vocabulary matching `tm_defects` | consumers are all dead-gen files → in practice DELETE with them (see DELETE list); build the Lozenge map fresh where defect detail (B10) needs it |
| E2 | Defect list/kanban/modals (dead gen) | `src/components/releases/defects/{DefectTableView,DefectKanbanView,ReportDefectModal,EditDefectModal,ReassignModal,PriorityBadge,InlineTextEdit}.tsx` | already replaced by `/testhub/defects` = BacklogPage + defectsDataSource + CreateStoryModal isDefect | `src/pages/testhub/DefectsPage.tsx`, `defectsDataSource.ts` | High | live canon shipped; these are only consumed by unrouted `pages/releases/DefectsPage.tsx` | nothing | DELETE (no map needed) |
| E3 | Quick-create hardcodes `severity:'MINOR'` | `defectsDataSource.ts:180-186` | CreateStoryModal isDefect for full create; quick-create should leave severity unset (zero-assumption) or expose picker | CreateStoryModal.tsx | Med | zero-assumption rule: 'MINOR' is a domain default that can be factually wrong | title-only fast path | stop defaulting severity silently |
| E4 | QADefectsWidget / DefectSummaryBody | `src/components/project-hub/dashboard/widgets/QADefectsWidget.tsx`, `src/components/testhub/reports/bodies/DefectSummaryBody.tsx` | — already canonical (StatusLozenge/JiraTable, token-clean) | — | High | Agent 03 verified | — | nothing (ALREADY CANONICAL) |

---

## DELETE — not map (dead/legacy, no replacement work needed beyond redirects/nav rewires)

**Dead now (zero routes / zero imports) — safe deletes:**

1. `src/pages/releases/*` — entire 12-file generation (only redirect `/releases/* → /release-hub/overview` FAR:~901; only other reference is doc strings in `src/utils/releaseModuleDocumentation.ts`). Includes DefectsPage (657L), DefectDetailPage (1,052L, 130 violation hits — Agent 09's #1 worst file), AllReleasesPage (88.6K), CoverageReportsPage, QualityGatesPage, CommandCenter(+Page), CalendarPage, ComparePage, ExecutionPage, MyTestScopePage, ReleaseDashboardPage.
2. `src/features/all-releases/`, `src/features/release-compare/`, `src/features/release-calendar/`, `src/features/my-test-scope/` — consumed ONLY by the dead `pages/releases` pages above (verified by grep). Removes 6 of Agent 09's top-20 worst files (ReleaseCard 47, EnterpriseTableView 46, TimelineView 23, ComparisonTable 19, ReleaseBar 15, StatStrip 14, CalendarGrid 12, TestsTable raw table).
3. `src/components/releases/defects/*` (8 files incl. SeverityBadge, ReportDefectModal 41K, DefectKanbanView, EditDefectModal, ReassignModal) — only live-ish consumer is dead `pages/releases/DefectsPage.tsx`.
4. `src/components/releasehub/ReleaseDrawer.tsx` — shadcn Dialog + raw `<table>` L515; **zero imports repo-wide** (verified).
5. `src/pages/releasehub/ReleaseComparePage.tsx`, `TriageQueuePage.tsx` — routes retired to redirects (FAR:779-781); raw tables + Tailwind colors.
6. `src/pages/incidenthub/IncidentKanbanPage.tsx` (dead lazy import FAR:135, never mounted) + `src/pages/incidenthub/IncidentInsightsPage.tsx` (unrouted).
7. Unrouted `src/pages/release/{IncidentsListPage,IncidentsList,IncidentDashboardPage,IncidentViewPage,IncidentDetail}.tsx` (IncidentDetail lazy-imported FAR:~348 but no Route mounts it).
8. Dead FilterDetailPage lazy imports ×5 (FAR:59,100,140,172,244) + `src/routes/BoardUuidRedirect.tsx` if the UUID-redirect decision stays "not mounted" (or mount it — Vikram call; out of this agent's scope).
9. Finder-copy artifacts: `TeamMemberHoverCard 2.tsx`, `widget-types 2.ts`, `mapper 2.ts`, `mapper.test 2.ts`.

**Retire after D11 nav rewires + redirects (currently REACHABLE — not yet safe to hard-delete):**

10. Routed legacy incident stack: `src/pages/release/{IncidentRoomList,IncidentsDashboard,CreateIncidentPage,IncidentRoomDetail,IncidentCommandCenter,CAPCommitteeQueuePage,IncidentReportsPage}.tsx`, `src/modules/incidents/analytics/pages/{IncidentAnalyticsPage,IncidentInsightsPage}.tsx`, `src/modules/incidents/kanban/` (719L board + components incl. `KanbanCard.tsx:197` bare hex). Order: rewire OperationsSidebar/ItemsDropdown×2/GlobalPageHeader → replace routes with redirects to `/incident-hub/*` → delete files. Deleting D2's mock-KPI dashboard is the single highest-integrity win in the whole exercise.

## ALREADY CANONICAL — no mapping work

| Hub | Surfaces (verdicts cross-checked with Agent 03 + spot verification) |
|---|---|
| Release Hub | ReleaseBoardCanonical (KanbanPage mode='release'), ReleasesWorkCanonical (ProjectAllWorkView), ReleasesTimelineCanonical (TimelineView + CatalystDetailPanel), releases-management list (shared canonical ReleasesPage), ReleaseWorkNavigatorPage (BacklogPage hybrid — modulo A15 silent destructures), Filters trio pages, AllChangesPage table (JiraTable), ProductionEventsPage table (JiraTable), SopTemplatesPage (JiraTable), AllReleasesPage table (JiraTable, Phase 4a rebuild), FreezeWindowsPage card list (intentional low-count) + ErrorState-with-Retry behavior, ReleaseSettingsPage |
| Test Hub | DashboardPage (ProjectDashboardPage mode='test'), MyWorkPage list (BacklogPage — detail-open excepted, B9), BoardPage (KanbanPage mode='test'), RepositoryPage table + CatalystDetailRouter detail (D4), CyclesPage table (JiraTable), TestHubTimelinePage (TimelineView), TestHubDependenciesPage (DependenciesView), DefectsPage list (BacklogPage — detail excepted, B10), ReportsHubPage (registry + JiraTable bodies), ExecutionPage (SectionMessage reference implementation), Filters trio |
| Incident Hub | IncidentListPage, IncidentBoardPage, IncidentWorkPage, IncidentDashboardPage, IncidentTimelinePage, IncidentHubDependenciesPage, Filters trio, IncidentReportPage (JiraTable+SectionMessage+Lozenge), CommitteeQueuePage (shared CommitteeQueueTable), IncidentDetailPage (CatalystDetailRouter fullPageMode), PriorityChip (PriorityIndicator delegate) |
| Defects | `/testhub/defects` list, CreateStoryModal isDefect create, QADefectsWidget, DefectSummaryBody, CatalystViewDefect (wired in router, awaiting B10 hookup) |

---

## Findings count

- **57 mapping rows total**: Release Hub 18, Test Hub 15, Incident Hub (new) 9, Legacy incident stack 11, Defects 4.
- **DELETE list**: 10 groups ≈ 45+ files (12 pages/releases + 4 feature dirs + 8 defect components + ReleaseDrawer + 2 retired RH pages + 2 dead incidenthub pages + 5 unrouted pages/release files + 5 dead imports + 4 " 2" artifacts + 10-file routed legacy stack post-rewire).
- **ALREADY CANONICAL**: 38 surfaces across 4 hubs.
- **1 input-report claim overturned** (legacy incident stack nav reachability).

## High-risk findings

1. **Legacy incident stack is nav-reachable** — `OperationsSidebar.tsx:22,37` (lazy-mounted by CatalystShell:138) and both ItemsDropdown variants link to `/release/incidents*`. Agent 01 called it "no nav points at them"; wrong. Retirement plan MUST include D11 nav rewires or users land on the mock-KPI dashboard (D2).
2. **Mock KPIs live** (`IncidentsDashboard.tsx` hardcoded `value: 3 / 24 / 18 / '4.2h'`) on a reachable route — worst zero-assumption violation in scope; D2 is the top-priority retirement.
3. **Incident create split-brain** (C1): reads ph_issues, writes `incidents` — created incidents may not appear in the hub's own lists. Mapping to CreateStoryModal is also a data-model decision; needs Vikram sign-off + check for `incidents`-table readers.
4. **CaseDrawer double role** (B7/B8): view/edit path competes with the already-shipped CatalystDetailRouter mount on the SAME page; retire edit mode first, create mode needs a StepEditor-parity check before the modal decision.
5. **SetDetailPage.tsx:433 stale enum filter** rides along with the B2 table rebuild — potential live 400 (Agent 09 finding, re-flagged here because the rebuild touches that file).
6. **ReleaseDrawer misclassified by Agent 03** as the release stack's live shadcn modal — it is unimported dead code; the actual live shadcn modals are the three incidenthub components (C1/C3/C4).
7. **Dead-gen gravity**: 7 of Agent 09's top-20 worst violation files sit in code that is deletable without any mapping work (pages/releases + features dirs). Deleting before converging shrinks the ADS baseline dramatically for free.

## Evidence references

- Verification table above (14 spot-checks with file:line).
- Route truth: `src/routes/FullAppRoutes.tsx:669-794, 909-922, 1030-1077`; `src/App.tsx:247-292`.
- Nav truth: `OperationsSidebar.tsx:22,37`, `CatalystShell.tsx:138`, `ja/ItemsDropdown.tsx:48`, `layout/dropdowns/ItemsDropdown.tsx:72`, `GlobalPageHeader.tsx:174-175`.
- Canon registry: Agent 02 §§1-10; adapters: `defectsDataSource.ts`, `incidentsBacklogDataSource.ts` (read).
- Consumer greps: ReleaseDrawer (0 hits), SeverityBadge (3 dead-gen hits), features/{all-releases,release-compare,release-calendar,my-test-scope} (dead-gen only).

## Confidence level

**HIGH** for: pill/avatar/modal/table mappings (A1-A7, B1-B4, C1-C5, E1-E2), DELETE list membership (grep-verified consumers), legacy-stack replacements (canonical twins live today), ALREADY-CANONICAL list (cross-checked two reports + spot reads).
**MEDIUM** for: dashboard/analytics mappings (A8, C6 — release/incident widget sets need design decisions), detail-shell mappings (A9-A11 — no canonical rh_* detail exists), create-form convergence details (B5-B8, C2).
**LOW** for: B14 (folder tree — no canon exists).
Code-only pass — no runtime verification of reachability under module gates.

## Open questions

1. **C1 data model:** converge incident create on CreateStoryModal→ph_issues, and does anything still read the `incidents` table that NewIncidentModal writes? (Blocker for C1/C2/D6.)
2. **A9:** which ReleaseDetailPage wins — bespoke 8-tab (`pages/releasehub/`) or slug shell (`pages/release-hub/`)? This mapping assumes slug wins per slug contract; content parity must be proven before retiring the 8-tab.
3. **B7/B8:** does CatalystViewTestCase have StepEditor parity (step add/edit/reorder)? If not, CaseDrawer edit-mode retirement is blocked until it does.
4. **D4/D9:** do Insights (1,367L print report) and IncidentCommandCenter contain any content genuinely missing from incident-hub reports/dashboard, or is full retirement clean?
5. **Detail-open convergence rule** (Agent 02 OQ2): panel vs modal vs route per surface — B9/B10 assume "same as sibling canonical surface" but a written per-surface rule is needed from Agent 10.
6. **BoardUuidRedirect:** mount it or delete it? Listed under DELETE #8 pending the decision.
