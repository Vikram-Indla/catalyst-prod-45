# Agent 01 — Route Discovery Agent

**Date:** 2026-07-03
**Mission:** Code-only discovery of every route relevant to Project Hub, Release Hub, Test Hub (incl. defects), Incident Hub, and Defect surfaces.

---

## Scope covered

- App entry router: `src/App.tsx` (top-level `<Routes>`, shell mounting, legacy redirects)
- Full route registry: `src/routes/FullAppRoutes.tsx` (single source of truth for all in-shell routes, 1082 lines, read in full)
- Typed route builders: `src/lib/routes.ts` (read in full)
- Hub sidebars (navigation sources): `src/components/layout/ProjectHubSidebar.tsx`, `ReleaseHubSidebar.tsx`, `TestHubSidebar.tsx`, `IncidentHubSidebar.tsx`
- Global navigation: `src/components/layout/HubSwitcher.tsx`, `HomeSidebar.tsx`
- Module/permission gates: `MG` wrapper (`ModuleGate` + `ModuleGuard`) in FullAppRoutes.tsx:369-384, `ModuleGuard` mounts in App.tsx
- UUID→slug redirect components: `src/routes/BoardUuidRedirect.tsx`, `src/routes/ProjectHubKeyGuard.tsx`
- Report registry: `src/components/testhub/reports/report-registry.ts` (26 report slugs)

**Defect Hub verdict:** There is **no standalone Defect Hub**. `grep -rn "defect-hub|defecthub|DefectHub" src/` returns zero matches. Defects live inside TestHub at `/testhub/defects` (`TestHubDefectsPage`, sidebar entry TestHubSidebar.tsx:43). Defect *reports* live in the TestHub reports hub (`defect-summary`, `defect-impact`, `defect-trend`, `defect-closure-trend` registry slugs). Defect creation uses the canonical QA Bug modal (per memory: `defect-creation-canonical-qabug`), not a route.

## Files inspected

| File | Role |
|---|---|
| `src/App.tsx` | Top-level router; auth, shell, legacy redirects, `/browse/:issueKey` |
| `src/routes/FullAppRoutes.tsx` | ALL hub routes (mounted at `/*` inside CatalystShell when `ENABLE_FULL_APP`) |
| `src/lib/routes.ts` | Typed builders — `Routes.projectHub / releaseHub / testHub / incidentHub / ...` |
| `src/routes/ProjectHubKeyGuard.tsx` | `/project-hub/INV/*`, `/project-hub/MDT/*` excluded-key redirects |
| `src/routes/BoardUuidRedirect.tsx` | UUID→slug board redirect component — **NOT MOUNTED anywhere** |
| `src/components/layout/ProjectHubSidebar.tsx` | Project Hub nav (lines 123-167) |
| `src/components/layout/ReleaseHubSidebar.tsx` | Release Hub nav (lines 38-72) |
| `src/components/layout/TestHubSidebar.tsx` | Test Hub nav (lines 34-45) |
| `src/components/layout/IncidentHubSidebar.tsx` | Incident Hub nav (lines 46-67) |
| `src/components/layout/HubSwitcher.tsx` | Hub roots (lines 74-77) |
| `src/components/layout/HomeSidebar.tsx` | Hub roots (lines 111-114) |
| `src/components/testhub/reports/report-registry.ts` | 26 `:reportSlug` values for `/testhub/reports/:reportSlug` |

Route registration key: **App** = `src/App.tsx`, **FAR** = `src/routes/FullAppRoutes.tsx`. All FAR routes are inside `ProtectedRoute > CatalystShell` and require `ENABLE_FULL_APP=true`.

---

## Routes discovered

### PROJECT HUB (canonical UI source of truth)

| Route | Source (path:line) | Nav source | Page component | Status | Evidence |
|---|---|---|---|---|---|
| `/project-hub` | App.tsx:247 | HubSwitcher.tsx:74, HomeSidebar.tsx:111 | `ProjectHubLanding` (ModuleGuard `workhub`) | confirmed | mounted OUTSIDE shell (re-render loop workaround) |
| `/project-hub/projects` | FAR:1012 | ProjectHubSidebar.tsx:167 ("All Projects") | `AllProjectsPage` (pages/project-hub/AllProjectsPage) | confirmed | routes.ts:20 builder |
| `/project-hub/projects-legacy` | FAR:1014 | none | `ProjectListPage` | code-only / deprecated | no nav references |
| `/project-hub/portfolio-health` | FAR:1015 | none | inline "Coming Soon" div | code-only placeholder | inline element |
| `/project-hub/:key` | FAR:1030 | — | `Navigate → dashboard` | confirmed redirect | |
| `/project-hub/:key/dashboard` | FAR:1031 | ProjectHubSidebar.tsx:87,123 | `ProjectDashboardPage` (pages/project-hub/ProjectDashboardPage) | confirmed | routes.ts:21 |
| `/project-hub/:key/backlog` | FAR:1035 | ProjectHubSidebar.tsx:126 | `BacklogPage.atlaskit` (modules/project-work-hub/pages) | confirmed | routes.ts:22 |
| `/project-hub/:key/backlog/:issueKey` | FAR:1036 | BacklogPage open-full-page | `BacklogDetailPage` | confirmed | routes.ts:23 |
| `/project-hub/:key/boards` | FAR:1048 | ProjectHubSidebar.tsx:127 ("Board") | `ProjectBoardManagerPage` | confirmed | routes.ts:26 |
| `/project-hub/:key/boards/:boardSlug` | FAR:1053 | board manager list | `KanbanPage` (features/kanban-board) | confirmed | routes.ts:27 |
| `/project-hub/:key/boards/:boardSlug/map-statuses` | FAR:1049 | board kebab | `MapStatusesPage` | confirmed | routes.ts:29 |
| `/project-hub/:key/boards/:boardSlug/settings[/:section]` | FAR:1050-1051 | board kebab | `ProjectBoardSettingsPage` | confirmed | routes.ts:31 |
| `/project-hub/:key/board` | FAR:1047 | none (sidebar uses /boards) | `KanbanPage` | suspected duplicate | no routes.ts builder; overlaps /boards/:boardSlug surface |
| `/project-hub/:key/kanban` | FAR:1055 | — | `LegacyKanbanRedirect` → `/boards` (window.location.replace) | deprecated redirect | FAR:435-442 |
| `/project-hub/:key/allwork` | FAR:1061 | ProjectHubSidebar.tsx:128 ("Work") | `ProjectJiraLayout` (pages/project-hub/jira-list) | confirmed | routes.ts:25 |
| `/project-hub/:key/allwork/:issueKey` | FAR:1060 | allwork open-detail | `AllWorkDetailPage` | confirmed | |
| `/project-hub/:key/list` | FAR:1059 | none | `ProjectJiraLayout` | duplicate (same component as allwork) | no builder, no nav |
| `/project-hub/:key/timeline` | FAR:1068 | ProjectHubSidebar.tsx:130 | `ProjectHubTimelinePage` | confirmed | routes.ts:43 |
| `/project-hub/:key/timeline/:issueKey` | FAR:1067 | timeline item click | `TimelineDetailPage` | confirmed | routes.ts:44 |
| `/project-hub/:key/filters` | FAR:1062 | ProjectHubSidebar.tsx:129 | `FiltersListPage` (pages/project-hub/filters) | confirmed | routes.ts:46 |
| `/project-hub/:key/filters/create` | FAR:1063 | filters list CTA | `FilterPreviewPage` | confirmed | routes.ts:47 |
| `/project-hub/:key/filters/:filterId` | FAR:1064 | filters list row | `FilterPreviewPage` | confirmed | routes.ts:48 — NOTE: FilterDetailPage import (FAR:59) is dead |
| `/project-hub/:key/dependencies` | FAR:1070 | ProjectHubSidebar.tsx:131 | `DependenciesPage` (pages/project-hub) | confirmed | |
| `/project-hub/:key/sprints` | FAR:1072 | ProjectHubSidebar.tsx:135 | `SprintsPage` | confirmed | routes.ts:35 |
| `/project-hub/:key/sprints/:sprintSlug` | FAR:1073 | sprints list row | `SprintDetailPage` | confirmed | routes.ts:36 |
| `/project-hub/:key/sprints/:sprintSlug/work` | FAR:1074 | sprint detail | `SprintWorkNavigatorPage` | confirmed | routes.ts:38 |
| `/project-hub/:key/roadmaps` | FAR:1056 | filters "create roadmap" flow | `RoadmapsListPage` | confirmed | routes.ts:40 |
| `/project-hub/:key/roadmaps/:id` | FAR:1057 | roadmaps list | `FilterRoadmapPage` | confirmed | routes.ts:41 |
| `/project-hub/:key/dashboards/:id` | FAR:1058 | filter-dashboard flow | `FilterDashboardPage` | confirmed (no routes.ts builder) | |
| `/project-hub/:key/releases` | FAR:1069 | none in sidebar | `ReleasesPage` (pages/project-hub/ReleasesPage) | code-only | no builder in projectHubRoutes; sidebar has no Releases tab |
| `/project-hub/:key/settings` | FAR:1034 | ProjectHubSidebar.tsx:148 | `ProjectSettingsPage` (pages/project-hub) | confirmed | routes.ts:50 |
| `/project-hub/:key/standups` | FAR:1033 | board kebab "Standup history" | `StandupHistoryPage` | confirmed | comment FAR:1032 |
| `/project-hub/:key/story/:itemId` | FAR:1045 | legacy links | `StoryDetailPage` | confirmed (UUID param — violates slug contract, grandfathered) | routes.ts:51 |
| `/project-hub/:key/reports` | FAR:1075 | none | `PHPlaceholder "Reports" Phase 4` | code-only placeholder | |
| `/project-hub/:key/sprint-predictor` | FAR:1076 | none | `PHPlaceholder Phase 5` | code-only placeholder | |
| `/project-hub/:key/risk-scanner` | FAR:1077 | none | `PHPlaceholder Phase 5` | code-only placeholder | |
| `/project-hub/:key/epic-backlog`, `feature-backlog`, `story-backlog` | FAR:1042-1044 | — | `LegacyBacklogRedirect` → `/backlog` | deprecated redirect | FAR:416-419 |
| `/project-hub/:key/issue/:issueKey` | FAR:1046 | — | `IssueRedirectToBrowse` → `/browse/:key` | redirect | |
| `/project-hub/:key/boards/:boardId` (UUID) | — | — | `BoardUuidRedirect` **NOT MOUNTED** | broken/code-only | src/routes/BoardUuidRedirect.tsx exists; zero mount references |
| `/project-hub/INV/*`, `/project-hub/MDT/*` | App.tsx:255-256 | — | `ProjectHubKeyRedirect` (excluded keys → canonical hub) | confirmed redirect | ProjectHubKeyGuard.tsx |
| `/project-hub/filters` | FAR:1065 | none | `FiltersListPage` (global) | code-only | global filters list, no nav entry |
| `/project-hub/filters/create` | FAR:1066 | — | `Navigate → /project-hub` | redirect | |
| `/project-hub/resource-360/:resourceId` | FAR:1027 | resource links | `Resource360PageNew` | confirmed | routes.ts:53 |
| `/project-hub/resource360[/:id]`, `/project-hub/resources[-v2][/:id]` | FAR:1019-1026 | — | redirects → `/me` / `/admin/resources` | deprecated redirects | |
| `/projecthub`, `/workhub`, `/projects[...]` | FAR:852-858 | — | redirects → `/project-hub[...]` | legacy redirects | |

### RELEASE HUB

| Route | Source | Nav source | Page component | Status | Evidence |
|---|---|---|---|---|---|
| `/release-hub` | FAR:756 | HubSwitcher.tsx:75 (→ overview) | `Navigate → /release-hub/overview` | confirmed redirect | |
| `/release-hub/overview` | FAR:757 | ReleaseHubSidebar.tsx:38 ("Dashboard") | `CommandCenterPage` (pages/releasehub) — ModuleGuard `releases` | confirmed | routes.ts:96 |
| `/release-hub/releases-management` | FAR:768 | ReleaseHubSidebar.tsx:44 ("Releases") | `ReleasesPage` (pages/project-hub/ReleasesPage — shared) | confirmed | routes.ts:97 |
| `/release-hub/releases-management/:releaseSlug` | FAR:769 | releases list row | `ReleaseDetailPage` (pages/**release-hub**/ReleaseDetailPage) | confirmed | routes.ts:99 |
| `/release-hub/releases-management/:releaseSlug/work` | FAR:770 | release detail | `ReleaseWorkNavigatorPage` | confirmed | routes.ts:101 |
| `/release-hub/release-kanban` | FAR:760 | ReleaseHubSidebar.tsx:45 ("Board") | `ReleaseBoardCanonical` | confirmed | |
| `/release-hub/work` | FAR:761 | ReleaseHubSidebar.tsx:46 | `ReleasesWorkCanonical` | confirmed | |
| `/release-hub/timeline` | FAR:765 | ReleaseHubSidebar.tsx:47 | `ReleasesTimelineCanonical` | confirmed | |
| `/release-hub/calendar` | FAR:767 | ReleaseHubSidebar.tsx:48 | `ReleaseCalendarPage` | confirmed | |
| `/release-hub/changes` | FAR:771 | ReleaseHubSidebar.tsx:54 ("Change Records") | `AllChangesPage` | confirmed | routes.ts:103 |
| `/release-hub/changes/:changeId` | FAR:772 | changes list row | `ChangeDetailPage` (pages/releasehub) | confirmed | routes.ts:104 (builder says changeSlug) |
| `/release-hub/sop-templates` | FAR:773 | ReleaseHubSidebar.tsx:55 | `SopTemplatesPage` | confirmed | |
| `/release-hub/sign-off-queue` | FAR:774 | ReleaseHubSidebar.tsx:56 | `SignOffQueuePage` | confirmed | |
| `/release-hub/freeze-windows` | FAR:775 | ReleaseHubSidebar.tsx:57 | `FreezeWindowsPage` | confirmed | |
| `/release-hub/production-events` | FAR:766 | ReleaseHubSidebar.tsx:58 | `ProductionEventsPage` | confirmed | |
| `/release-hub/settings` | FAR:776 | ReleaseHubSidebar.tsx:72 | `ReleaseSettingsPage` | confirmed | |
| `/release-hub/filters` | FAR:762 | **NO sidebar entry** | `ReleaseFiltersListPage` | code-only / orphaned nav | routes.ts:105 builder exists; grep "filters" in ReleaseHubSidebar.tsx = 0 matches |
| `/release-hub/filters/create` | FAR:763 | — | `ReleaseFilterPreviewPage` | code-only | routes.ts:106 |
| `/release-hub/filters/:filterId` | FAR:764 | — | `ReleaseFilterPreviewPage` | code-only | `ReleaseFilterDetailPage` import FAR:100 is dead |
| `/release-hub/:releaseId` | FAR:783 | routes.ts:98 `release(releaseSlug)` | `ReleaseDetailPage` (pages/**releasehub**/ReleaseDetailPage — DIFFERENT file) | **duplicate detail surface** | two ReleaseDetailPage files: pages/releasehub/ vs pages/release-hub/ |
| `/release-hub/releases` | FAR:759 | — | `Navigate → releases-management` | deprecated redirect | comment FAR:758 |
| `/release-hub/command-center`, `/compare`, `/triage` | FAR:779-781 | — | `Navigate → overview` | retired redirects | |
| `/releasehub[/*]` (9 paths) | FAR:786-794 | — | redirects → `/release-hub/*` | legacy redirects | |
| `/releases/*` | FAR:901 | — | `Navigate → /release-hub/overview` | legacy redirect | |
| `/catalyst/testpage` | App.tsx:278 | none | `ReleaseManagementPage` (pages/jira-clone) | code-only test page | |

### TEST HUB (incl. Defects)

| Route | Source | Nav source | Page component | Status | Evidence |
|---|---|---|---|---|---|
| `/testhub` | FAR:670 | HubSwitcher.tsx:76 (→ dashboard) | `Navigate → /testhub/dashboard` | confirmed redirect | |
| `/testhub/dashboard` | FAR:671 | TestHubSidebar.tsx:34 | `DashboardPage` (pages/testhub) | confirmed | routes.ts:116 |
| `/testhub/board` | FAR:673 | TestHubSidebar.tsx:35 | `BoardPage` | confirmed | routes.ts:118 |
| `/testhub/my-work` | FAR:672 | TestHubSidebar.tsx:36 | `MyWorkPage` | confirmed | routes.ts:117 |
| `/testhub/filters` | FAR:701 | TestHubSidebar.tsx:37 | `FiltersListPage` (pages/testhub) | confirmed | routes.ts:128 |
| `/testhub/filters/create` | FAR:702 | filters CTA | `FilterPreviewPage` (pages/testhub) | confirmed | routes.ts:129 |
| `/testhub/filters/:filterId` | FAR:703 | filters row | `FilterPreviewPage` | confirmed | `TestHubFilterDetailPage` import FAR:172 is dead |
| `/testhub/repository` | FAR:674 | TestHubSidebar.tsx:38 | `RepositoryPage` (pages/testhub/repository) | confirmed | routes.ts:119 |
| `/testhub/sets` | FAR:683 | TestHubSidebar.tsx:39 ("Test Sets") | `TestSetsPage` | confirmed | routes.ts:123 |
| `/testhub/sets/:id` | FAR:684 | sets list row | `SetDetailPage` | confirmed | routes.ts:124 (builder: setSlug; route param `:id`) |
| `/testhub/cycles` | FAR:675 | TestHubSidebar.tsx:40 | `CyclesPage` (pages/testhub/cycles) | confirmed | routes.ts:120 |
| `/testhub/:projectKey/cycles/:cycleKey` | FAR:676 | cycles list row | `CycleDetailPage` | confirmed (canonical) | **routes.ts has NO projectKey builder — builders point at legacy path** |
| `/testhub/:projectKey/cycles/:cycleKey/execute` | FAR:677 | cycle detail "Execute" | `ExecutionPage` | confirmed (canonical) | |
| `/testhub/cycles/:cycleKey` | FAR:679 | routes.ts:121 `cycle()` | `CycleDetailPage` | confirmed (legacy compat) | comment FAR:678 |
| `/testhub/cycles/:cycleKey/execute` | FAR:680 | routes.ts:122 `cycleExecute()` | `ExecutionPage` | confirmed (legacy compat) | |
| `/testhub/timeline` | FAR:681 | TestHubSidebar.tsx:41 | `TestHubTimelinePage` | confirmed | routes.ts:131 |
| `/testhub/dependencies` | FAR:682 | TestHubSidebar.tsx:42 | `TestHubDependenciesPage` | confirmed | **no routes.ts builder** |
| `/testhub/defects` | FAR:686 | TestHubSidebar.tsx:43 ("Defects") | `DefectsPage` (pages/testhub) | confirmed — THE defect surface | routes.ts:132 |
| `/testhub/traceability` | FAR:685 | TestHubSidebar.tsx:44 | `TraceabilityPage` | confirmed | routes.ts:133 |
| `/testhub/reports` | FAR:692 | TestHubSidebar.tsx:45 | `ReportsHubPage` (registry-driven) | confirmed | routes.ts:125 |
| `/testhub/reports/:reportSlug` | FAR:698 | reports hub cards | `ReportsHubPage` (26 registry slugs: execution-overview … traceability-detail) | confirmed | report-registry.ts; routes.ts:127 |
| `/testhub/reports-lab` | FAR:691 | — | `Navigate → reports/execution-overview` | deprecated redirect | |
| `/testhub/reports/project-status`, `sprint-status`, `tester-status`, `team-status`, `defects-incidents` | FAR:693-697 | — | redirects to renamed registry slugs | deprecated redirects | defects-incidents → defect-summary |

### INCIDENT HUB

| Route | Source | Nav source | Page component | Status | Evidence |
|---|---|---|---|---|---|
| `/incident-hub` | FAR:709 | HubSwitcher.tsx:77, HomeSidebar.tsx:114 | `Navigate → /incident-hub/dashboard` | confirmed redirect | |
| `/incident-hub/dashboard` | FAR:737 | IncidentHubSidebar.tsx:46 | `IncidentDashboardPage` (canonical ProjectDashboardPage mode='incident') | confirmed | MG gate `incidenthub`→role `operations` |
| `/incident-hub/all-incidents` | FAR:710 | IncidentHubSidebar.tsx:47 | `IncidentListPage` | confirmed | routes.ts:143 |
| `/incident-hub/analytics` | FAR:740 | IncidentHubSidebar.tsx:48 | `IncidentAnalyticsPage` (pages/incidenthub) | confirmed | routes.ts:148 |
| `/incident-hub/board` | FAR:716 | IncidentHubSidebar.tsx:53 | `IncidentBoardPage` | confirmed | routes.ts:144 |
| `/incident-hub/kanban` | FAR:717 | — | `Navigate → board` | deprecated redirect | |
| `/incident-hub/work` | FAR:739 | IncidentHubSidebar.tsx:56 | `IncidentWorkPage` (canonical ProjectAllWorkView mode='incident') | confirmed | routes.ts:147 |
| `/incident-hub/filters` | FAR:722 | IncidentHubSidebar.tsx:59 | `IncidentFiltersListPage` | confirmed | routes.ts:153 |
| `/incident-hub/filters/create` | FAR:723 | filters CTA | `IncidentFilterPreviewPage` | confirmed | routes.ts:154 |
| `/incident-hub/filters/:filterId` | FAR:724 | filters row | `IncidentFilterPreviewPage` | confirmed | `IncidentHubFilterDetailPage` import FAR:140 dead |
| `/incident-hub/timeline` | FAR:729 | IncidentHubSidebar.tsx:64 | `IncidentTimelinePage` (canonical TimelineView) | confirmed | routes.ts:151 |
| `/incident-hub/dependencies` | FAR:730 | IncidentHubSidebar.tsx:65 | `IncidentHubDependenciesPage` | confirmed | routes.ts:152 |
| `/incident-hub/reports` | FAR:744 | IncidentHubSidebar.tsx:66 | `IncidentReportPage` (modules/incidents/analytics) | confirmed | routes.ts:150; CAT-REPORTS-HUB Lane C |
| `/incident-hub/committee-queue` | FAR:745 | IncidentHubSidebar.tsx:67 | `CommitteeQueuePage` (pages/incidenthub) | confirmed | revived 2026-07-03 |
| `/incident-hub/view/:incidentKey` | FAR:746 | list/board row click | `IncidentDetailPage` | confirmed | routes.ts:146 (display key e.g. INC-42) |
| `/incident-hub/backlog/:key` | FAR:753 | stale BacklogPage links | `IncidentBacklogKeyRedirect` → view/:key | redirect alias | FAR:389-393 |
| **Legacy `/release/incidents` family** | FAR:909-922 | none (old nav removed) | `IncidentRoomList`, `IncidentsDashboard`, `IncidentAnalyticsPage` + `IncidentInsightsPage` + `IncidentKanbanPage` (modules/incidents), `CreateIncident`, `IncidentReports`, `IncidentRoomDetail`, `IncidentCommandCenter`, `CommitteeQueue` (pages/release) | duplicate / legacy parallel stack | 10 live routes + 3 redirects; overlaps incident-hub surfaces; `/release/incident-room/:incidentId` redirect target `":incidentId"` is a literal string — **broken param substitution** (FAR:919) |

### CROSS-HUB / SHARED

| Route | Source | Nav source | Page component | Status |
|---|---|---|---|---|
| `/browse/:issueKey` | App.tsx:281 | universal issue links | `IssueFullPage` | confirmed (canonical work-item detail) |
| `/browse/:key` | FAR:469 | — | `BrowsePage` | duplicate — shadowed by App.tsx `/browse/:issueKey` which matches first (App-level route wins before FAR wildcard) |
| `/issue/:issueKey` | App.tsx:284 | — | redirect → `/browse/:key` | legacy redirect |
| `/admin/test/priorities`, `case-types`, `case-statuses`, `run-statuses`, `permissions` | FAR:987-991 | AdminLayout sidebar | TestHub admin pages | confirmed (TestHub admin) |
| `/admin/test-ops` | FAR:950 | AdminLayout | `TestOpsPage` | confirmed |
| `/admin/release-ops` | FAR:951 | AdminLayout | `ReleaseOpsAdminPage` | confirmed |

---

## Findings count

- **Project Hub:** 44 routes (28 live surfaces, 4 placeholders, 12 redirects/legacy)
- **Release Hub:** 27 routes (17 live, 1 duplicate detail, 9+ redirects) + 1 test page
- **Test Hub:** 24 routes (19 live incl. defects, 5 redirect aliases) + 26 report slugs under `:reportSlug`
- **Incident Hub:** 16 canonical routes + 13 legacy `/release/incidents*` routes (10 live duplicates, 3 redirects)
- **Defect Hub:** 0 standalone routes — defects = `/testhub/defects` + 4 defect report slugs
- **Dead imports (imported, never mounted):** 5 FilterDetailPage variants (FAR:59, 100, 140, 172, 244)
- **Unmounted redirect component:** `BoardUuidRedirect` (src/routes/BoardUuidRedirect.tsx)

## High-risk findings

1. **Duplicate Release detail surfaces:** `/release-hub/:releaseId` → `pages/releasehub/ReleaseDetailPage` (FAR:783) vs `/release-hub/releases-management/:releaseSlug` → `pages/release-hub/ReleaseDetailPage` (FAR:769). Two different files, two different URL shapes, both reachable; routes.ts registers builders for BOTH (`release()` :98 and `releaseManagement()` :99).
2. **Legacy incident stack still live:** 10 `/release/incidents*` routes render a parallel incident UI (pages/release + modules/incidents) that duplicates incident-hub surfaces. No nav points at them, but they are reachable and unguarded by the `incidenthub` ModuleGate.
3. **Broken redirect:** FAR:919 `<Route path="/release/incident-room/:incidentId" element={<Navigate to="/release/incidents/:incidentId" replace />} />` — react-router `Navigate to` does not substitute params; it navigates to the literal string `:incidentId`.
4. **BoardUuidRedirect never mounted** — UUID board links (`/project-hub/:key/boards/<uuid>`) fall through to `KanbanPage` with a UUID as `boardSlug` instead of redirecting to the slug URL.
5. **Release Hub Filters orphaned:** routes + builders + 3 pages exist (`/release-hub/filters[...]`) but `ReleaseHubSidebar` has no Filters item — surface unreachable by navigation.
6. **routes.ts drift vs router:** `testHubRoutes.cycle/cycleExecute` build the *legacy* no-projectKey paths while the canonical route is `/testhub/:projectKey/cycles/:cycleKey`; no builder exists for the canonical shape. `testHubRoutes` also lacks a `dependencies()` builder though the route + sidebar item exist.
7. **5 dead FilterDetailPage lazy imports** (project-hub, release, incident, testhub, tasks) — all `:filterId` routes mount FilterPreviewPage instead; imports pull the chunk graph for nothing.
8. **`/project-hub/:key/list` vs `/allwork`** render the same `ProjectJiraLayout` — duplicate URL for one surface (only /allwork is in nav + routes.ts).
9. **`/project-hub/:key/board` (singular)** mounts KanbanPage directly with no board slug — bypasses the board-manager flow; not in routes.ts or sidebar.

## Evidence references

- Route registration: `src/App.tsx:212-292`, `src/routes/FullAppRoutes.tsx:451-1078`
- Builders: `src/lib/routes.ts:18-253`
- Nav: `ProjectHubSidebar.tsx:123-167`, `ReleaseHubSidebar.tsx:38-72`, `TestHubSidebar.tsx:34-45`, `IncidentHubSidebar.tsx:46-67`, `HubSwitcher.tsx:74-77`, `HomeSidebar.tsx:111-114`
- Gating: `MG()` FAR:369-384 (`incidenthub`→`operations`, `producthub`→`product`); TestHub + ReleaseHub inner routes largely ungated except `/release-hub/overview` (ModuleGuard `releases`); Project Hub landing ModuleGuard `workhub` (App.tsx:247)
- Report slugs: `src/components/testhub/reports/report-registry.ts` (26 ids)
- Defect-hub absence: zero grep matches for `defect-hub|defecthub|DefectHub` in src/

## Reference starting routes for Project Hub (canonical surfaces)

Using project key `SEN` (Senaei BAU, per demo-seed memory) as the example key:

1. `/project-hub/projects` — All Projects listing
2. `/project-hub/:key/dashboard` — Dashboard (default landing per :key redirect)
3. `/project-hub/:key/backlog` — Backlog (BacklogPage.atlaskit — THE canonical table surface)
4. `/project-hub/:key/boards` → `/project-hub/:key/boards/:boardSlug` — Board manager → Kanban
5. `/project-hub/:key/allwork` — All Work (ProjectJiraLayout)
6. `/project-hub/:key/timeline` — Timeline (Gantt)
7. `/project-hub/:key/filters` — Filters list (canonical FiltersListPage reused by every hub)
8. `/project-hub/:key/sprints` — Sprints (clone of release-hub releases-management pattern)
9. `/project-hub/:key/dependencies` — Dependencies
10. `/project-hub/:key/settings` — Settings

Note: Project Hub has NO summary route (`summary` exists only in legacy `/project/:projectKey/summary` InJira layout, FAR:883, and `/projects/:projectKey/summary` is a redirect to the projects list).

## Confidence level

**High (95%)** for route inventory: App.tsx and FullAppRoutes.tsx were read end-to-end, and FullAppRoutes is the single flat registry (no nested route files for these 4 hubs; Program/Team/Portfolio/Enterprise shells exist but are out of scope). **Medium** for "reachable in practice" claims — module gating (`ModuleGate` reads org `feature_flags`/`org_modules`; empty `org_modules` landmine per memory) can hide confirmed routes at runtime; no browser verification was in scope.

## Open questions

1. Which Release detail page is canonical — `pages/release-hub/ReleaseDetailPage` (slug, releases-management) or `pages/releasehub/ReleaseDetailPage` (`/release-hub/:releaseId`)? routes.ts keeps builders for both.
2. Should the legacy `/release/incidents*` stack (10 live routes) be retired now that incident-hub covers all its surfaces?
3. Is Release Hub Filters intentionally hidden (no sidebar entry) or a missed nav wiring?
4. Should `testHubRoutes` builders be migrated to the project-scoped cycle paths (`/testhub/:projectKey/cycles/:cycleKey`)?
5. `/testhub/sets/:id` route param is `:id` — is it actually a slug (builder says `setSlug`) or a UUID (slug-contract risk)?
6. Is `/project-hub/:key/board` (singular, FAR:1047) still needed, or should it redirect to `/boards` like `/kanban` does?
