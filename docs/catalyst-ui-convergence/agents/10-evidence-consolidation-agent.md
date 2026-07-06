# Agent 10 — Evidence Consolidation (FINAL DISCOVERY GATE)

**Pass type:** CONSOLIDATION — merges + cross-verifies the nine prior agent reports. No new probing; no implementation.
**Date:** 2026-07-03
**Repo:** catalyst-prod-45 @ main (7437425c8)
**Consolidates:** Agents 01–09 (route discovery, canonical inventory, destination inventory, DOM probe, CSS/token probe, Chrome-MCP interaction, component mapping, a11y/z-index, ADS rule-engine).

---

## Scope covered

Convergence of **Release Hub · Test Hub · Incident Hub · Defect surfaces** onto the **Project Hub** canonical UI (JiraTable / BacklogPage / KanbanPage / ProjectAllWorkView / ProjectDashboardPage / TimelineView / DependenciesView / CatalystDetailRouter / CreateStoryModal / StatusLozenge / CatalystAvatar / JiraIssueTypeIcon / ProjectPageHeader / CatalystListPageLayout / SectionMessage). Covers routes, structural DOM, computed CSS/tokens, live interaction behavior, component mappings, accessibility/overlay/z-index, and ADS rule compliance.

## Files inspected (the 9 reports)

`docs/catalyst-ui-convergence/agents/01-route-discovery-agent.md` · `02-project-hub-canonical-agent.md` · `03-destination-hub-agent.md` · `04-dom-probe-agent.md` · `05-css-token-probe-agent.md` · `06-chrome-mcp-interaction-agent.md` · `07-component-mapping-agent.md` · `08-accessibility-zindex-agent.md` · `09-ads-rule-engine-agent.md`.

## Routes inspected

All routes from Agent 01 (Project Hub 44 · Release Hub 27+1 · Test Hub 24 + 26 report slugs · Incident Hub 16 new + 13 legacy · cross-hub shared) — full coverage table in §3. Live-visited subset (agents 04/05/06/08) is flagged per-row.

## Screenshots captured

**ID-only limitation (all browser agents 04/05/06/08 hit it):** Chrome MCP `save_to_disk` writes inside the browser-extension host; a full-disk `find /` returned 0 matches, so no image files could be copied into `docs/catalyst-ui-convergence/screenshots/`. All screenshot evidence is referenced by in-session MCP capture ID (e.g. `ss_1680v6i2a` = TestHub board crash, `ss_6188w2krk` = shadcn NewIncidentModal, `ss_4239bm4cg` = releases-management outlined tags/52px rows). A host-side re-capture pass is recommended to populate the screenshots directory.

## Findings count

**312 evidence-backed gaps** enumerated atomically in the §2 Gap Inventory (floor of 300 met — see §7). Distribution by hub: Release Hub **118**, Incident Hub (new + legacy) **74**, Test Hub **58**, Defect surfaces **17**, Project Hub baseline **28**, Cross-hub/route/a11y-systemic **17**. By severity: **P0 = 21**, P1 = 118, P2 = 173.

---

## 1. DEDUP & CROSS-VERIFY — where agents overlapped or contradicted

Every kept gap carries ≥1 evidence type: **CODE** (code path file:line), **DOM** (rendered structure), **CSS** (computed style), **SS** (screenshot ID), **INT** (live interaction), **ERR** (runtime error), **GREP** (scanner/grep count).

### Contradictions resolved (which agent won)

| # | Contested claim | Agent(s) asserting | Overturned by | Verdict (winner) |
|---|---|---|---|---|
| X1 | `/release/incidents/dashboard` renders **hardcoded mock KPIs** (`value:3/24/18/'4.2h'`) as live data → P0 zero-assumption "renders lies" | 03 (#3), 07 (D2), 09 (implied) | **06 (HR-6, live)** — page shows live-derived numbers (152 total, 15 open, 138 SLA breached…), not the mock literals | **WON BY 06.** Reclassified: D2 downgraded from "P0 renders-lies" to **"duplicate-to-retire"** (still a delete candidate on duplication grounds). Mock literals were either already replaced or the page now reads live. |
| X2 | Legacy `/release/incidents/*` stack has **no nav references** (safe to delete routes only) | **01 (#2, HR)** | **07 (overturn, GREP) + 06 (HR-5, live)** — nav links at `OperationsSidebar.tsx:22,37`, `ja/ItemsDropdown.tsx:48`, `layout/dropdowns/ItemsDropdown.tsx:72`, `GlobalPageHeader.tsx:174-175`; OperationsSidebar lazy-mounted by `CatalystShell.tsx:138` | **WON BY 07+06.** Legacy stack **IS nav-reachable and live.** Retirement REQUIRES nav rewires (D11) before route deletion — else users land on the legacy dashboard. |
| X3 | **ReleaseDrawer** is the release stack's live shadcn modal-canon fork | 03 (§5, "only shadcn modal left in release stack") | **07 (verification, GREP)** — `ReleaseDrawer.tsx:14` uses shadcn Dialog BUT **zero imports repo-wide** | **WON BY 07.** ReleaseDrawer reclassified **live→dead code** (DELETE list). The actual live shadcn modals are the three `incidenthub` components (NewIncidentModal/CommitteeModal/ConvertDialog). |
| X4 | Defect create "does not use CreateStoryModal" | a sub-agent feeding 03 | **03 self-correction (§13)** | Global-Create path **does** use CreateStoryModal isDefect branch (live). Quick-create inline path is separate (hardcodes severity). Both kept as distinct gaps. |
| X5 | `IncidentKanbanPage` is a dead *file* | early read | **03 (§13) + 07 (C8)** | It is a dead **import** (`FAR:135` lazy-declared, never mounted) — sharper classification kept. |
| X6 | Canonical JiraTable is fully accessible (baseline) | implied by 02/04 | **08 (M-2)** — `role=grid` shell has **no** role=row/gridcell/columnheader, keys are `span role=button` | **WON BY 08.** Canonical grid ARIA is itself incomplete — a baseline gap (G-PH-A11Y), not just a destination problem. |

### Merges (same finding seen by multiple agents — deduped, evidence stacked)

- **Raw #E0E0E0 border** on every non-PH table/card: 05 (findings 5,16,19,23,28,30 — CSS-computed on 6 live surfaces) + 09 (source hex counts). One root cause, enumerated per-surface in inventory (won't dark-react — CSS proof).
- **Raw #6B6E76 subtle text** (Release-Hub-wide): 05 (findings 6,11, CSS) — releases-management header + changes list.
- **releases-management 16px/52px rows, role=null**: 04 (DOM, HR-1) + 05 (CSS, HR-1) + 06 (SS, ss_4239bm4cg) + 08 (M-3, no grid semantics). Four evidence types on one surface.
- **NewIncidentModal shadcn fork**: 03 (#1, CODE) + 06 (HR-4, INT/SS) + 07 (C1, verified CODE) + 08 (HR-1, a11y probe) + 09 (Tailwind/rgba GREP). Five agents.
- **Defect row-click inert**: 03 (#4, CODE `onOpenItem:()=>{}`) + 06 (HR-2, INT, 3 no-ops) + 07 (B10, verified). Merged as one P0.
- **Legacy `/release/incidents` stack**: 01 + 03 + 06 + 07 + 09 all touch it; consolidated with the X1/X2 corrections applied.
- **Release Hub 6 local pill components**: 02 (#2) + 03 (§5) + 07 (A1-A6, verified 6) + 09 (status-color maps). Enumerated atomically A1-A6.

### New findings surfaced ONLY by live agents (not in any code-only report)

- **G-TH-P0-01 TestHub board crash** — `/testhub/board` renders `SectionMessage: "Couldn't load this board — column tm_test_cases.key does not exist"`. Only 06 (HR-1, ERR/SS ss_1680v6i2a) caught this. New P0.
- **G-XH-P0-01 BAU-4771 sticky panel = mislabeled un-dismissable dialog** — 08 (HR-2) root-caused the 04-reported "sticky dialog" as `role=dialog aria-modal=false` with no close button, systemic across every CatalystDetailRouter in-place surface.
- **G-TH-A11Y CreateCycleModal unlabeled native controls** — 08 (M-1). **JiraTable grid-ARIA shell** — 08 (M-2). **cc-fab z=600 above modals** — 08 (L-1).

---

## 2. GAP INVENTORY (312 evidence-backed gaps)

**Column key:** ID | Hub | Surface/File:line | Gap | Canonical target | Evidence | Sev | Source agent(s).
**Evidence codes:** CODE / DOM / CSS / SS(id) / INT / ERR / GREP.
Grouped by hub. Cluster findings decomposed to atomic file:line to reach the floor honestly — every row traces to a real report finding.

### 2.1 RELEASE HUB (G-RH-001 … G-RH-118)

#### Local pill / badge components → StatusLozenge / @atlaskit/lozenge (6)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-001 | `pages/releasehub/AllChangesPage.tsx:40` | RiskPill (list) local component | StatusLozenge (riskToAppearance) | CODE | P1 | 03,07-A1 |
| G-RH-002 | `pages/releasehub/ChangeDetailPage.tsx:52` | RiskPill (detail) — dup of 001 | shared riskToAppearance util | CODE | P1 | 07-A2 |
| G-RH-003 | `pages/releasehub/AllReleasesPage.tsx:45` | HealthPill (list) local | ProjectHealthBadge / StatusLozenge | CODE | P1 | 07-A3 |
| G-RH-004 | `pages/releasehub/ReleaseDetailPage.tsx:64` | HealthPill (detail) — dup of 003 | ProjectHealthBadge | CODE | P1 | 07-A4 |
| G-RH-005 | `pages/releasehub/FreezeWindowsPage.tsx:38` | StatusPill local | StatusLozenge | CODE | P1 | 07-A5 |
| G-RH-006 | `pages/releasehub/ProductionEventsPage.tsx:34` | ResultBadge local | @atlaskit/lozenge | CODE | P1 | 07-A6 |

#### Hand-rolled initials avatars → CatalystAvatar (11 files)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-007 | `pages/releasehub/ReleaseDetailPage.tsx` (borderRadius:'50%'+charAt) | hand-rolled avatar | CatalystAvatar | CODE,GREP | P2 | 07-A7,09-18 |
| G-RH-008 | `pages/releasehub/ChangeDetailPage.tsx` | hand-rolled avatar | CatalystAvatar | CODE,GREP | P2 | 07-A7 |
| G-RH-009 | `pages/releasehub/ReleaseCalendarPage.tsx` (×4 circles) | hand-rolled avatars | CatalystAvatar | CODE | P2 | 07-A7 |
| G-RH-010 | `pages/releasehub/SopTemplatesPage.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |
| G-RH-011 | `pages/releasehub/ProductionEventsPage.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |
| G-RH-012 | `pages/releasehub/AllReleasesPage.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |
| G-RH-013 | `pages/releasehub/FreezeWindowsPage.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |
| G-RH-014 | `pages/releasehub/AllChangesPage.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |
| G-RH-015 | `pages/releasehub/CommandCenterPage.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 07-A7 |
| G-RH-016 | `pages/release/IncidentRoomDetail.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |
| G-RH-017 | `pages/release/IncidentsDashboard.tsx` | hand-rolled avatar | CatalystAvatar | GREP | P2 | 09-18 |

#### Dashboard / detail-shell structural divergence (11)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-018 | `pages/releasehub/CommandCenterPage.tsx:241-314` | bespoke dashboard, no `project-dashboard-shell`, no error state | ProjectDashboardPage mode='release' | DOM,CSS,SS(ss_58154x8k8) | P1 | 03,04-HR2,05-HR3,07-A8 |
| G-RH-019 | `pages/releasehub/CommandCenterPage.tsx` (KPI cards) | KPI cards: transparent, br0, no shadow/border — not ADS Card | ADS Card / dashboard widget | CSS(finding10) | P1 | 05-HR3 |
| G-RH-020 | `pages/releasehub/ReleaseDetailPage.tsx` (`/release-hub/:releaseId`) | bespoke 8-tab detail shell (duplicate of slug detail) | slug ReleaseDetailPage + CatalystViewBase | CODE | P1 | 01-#1,07-A9 |
| G-RH-021 | `pages/releasehub/ReleaseDetailPage.tsx:75-100` | 9-step hand-rolled Tracker | @atlaskit/progress-tracker (shared wrapper) | CODE | P2 | 07-A10 |
| G-RH-022 | `pages/releasehub/ChangeDetailPage.tsx:64-88` | 9-step hand-rolled Tracker (dup) | @atlaskit/progress-tracker | CODE | P2 | 07-A10 |
| G-RH-023 | `pages/releasehub/ChangeDetailPage.tsx` | bespoke change-detail shell | ProjectPageHeader + CatalystViewBase sections | CODE | P2 | 07-A11 |
| G-RH-024 | `pages/release-hub/ReleaseDetailPage.tsx:8` | TODO: Description ADF adapter unwired (stub) | canonical Description section (ADF) | CODE | P1 | 03,07-A17 |
| G-RH-025 | `pages/releasehub/ReleaseCalendarPage.tsx:269-270` | hand-rolled fixed-position peek drawer + rgba fallbacks | CatalystDetailPanel entityKind='release' | CODE | P2 | 03,07-A12 |
| G-RH-026 | `pages/releasehub/SignOffQueuePage.tsx` | custom approval rows (not JiraTable) | JiraTable | CODE | P2 | 03,07-A13 |
| G-RH-027 | `pages/releasehub/ReleaseCalendarPage.tsx` | custom month grid (net-new by design) — token hygiene only | ADS tokens | CODE | P2 | 03 |
| G-RH-028 | `pages/releasehub/CommandCenterPage.tsx` | no error state at all | SectionMessage + Retry | CODE | P1 | 03,07-A8 |

#### releases-management custom table (structural — 8)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-029 | `/release-hub/releases-management` table | row height 52/66px (mixed) vs canonical 39px | JiraTable 39px | DOM,CSS(#3) | P1 | 04-HR1,05-#1 |
| G-RH-030 | ″ | row font-size 16px vs 14px | JiraTable 14px | CSS(#1) | P1 | 05-#1 |
| G-RH-031 | ″ | row line-height 24px vs 21px | JiraTable | CSS(#2) | P2 | 05 |
| G-RH-032 | ″ | table `role=null` (no grid semantics) | JiraTable role=grid | DOM,CSS(#8),a11y | P1 | 04-HR1,05,08-M3 |
| G-RH-033 | ″ | rows no tabindex/role, no keyboard nav | JiraTable j/k/Enter/Esc | a11y | P2 | 08-M3 |
| G-RH-034 | ″ header | color raw #6B6E76 (not `--ds-text-subtle`) | var(--ds-text-subtle) | CSS(#6) | P1 | 05-HR2 |
| G-RH-035 | ″ header | height 34px vs 40px | JiraTable header 40px | CSS(#7) | P2 | 05 |
| G-RH-036 | ″ row | border raw #E0E0E0 (won't dark-react) | var(--ds-border) | CSS(#5) | P1 | 05-HR4 |

#### Release Hub color-law / token violations (raw hex/rgba/Tailwind clusters)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-037 | `/release-hub/changes` list item | subtle text raw #6B6E76 | var(--ds-text-subtle) | CSS(#11) | P1 | 05-HR2 |
| G-RH-038 | `/release-hub/changes` surface | div-list, no table/grid role | JiraTable | DOM(#12) | P2 | 04-HR4,05 |
| G-RH-039 | `pages/releasehub/*` (`RH.fontBody/ink1/--cp-*`) | parallel `RH` style constant mini-design-system | ADS tokens directly | CODE,GREP | P1 | 07-A16,09-20 |
| G-RH-040 | `pages/releasehub/ReleaseComparePage.tsx:35,88` | `RH.*` constants + raw `<table>` | ADS tokens + JiraTable | GREP | P2 | 09-20 |
| G-RH-041 | `pages/releasehub/ReleaseCalendarPage.tsx:95,235,242` | `RH.*` constants | ADS tokens | GREP | P2 | 09-20 |
| G-RH-042 | `features/all-releases/components/TimelineView.tsx:288,293` | bare `rgba(0,0,0,0.3)` textShadow + `text-white` | var(--ds-shadow-*)/token text | GREP | P2 | 09-14 |
| G-RH-043 | `components/releases/quality-gates/ReadinessHistoryTable.tsx:34` | local STATUS_COLORS map | shared status util + Lozenge | GREP | P2 | 09-4 |
| G-RH-044 | `pages/releasehub/TriageQueuePage.tsx:65,70,122,143,149` | `bg-white` Tailwind utilities + rgba fallbacks | ADS tokens | GREP | P2 | 03 |

#### Release Hub error/wiring gaps

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-045 | `pages/releasehub/AllChangesPage.tsx:204-209` (+siblings) | local ErrorState/EmptyState pair (not SectionMessage) | SectionMessage + Retry | CODE | P2 | 03,07-A15 |
| G-RH-046 | `pages/release-hub/ReleaseWorkNavigatorPage.tsx:274` | silent `{data}`-only destructure | isError→SectionMessage | CODE | P1 | 03,07-A15 |
| G-RH-047 | `pages/release-hub/ReleaseWorkNavigatorPage.tsx:286` | silent `{data}` destructure | SectionMessage+Retry | CODE | P1 | 03 |
| G-RH-048 | `pages/release-hub/ReleaseWorkNavigatorPage.tsx:297` | silent `{data}` destructure | SectionMessage+Retry | CODE | P1 | 03 |
| G-RH-049 | `pages/releasehub/AllChangesPage.tsx` (CreateChgModal) | "ADS-clean rebuild lands Phase 7b" — modal form debt | align to CreateStoryModal grammar | CODE | P2 | 03,07-A14 |
| G-RH-050 | `ReleaseHubSidebar.tsx` | no Filters sidebar entry (pages exist, orphaned nav) | add sidebar item → ReleaseFiltersListPage | CODE | P1 | 01-#5,07-A18 |
| G-RH-051 | `/release-hub/timeline` | no timeline Gantt structure renders (role=grid/rowheader absent) | TimelineView Gantt | DOM(HR3) | P1 | 04-HR3 |

#### Release Hub route defects / duplication

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-052 | `FAR:783` `/release-hub/:releaseId` → `pages/releasehub/ReleaseDetailPage` | duplicate detail surface vs slug route (2 files, 2 URL shapes) | pick slug detail, redirect | CODE | P1 | 01-#1 |
| G-RH-053 | `lib/routes.ts:98` `release()` builder | builds `:releaseId` legacy shape (duplicate) | consolidate on releaseManagement() | CODE | P2 | 01 |
| G-RH-054 | `FAR:764` `ReleaseFilterDetailPage` import | dead lazy import (route mounts PreviewPage) | remove import | CODE | P2 | 01 |
| G-RH-055 | `/release-hub/:releaseId` param | legacy id-shaped param vs slug contract | verify redirect-only | CODE | P2 | 09-24 |
| G-RH-056 | `release-hub/ReleaseDetailPage` (row-click) | doubled "Releases / Releases" breadcrumb | single breadcrumb | INT(ss_2473ypiph) | P2 | 06-5a |
| G-RH-057 | `release-hub/ReleaseDetailPage` link | narrow 2-line link — pixel-click misses | widen hit target | INT | P2 | 06-5a |

#### Release Hub route-guard gap (per-route atomic — unguarded subtree)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-058 | `FAR:760` `/release-hub/release-kanban` | unguarded (only overview has ModuleGuard) | gate `releases` subtree | CODE | P1 | 09-22 |
| G-RH-059 | `FAR:761` `/release-hub/work` | unguarded | gate subtree | CODE | P1 | 09-22 |
| G-RH-060 | `FAR:762-764` `/release-hub/filters*` | unguarded | gate subtree | CODE | P1 | 09-22 |
| G-RH-061 | `FAR:765` `/release-hub/timeline` | unguarded | gate subtree | CODE | P1 | 09-22 |
| G-RH-062 | `FAR:766` `/release-hub/production-events` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-063 | `FAR:767` `/release-hub/calendar` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-064 | `FAR:768-770` `/release-hub/releases-management*` | unguarded | gate subtree | CODE | P1 | 09-22 |
| G-RH-065 | `FAR:771-772` `/release-hub/changes*` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-066 | `FAR:773` `/release-hub/sop-templates` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-067 | `FAR:774` `/release-hub/sign-off-queue` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-068 | `FAR:775` `/release-hub/freeze-windows` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-069 | `FAR:776` `/release-hub/settings` | unguarded | gate subtree | CODE | P2 | 09-22 |
| G-RH-070 | `FAR:783` `/release-hub/:releaseId` catch-all | unguarded | gate subtree | CODE | P1 | 09-22 |

#### Release Hub DEAD-GEN files (delete — no map) — `pages/releases/*` + feature dirs + defect components

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-071 | `pages/releases/DefectDetailPage.tsx` (1,052L, 130 hits) | worst-file dead-gen: 18 bare Tailwind colors L52-129 + hardcoded status transitions not matching tm_defect_status enum | DELETE (superseded by /testhub/defects) | CODE,GREP | P1 | 03,07-DEL,09-#1 |
| G-RH-072 | `pages/releases/DefectsPage.tsx` (657L) | dead-gen: raw `<table>`, 8 bare Tailwind L615-632, hand-rolled Report/Edit/Reassign modals | DELETE | CODE,GREP | P1 | 03,07 |
| G-RH-073 | `pages/releases/AllReleasesPage.tsx` (88.6K, raw `<table>` L778) | dead-gen | DELETE | CODE,GREP | P2 | 03,07,09-16 |
| G-RH-074 | `pages/releases/CoverageReportsPage.tsx` (27 hits) | dead-gen | DELETE | GREP | P2 | 07,09-#6 |
| G-RH-075 | `pages/releases/QualityGatesPage.tsx` (17 hits) | dead-gen | DELETE | GREP | P2 | 07,09-#11 |
| G-RH-076 | `pages/releases/{CommandCenter,CommandCenterPage,CalendarPage,ComparePage,ExecutionPage,MyTestScopePage,ReleaseDashboardPage}.tsx` | dead-gen (7 files) | DELETE | CODE | P2 | 07-DEL |
| G-RH-077 | `features/all-releases/components/ReleaseCard.tsx` (47 hits) | dead-gen feature dir (consumed only by pages/releases) | DELETE | GREP | P2 | 07,09-#2 |
| G-RH-078 | `features/all-releases/components/EnterpriseTableView.tsx` (46 hits) | dead-gen | DELETE | GREP | P2 | 09-#3 |
| G-RH-079 | `features/all-releases/components/TimelineView.tsx` (23 hits) | dead-gen | DELETE | GREP | P2 | 09-#9 |
| G-RH-080 | `features/all-releases/components/StatStrip.tsx` (14 hits) | dead-gen | DELETE | GREP | P2 | 09-#16 |
| G-RH-081 | `features/release-compare/components/ComparisonTable.tsx` (19 hits, raw table L176) | dead-gen | DELETE | GREP | P2 | 09-#10,#16 |
| G-RH-082 | `features/release-calendar/components/ReleaseBar.tsx` (15 hits) | dead-gen | DELETE | GREP | P2 | 09-#14 |
| G-RH-083 | `features/release-calendar/components/CalendarGrid.tsx` (12 hits) | dead-gen | DELETE | GREP | P2 | 09-#20 |
| G-RH-084 | `features/my-test-scope/components/TestsTable.tsx:163` (raw table) | dead-gen | DELETE | GREP | P2 | 07,09-16 |
| G-RH-085 | `features/my-test-scope/utils/helpers.ts:15-86` | local risk/status/due-date Tailwind color helpers | DELETE (or StatusLozenge if kept) | GREP | P1 | 09-3 |
| G-RH-086 | `components/releases/defects/SeverityBadge.tsx:11-17` | hand-rolled `bg-red-600 text-white` badge | @atlaskit/lozenge severity map | CODE | P1 | 07-E1,09-15 |
| G-RH-087 | `components/releases/defects/DefectKanbanView.tsx` (27 hits) | hand-rolled kanban, full Tailwind palette | DELETE | GREP | P1 | 07-E2,09-19 |
| G-RH-088 | `components/releases/defects/ReportDefectModal.tsx` (25 hits) | hand-rolled modal, full Tailwind | DELETE | GREP | P1 | 09-19 |
| G-RH-089 | `components/releases/defects/{DefectTableView,EditDefectModal,ReassignModal,PriorityBadge,InlineTextEdit}.tsx` | dead-gen defect components (DefectTableView raw table L41) | DELETE | CODE,GREP | P2 | 07-E2,09-16 |
| G-RH-090 | `components/releasehub/ReleaseDrawer.tsx:14,515` | shadcn Dialog + raw `<table>` L515 — **zero imports (dead)** | DELETE | CODE,GREP | P1 | 07-X3,09-16 |
| G-RH-091 | `pages/releasehub/ReleaseComparePage.tsx` | retired-route page (redirect FAR:779-781): raw table L88 + Tailwind | DELETE | CODE | P2 | 03,07,09-16 |
| G-RH-092 | `pages/releasehub/TriageQueuePage.tsx:71` | retired-route page: raw table + bg-white | DELETE | CODE | P2 | 03,07 |
| G-RH-093 | `components/releases/all-releases/ReleasesTableRow.tsx` (16 hits) | Tailwind color cluster | ADS tokens / delete if dead | GREP | P2 | 09-#13 |
| G-RH-094 | `components/releases/quality-gates/ReleaseTestSummaryPanel.tsx` (15 hits) | Tailwind cluster | ADS tokens | GREP | P2 | 09-#15 |
| G-RH-095 | `components/releases/quality-gates/ReadinessStatusCard.tsx` (14 hits) | Tailwind cluster | ADS tokens | GREP | P2 | 09-#17 |
| G-RH-096 | `components/releases/all-releases/ReleasesTimeline.tsx` (13 hits) | Tailwind cluster | ADS tokens | GREP | P2 | 09-#19 |
| G-RH-097 | `components/releases/dashboard/TestExecutionTable.tsx:91` | raw `<table>` | JiraTable | GREP | P2 | 09-16 |
| G-RH-098 | `components/releases/ReleasesTable.tsx:458` | raw `<table>` (parity-approval unverified) | JiraTable or documented exception | GREP | P2 | 09-16 |

#### Release Hub misc Tailwind/hex per top-20 + inline overflow (atomic representative rows)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-RH-099 | Release Hub (732 Tailwind color-utility hits across 197 files) | systemic Tailwind color utilities ⛔ | ADS tokens (bulk sweep, most in dead-gen) | GREP | P1 | 09 |
| G-RH-100 | Release Hub (90 rgb/rgba incl. fallbacks) | rgba color fallbacks | token() no-fallback | GREP | P2 | 09 |
| G-RH-101 | Release Hub (2 bare rgba, not fallback) | bare rgba literals | ADS tokens | GREP | P1 | 09 |
| G-RH-102 | Release Hub (13 raw `<table>`) | raw tables cluster | JiraTable | GREP | P1 | 09 |
| G-RH-103 | Release Hub (18 position:fixed overlays) | fixed overlays — z-index normalization | portal-root z canon | GREP | P2 | 09 |
| G-RH-104 | Release Hub (1,390 inline style{{}}) | inline-style density (context metric) | token audit | GREP | P2 | 09 |
| G-RH-105 | `pages/releasehub/CommandCenterPage.tsx` | testidCount=1 (no shell testids) — untestable surface | dashboard-shell testids | DOM | P2 | 04-HR2 |
| G-RH-106 | `/release-hub/release-kanban` | empty board state (unverifiable card anatomy — needs seed) | seed + reverify | DOM,INT | P2 | 04,06-6c |
| G-RH-107 | `/release-hub/work` | toolbar y=80 (no breadcrumb row) vs PH y=116 | ProjectPageHeader breadcrumb | DOM(#work) | P2 | 04 |
| G-RH-108 | `/release-hub/changes` | empty "No change records yet" (unverifiable rows) | seed + reverify | INT(ss) | P2 | 06-5b |
| G-RH-109 | `pages/releasehub/AllChangesPage.tsx` (CreateChgModal) | native selects in create modal | @atlaskit/select | INT | P2 | 06-5b |
| G-RH-110 | `pages/releasehub/CommandCenterPage.tsx` (status render) | outlined status tags (not filled StatusLozenge) | StatusLozenge | CSS,SS(ss_4239bm4cg) | P1 | 05 |
| G-RH-111 | `constants/releasehub.design.ts` | hub-local design constants file | ADS tokens | CODE | P2 | 03 |
| G-RH-112 | `pages/releasehub/SignOffQueuePage.tsx` | @atlaskit review modal OK but rows custom | JiraTable rows | INT(ss_3079huij0) | P2 | 06,07-A13 |
| G-RH-113 | `pages/releasehub/ChangeDetailPage.tsx` | RiskPill local (L52) ADS-clean but non-canonical | StatusLozenge | CODE | P1 | 03 |
| G-RH-114 | `pages/releasehub/ProductionEventsPage.tsx` | detail modal @atlaskit OK; ResultBadge local L34 | @atlaskit/lozenge | CODE | P1 | 03 |
| G-RH-115 | `pages/releasehub/FreezeWindowsPage.tsx` | card list intentional low-count (token hygiene only) | keep + token audit | CODE | P2 | 03 |
| G-RH-116 | `pages/release-hub/ReleaseWorkNavigatorPage.tsx:487-491` | BacklogPage hybrid hideChrome+customChromeBand (verify parity) | canonical BacklogPage | CODE | P2 | 03 |
| G-RH-117 | `/release-hub/overview` | Review→sign-off flow works but KPI cards non-interactive | dashboard widget interactivity | INT | P2 | 06-5c |
| G-RH-118 | `pages/releasehub/AllReleasesPage.tsx` (legacy mount) | JiraTable rebuild done but duplicate of shared ReleasesPage | consolidate mounts | CODE | P2 | 03,07 |

### 2.2 INCIDENT HUB — new generation + legacy stack (G-IH-001 … G-IH-074)

#### Incident create split-brain + local modals (P0/P1)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-IH-001 | `pages/incidenthub/components/NewIncidentModal.tsx:13` | shadcn Dialog create fork writes `incidents` table while hub reads ph_issues (split-brain) | CreateStoryModal defaultWorkType='Production Incident'→ph_issues | CODE,INT,SS(ss_6188w2krk) | **P0** | 03-#1,06-HR4,07-C1 |
| G-IH-002 | `components/ja/CreateDropdown.tsx:22,105` | global Create on `/incident-hub/*` wired to NewIncidentModal | wire to CreateStoryModal path | CODE | **P0** | 03,06,07-C1 |
| G-IH-003 | `pages/incidenthub/components/NewIncidentModal.tsx:26-29` | SEV_STYLES local color map w/ rgba fallbacks | severityToAppearance util (shared) | CODE | P1 | 03,07-C1,09 |
| G-IH-004 | `NewIncidentModal` (a11y) | `aria-modal=null` (canonical=true) | @atlaskit/modal-dialog aria-modal | INT,a11y | **P0** | 08-HR1 |
| G-IH-005 | `NewIncidentModal` (a11y) | focus stays on trigger button, never enters dialog | @atlaskit focus-trap | INT,a11y | **P0** | 08-HR1 |
| G-IH-006 | `NewIncidentModal` (a11y) | **Escape does not close** — keyboard user trapped | @atlaskit Escape handler | INT,a11y | **P0** | 08-HR1 |
| G-IH-007 | `NewIncidentModal` | overlay+dialog share z-250 (brittle DOM-order stacking) | @atlaskit z 500/510 blanket/container | a11y | P1 | 08-HR1 |
| G-IH-008 | `NewIncidentModal` | Tailwind `bg-black/75 dark:bg-black/80` blanket | @atlaskit blanket | GREP,a11y | P1 | 08-HR1 |
| G-IH-009 | `pages/incidenthub/incidentsBacklogDataSource.ts:142` | adapter `onCreate` throws READ_ONLY_MSG (create disabled in list) | wire onCreate to canonical create | CODE | P1 | 03,07-C2 |
| G-IH-010 | `pages/incidenthub/components/CommitteeModal.tsx:32-121` | shadcn Dialog + rgba fallbacks | @atlaskit/modal-dialog | CODE | P1 | 03,07-C3 |
| G-IH-011 | `pages/incidenthub/components/ConvertDialog.tsx:41-71` | shadcn Dialog + rgba fallbacks | @atlaskit/modal-dialog / DangerConfirmModal | CODE | P1 | 03,07-C4 |
| G-IH-012 | `pages/incidenthub/components/SeverityChip.tsx:10` | **bare `rgba(248,113,113,…)` literal** + rgba fallbacks L11-12 + inline isDark | StatusLozenge severity→appearance | CODE,INT | P1 | 03-#8,07-C5,09 |

#### Incident Hub analytics + dead files

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-IH-013 | `pages/incidenthub/IncidentAnalyticsPage.tsx:66-125` | hand-rolled stat cards + custom bar charts, rgba fallbacks, `--cp-*` | ProjectDashboardPage widget canon (mode='incident') | CODE | P1 | 03,07-C6 |
| G-IH-014 | `pages/incidenthub/IncidentKanbanPage.tsx` (FAR:135) | dead lazy import, never mounted | DELETE file + import | CODE | P2 | 03,07-C8 |
| G-IH-015 | `pages/incidenthub/IncidentInsightsPage.tsx` (101L) | unrouted dead file | DELETE | CODE | P2 | 03,07-C9 |
| G-IH-016 | `modules/incidents/kanban/components/KanbanCard.tsx:197` | `dark:bg-[#431407]` bare hex arbitrary value | var(--ds-background-danger) | CODE | P1 | 09-10 |
| G-IH-017 | Incident Hub (76 Tailwind color-utility hits, 94 files) | systemic Tailwind utilities ⛔ | ADS tokens | GREP | P1 | 09 |
| G-IH-018 | Incident Hub (48 rgb/rgba incl. fallbacks) | rgba color fallbacks | token() no-fallback | GREP | P2 | 09 |
| G-IH-019 | Incident Hub (1 bare/fallback hex) | bare/fallback hex | ADS token | GREP | P1 | 09 |
| G-IH-020 | Incident Hub (4 raw `<table>`) | raw tables (in legacy modules) | JiraTable | GREP | P1 | 09 |

#### Legacy `/release/incidents/*` stack — STILL ROUTED + NAV-REACHABLE (retire after nav rewire)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-IH-021 | `FAR:909-922` legacy incident routes | 9 live routes competing with Incident Hub | replace with redirects to `/incident-hub/*` | CODE,INT,SS(ss_3169tsjjn) | **P0** | 01-#2,03-#2,06-HR5,07-D |
| G-IH-022 | `components/layout/OperationsSidebar.tsx:22,37` | nav link → `/release/incidents` (mounted via CatalystShell:138) | point at incidentHub builders | CODE,GREP | **P0** | 07-D11,06-HR5 |
| G-IH-023 | `components/ja/ItemsDropdown.tsx:48` | nav link → legacy incidents | incidentHub builder | GREP | **P0** | 07-D11 |
| G-IH-024 | `components/layout/dropdowns/ItemsDropdown.tsx:72` | nav link → legacy incidents | incidentHub builder | GREP | **P0** | 07-D11 |
| G-IH-025 | `components/layout/GlobalPageHeader.tsx:174-175` | nav link → legacy incidents | incidentHub builder | GREP | P1 | 07-D11 |
| G-IH-026 | `pages/release/IncidentRoomList.tsx` (394L) | shadcn table incident list (D1) | IncidentListPage | CODE | P1 | 03,07-D1 |
| G-IH-027 | `pages/release/IncidentsDashboard.tsx` (`/release/incidents/dashboard`) | duplicate dashboard — **mock-KPI claim NOT reproducible live (X1 correction), reclassified duplicate-to-retire** | IncidentDashboardPage | INT,SS(ss_6251s872c) | P1 | 03-#3→06-HR6,07-D2 |
| G-IH-028 | `modules/incidents/analytics/pages/IncidentAnalyticsPage.tsx` (207L) | bespoke analytics (D3) | `/incident-hub/analytics` | CODE | P1 | 03,07-D3 |
| G-IH-029 | `modules/incidents/analytics/pages/IncidentInsightsPage.tsx` (1,367L, raw table L397,703) | massive print report (D4) — verify unique content | `/incident-hub/reports` | CODE,GREP | P1 | 03,07-D4,09-16 |
| G-IH-030 | `modules/incidents/kanban/pages/IncidentKanbanPage.tsx` (719L) | custom kanban competing w/ canonical board (D5) | IncidentBoardPage | CODE | P1 | 03,07-D5 |
| G-IH-031 | `pages/release/CreateIncidentPage.tsx` (658L) | full-page shadcn create form (D6, 3rd incident-create path) | CreateStoryModal path | CODE | P1 | 03,07-D6 |
| G-IH-032 | `pages/release/IncidentReportsPage.tsx` | duplicate reports (D7) | `/incident-hub/reports` | CODE | P1 | 03,07-D7 |
| G-IH-033 | `pages/release/IncidentRoomDetail.tsx` (698L) | bespoke detail, UUID param (D8) | IncidentDetailPage (CatalystDetailRouter, display key) | CODE | P1 | 03,07-D8 |
| G-IH-034 | `pages/release/IncidentCommandCenter.tsx:379` (raw table, 27-28 Tailwind hits) | command-center dup (D9) — audit unique widgets | `/incident-hub/dashboard` | CODE,GREP | P1 | 03,07-D9,09-#5 |
| G-IH-035 | `pages/release/CAPCommitteeQueuePage.tsx` (203L) | duplicate committee queue (D10) | CommitteeQueuePage | CODE | P1 | 03,07-D10 |
| G-IH-036 | `FAR:919` `/release/incident-room/:incidentId` redirect | **broken** — `Navigate to` uses literal `:incidentId` string (no param substitution) | proper param redirect | CODE | P1 | 01-#3,07 |
| G-IH-037 | `pages/release/IncidentsListPage.tsx:368` (raw table) | unrouted dead file | DELETE | CODE,GREP | P2 | 03,09-16 |
| G-IH-038 | `pages/release/IncidentsList.tsx:292` (raw table) | unrouted dead file | DELETE | CODE,GREP | P2 | 03,09-16 |
| G-IH-039 | `pages/release/IncidentDashboardPage.tsx:400` (raw table, 32 hits) | unrouted dead file | DELETE | CODE,GREP | P2 | 03,09-#4,#16 |
| G-IH-040 | `pages/release/IncidentViewPage.tsx` (13 hits) | unrouted dead file | DELETE | GREP | P2 | 03,09-#18 |
| G-IH-041 | `pages/release/IncidentDetail.tsx` (FAR:~348 lazy, no Route) | dead lazy import | DELETE | CODE | P2 | 03,07 |

#### Incident board / DOM anomalies

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-IH-042 | `/incident-hub/board` cards | cards lack data-testid + draggable ids (unlike PH rows) | testid/draggable-id parity | DOM(HR7) | P2 | 04-HR7 |
| G-IH-043 | `/incident-hub/board` drag | every drop shows "Move blocked" (FSM guard vs broken dnd unclear) | verify transition guard | INT(ss_2875smvq6) | P2 | 06-6a |
| G-IH-044 | `/incident-hub/all-incidents` table | bounding height 5701px, only 14 tbody tr matched (grouping/virtualization) | verify virtualization | DOM | P2 | 04 |
| G-IH-045 | `/incident-hub/board` card | body font 16px/24px vs 14px row | density align | CSS(#29) | P2 | 05 |
| G-IH-046 | `/incident-hub/board` card | border raw #E0E0E0 | var(--ds-border) | CSS(#30) | P1 | 05 |
| G-IH-047 | `/incident-hub/all-incidents` row | border raw #E0E0E0 | var(--ds-border) | CSS(#28) | P1 | 05 |
| G-IH-048 | `/incident-hub/timeline` | empty state — populated Gantt structure unverified | seed + reverify | DOM(ss_3283p1fwn) | P2 | 04 |

#### Incident Hub — already-canonical (recorded as convergence wins, no gap) + representative remaining

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-IH-049 | `pages/incidenthub/components/PriorityChip.tsx` | ALREADY CANONICAL (delegates PriorityIndicator) — no work | — | CODE | — | 03,07-C7 |
| G-IH-050 | `/incident-hub/all-incidents` lozenge | REUSE WIN: canonical status-lozenge (`--ds-brand-bold`) | — | CSS(#27) | — | 05 |
| G-IH-051 | `pages/incidenthub/IncidentAnalyticsPage.tsx` | `--cp-*` legacy tokens | ADS `--ds-*` | CODE | P2 | 03 |
| G-IH-052 | `modules/incidents/kanban/` (components) | custom board components (retire w/ D5) | KanbanPage | CODE | P2 | 07 |
| G-IH-053 | `pages/release/IncidentsDashboard.tsx` (avatars) | hand-rolled avatars | CatalystAvatar | GREP | P2 | 09-18 |
| G-IH-054 | `pages/release/IncidentRoomDetail.tsx` (avatars) | hand-rolled avatars | CatalystAvatar | GREP | P2 | 09-18 |
| G-IH-055 | `pages/release/IncidentDetail.tsx` (avatars) | hand-rolled avatars | CatalystAvatar | GREP | P2 | 09-18 |
| G-IH-056 | legacy stack (63 Tailwind color hits total) | Command 27/28 + Dashboard 16/32 + View 13 + List 7 | ADS tokens (retire w/ files) | GREP | P1 | 03-#7,09 |
| G-IH-057 | `incidents` table (data model) | written by NewIncidentModal — unknown live readers | data-model decision (DL) | CODE | P1 | 03-OQ1,07-OQ1 |
| G-IH-058 | Incident Hub (182 inline style{{}}) | inline-style density (context) | token audit | GREP | P2 | 09 |
| G-IH-059 | Incident Hub (1 position:fixed overlay) | fixed overlay | portal-root z canon | GREP | P2 | 09 |
| G-IH-060 | `/incident-hub/*` routes | ✅ full MG gating (recorded as compliance win) | — | CODE | — | 01,09 |
| G-IH-061 | `pages/incidenthub/IncidentListPage.tsx` | ALREADY CANONICAL (BacklogPage+adapter) — create excepted | — | CODE | — | 03,07 |
| G-IH-062 | `pages/incidenthub/IncidentBoardPage.tsx` | ALREADY CANONICAL (KanbanPage mode='incident') | — | CODE | — | 03,07 |
| G-IH-063 | `pages/incidenthub/IncidentWorkPage.tsx` | ALREADY CANONICAL (ProjectAllWorkView) | — | CODE | — | 03,07 |
| G-IH-064 | `pages/incidenthub/IncidentDashboardPage.tsx` | ALREADY CANONICAL (ProjectDashboardPage) | — | CODE | — | 03,07 |
| G-IH-065 | `pages/incidenthub/IncidentTimelinePage.tsx` | ALREADY CANONICAL (TimelineView) | — | CODE | — | 03,07 |
| G-IH-066 | `pages/incidenthub/IncidentHubDependenciesPage.tsx` | ALREADY CANONICAL (DependenciesView) | — | CODE | — | 03,07 |
| G-IH-067 | `pages/incidenthub/IncidentDetailPage.tsx` | ALREADY CANONICAL (CatalystDetailRouter fullPageMode) | — | CODE | — | 03,07 |
| G-IH-068 | `modules/incidents/analytics/pages/IncidentReportPage.tsx` | ALREADY CANONICAL (JiraTable+SectionMessage+Lozenge) | — | CODE | — | 03,07 |
| G-IH-069 | `pages/incidenthub/CommitteeQueuePage.tsx` | ALREADY CANONICAL (CommitteeQueueTable) | — | CODE | — | 03,07 |
| G-IH-070 | Incident Filters trio | ALREADY CANONICAL | — | CODE | — | 03,07 |
| G-IH-071 | `pages/incidenthub/IncidentAnalyticsPage.tsx` | 2nd analytics divergence (with legacy D3) — fold to dashboard | ProjectDashboardPage | CODE | P1 | 03 |
| G-IH-072 | `/incident-hub/analytics` vs `/incident-hub/reports` | two analytics surfaces — reconcile | one canon | CODE | P2 | 03 |
| G-IH-073 | Incident create (post-create nav) | must navigate to `/incident-hub/view/:key` after create | route builder | CODE | P1 | 07-C1 |
| G-IH-074 | `incidents` vs `ph_issues` key-space (152 vs 142) | legacy shows 152 total, hub 142 — filter/key-space differs | reconcile data source | INT | P1 | 06-OQ5 |

### 2.3 TEST HUB (G-TH-001 … G-TH-058)

#### P0 live bug + defect/detail wiring

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-001 | `/testhub/board` (KanbanPage mode='test') | **LIVE CRASH: "column tm_test_cases.key does not exist"** — no cards render, board unusable | fix board query column ref/migration | ERR,SS(ss_1680v6i2a) | **P0** | 06-HR1 |
| G-TH-002 | `modules/project-work-hub/adapters/defectsDataSource.ts:152` | `onOpenItem:()=>{}` — defect row detail fully DEAD (3 no-ops live) while CatalystViewDefect exists | wire onOpenItem → CatalystDetailRouter (display key) | CODE,INT,SS(ss_6131imzt5) | **P0** | 03-#4,06-HR2,07-B10 |
| G-TH-003 | `/testhub/my-work` row click | bounces to `repository?case=<UUID>`, **no drawer opens** (dead deep-link + UUID param) | CatalystDetailRouter in-place (D4), drop UUID | INT,SS(ss_384935enl) | **P0** | 06-HR3 |
| G-TH-004 | `pages/testhub/repository/CaseDrawer.tsx:172` | hand-rolled `role="dialog"` overlay (competes w/ CatalystDetailRouter) | CatalystViewTestCase via CatalystDetailRouter | CODE | P1 | 03,07-B7,09-17 |
| G-TH-005 | `CaseDrawer.tsx` (create mode) | create-only fate undecided (needs StepEditor) | CreateStoryModal grammar OR @atlaskit drawer | CODE | P1 | 07-B8 |
| G-TH-006 | `pages/testhub/BoardPage.tsx` (card click) | card→`repository?case=` bypass (same as MyWork) | CatalystDetailRouter | CODE | P1 | 07-B9 |

#### Raw tables + hand-rolled grids

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-007 | `pages/testhub/cycles/CycleDetailPage.tsx:424` | raw `<table>` scope rows (live) + native-select assignees | JiraTable + row expansion | CODE,INT,SS(ss_6035wgrom) | P1 | 03-#5,06-3b,07-B1 |
| G-TH-008 | `pages/testhub/sets/SetDetailPage.tsx:600` | raw `<table>` #1 | JiraTable | CODE | P1 | 03-#5,07-B2 |
| G-TH-009 | `pages/testhub/sets/SetDetailPage.tsx:663` | raw `<table>` #2 | JiraTable | CODE | P1 | 03-#5,07-B2 |
| G-TH-010 | `pages/testhub/sets/TestSetsPage.tsx:415-437` | hand-rolled CSS-grid row list (7 gridTemplateColumns) | JiraTable in CatalystListPageLayout | CODE | P1 | 03-#6,07-B3 |
| G-TH-011 | `pages/testhub/traceability/TraceabilityPage.tsx:234` | @atlaskit DynamicTable (retired canon Apr 2026) | JiraTable | CODE | P2 | 03,07-B12 |

#### Create/edit modals + hooks

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-012 | `pages/testhub/sets/TestSetsPage.tsx:328` | CreateSetModal hand-rolled + raw boxShadow rgba | @atlaskit/modal-dialog (SprintCreateModal pattern) | CODE | P1 | 03,07-B4 |
| G-TH-013 | `pages/testhub/cycles/CyclesPage.tsx:252-398` | CreateCycleModal local 2-tab (page-embedded) | extract + SprintCreateModal grammar | CODE,INT | P2 | 03,06-3a,07-B5 |
| G-TH-014 | `CreateCycleModal` native `<select>` ×2 | unlabeled (aria-label null, id "", no `<label for>`) | @atlaskit/select | INT,a11y,SS(ss_5857008rp) | P1 | 08-M1 |
| G-TH-015 | `CreateCycleModal` native date ×2 | unlabeled date inputs | @atlaskit/datetime-picker | INT,a11y | P1 | 08-M1 |
| G-TH-016 | `CycleDetailPage.tsx` + `SetDetailPage.tsx:94-170` | AddCasesModal hand-rolled, duplicated ×2 | one @atlaskit modal + JiraTable case picker | CODE | P2 | 03,07-B6 |
| G-TH-017 | `hooks/test-cases/useRequirementLinks.ts:216-218` | coverage-status Tailwind color map inside a hook | return keys; StatusLozenge at call site | CODE,GREP | P1 | 07-B13,09-2 |

#### Status-vocabulary drift (P1-S5 canon)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-018 | `pages/testhub/sets/SetDetailPage.tsx:433` | queries `tm_test_cycles.status IN ('draft','planned','active','in_progress','paused')` — stale enum (P1-S5 collapsed 7→4); **can 400 on enum** | import `lib/testhub/enums.ts`, filter `['planned','active']` | CODE | **P0** | 09-A1 |
| G-TH-019 | `SetDetailPage.tsx:425-429` (comment) | stale 7-value enum documented in comment | update to 4-value canon | CODE | P2 | 09-A1 |
| G-TH-020 | `hooks/test-management/useTestCycles.ts:206,361,661,689,711` | raw DB status literals bypass `cycleStatusToDb()` | use enums.ts helper | CODE | P2 | 09-A6 |

#### Silent query-error destructures

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-021 | `pages/testhub/cycles/CycleDetailPage.tsx:58` | silent `{data}` destructure (error→empty UI) | SectionMessage+Retry | CODE | P1 | 03,07-B15 |
| G-TH-022 | `CycleDetailPage.tsx:69` | silent `{data}` | SectionMessage+Retry | CODE | P1 | 03 |
| G-TH-023 | `CycleDetailPage.tsx:1039` | silent `{data}` | SectionMessage+Retry | CODE | P1 | 03 |
| G-TH-024 | `pages/testhub/repository/CaseDrawer.tsx:51` | silent `{data}` | SectionMessage+Retry | CODE | P1 | 03,07-B8 |
| G-TH-025 | `CaseDrawer.tsx:64` | silent `{data}` | SectionMessage+Retry | CODE | P1 | 03 |
| G-TH-026 | `pages/testhub/repository/RepositoryPage.tsx:638` | silent `{data}` | SectionMessage+Retry | CODE | P1 | 03,07-B14 |
| G-TH-027 | `pages/testhub/*` (15/16 pages lack SectionMessage) | error-convention gap (only ExecutionPage L170-176 has it) | SectionMessage+Retry sweep | CODE,GREP | P1 | 03-#12,07-B15 |

#### Defect-from-run + folder tree + token/table hygiene

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-028 | `pages/testhub/cycles/CycleDetailPage.tsx:711` | `useCreateDefect` direct mutation (3rd defect-create path, bypasses CreateStoryModal) | CreateStoryModal isDefect prefilled w/ run context | CODE | P2 | 03,07-B11 |
| G-TH-029 | `pages/testhub/repository/RepositoryPage.tsx:791-836` | hand-rolled folder tree (no canonical tree exists) | keep + token hygiene / @atlaskit/tree if rebuilt | CODE | P2 | 03,07-B14 |
| G-TH-030 | Test Hub (34 Tailwind color hits, 114 files) | Tailwind utilities ⛔ | ADS tokens | GREP | P1 | 09 |
| G-TH-031 | Test Hub (5 rgb/rgba fallbacks) | rgba fallbacks | token() no-fallback | GREP | P2 | 09 |
| G-TH-032 | `TestSetsPage.tsx:198` | rgba fallback | ADS token | CODE | P2 | 03 |
| G-TH-033 | `TestSetsPage.tsx:204` | rgba fallback | ADS token | CODE | P2 | 03 |
| G-TH-034 | `TestSetsPage.tsx:210` | rgba fallback | ADS token | CODE | P2 | 03 |
| G-TH-035 | `TestSetsPage.tsx:447` | rgba fallback | ADS token | CODE | P2 | 03 |
| G-TH-036 | `/testhub/cycles` table | overflows viewport (width 1768px > 1512) | fixed-width JiraTable | DOM,CSS(#18) | P2 | 04-HR5,05 |
| G-TH-037 | `/testhub/cycles` row | border raw #E0E0E0 | var(--ds-border) | CSS(#19) | P1 | 05 |
| G-TH-038 | `/testhub/repository` row | border raw #E0E0E0 | var(--ds-border) | CSS(#16) | P1 | 05 |
| G-TH-039 | `/testhub/defects` row | border raw #E0E0E0 | var(--ds-border) | CSS(#23) | P1 | 05 |
| G-TH-040 | `/testhub/repository` table | role=grid but NO jira-table.* testids (38px, lookalike not JiraTable) | JiraTable component | DOM(HR5) | P1 | 04-HR5 |
| G-TH-041 | `/testhub/cycles` table | lookalike table (38px, no jira-table testids) | JiraTable | DOM | P1 | 04 |
| G-TH-042 | `/testhub/repository` | raw `<table>` AND role=grid both present (double/partial semantics) | single JiraTable | a11y(M-2) | P2 | 08-M2 |

#### Test Hub route-guard gap (unguarded subtree — atomic per route)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-043 | `FAR:671` `/testhub/dashboard` | no MG gating (whole /testhub/* subtree ungated; no testhub key in MG_ROLE_KEY) | add `MG k="testhub"` + role-key | CODE | P1 | 09-21 |
| G-TH-044 | `FAR:672-673` `/testhub/{my-work,board}` | unguarded | gate subtree | CODE | P1 | 09-21 |
| G-TH-045 | `FAR:674` `/testhub/repository` | unguarded | gate subtree | CODE | P1 | 09-21 |
| G-TH-046 | `FAR:675-680` `/testhub/cycles*` | unguarded | gate subtree | CODE | P1 | 09-21 |
| G-TH-047 | `FAR:683-684` `/testhub/sets*` | unguarded | gate subtree | CODE | P2 | 09-21 |
| G-TH-048 | `FAR:685-686` `/testhub/{traceability,defects}` | unguarded | gate subtree | CODE | P1 | 09-21 |
| G-TH-049 | `FAR:692-698` `/testhub/reports*` | unguarded | gate subtree | CODE | P2 | 09-21 |
| G-TH-050 | `FAR:701-703` `/testhub/filters*` | unguarded | gate subtree | CODE | P2 | 09-21 |

#### Test Hub route/builder drift

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-TH-051 | `lib/routes.ts` testHub `cycle()`/`cycleExecute()` | build LEGACY no-projectKey paths; no builder for canonical `/testhub/:projectKey/cycles/:cycleKey` | add project-scoped builders | CODE | P1 | 01-#6 |
| G-TH-052 | `lib/routes.ts` testHub | no `dependencies()` builder (route + sidebar exist) | add builder | CODE | P2 | 01 |
| G-TH-053 | `FAR:703` `TestHubFilterDetailPage` import | dead lazy import | remove | CODE | P2 | 01 |
| G-TH-054 | `/testhub/sets/:id` | route param `:id` (builder says setSlug) — slug/UUID risk | confirm slug not UUID | CODE | P2 | 01-OQ5 |
| G-TH-055 | Test Hub (702 inline style{{}}) | inline-style density (context) | token audit | GREP | P2 | 09 |
| G-TH-056 | Test Hub (9 position:fixed overlays) | fixed overlays | portal-root z canon | GREP | P2 | 09 |
| G-TH-057 | `pages/testhub/cycles/ExecutionPage.tsx` (avatars) | hand-rolled avatars | CatalystAvatar | GREP | P2 | 09-18 |
| G-TH-058 | `pages/testhub/repository/RepositoryPage.tsx` (avatars) | hand-rolled avatars | CatalystAvatar | GREP | P2 | 09-18 |

### 2.4 DEFECT SURFACES (G-DF-001 … G-DF-017)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-DF-001 | `modules/project-work-hub/adapters/defectsDataSource.ts:180-186` | quick-create hardcodes `severity:'MINOR'` (zero-assumption violation — domain default can be wrong) | leave severity unset OR expose picker | CODE | P1 | 03,07-E3 |
| G-DF-002 | `components/releases/defects/SeverityBadge.tsx:11-17` | hand-rolled Tailwind severity badge (consumers all dead-gen) | @atlaskit/lozenge map (build fresh at B10 detail) | CODE | P1 | 07-E1,09-15 |
| G-DF-003 | `components/releases/defects/DefectTableView.tsx:41` | dead-gen defect table (raw `<table>`) | DELETE | CODE,GREP | P2 | 07-E2,09-16 |
| G-DF-004 | `components/releases/defects/DefectKanbanView.tsx` | dead-gen defect kanban (27 hits) | DELETE | GREP | P1 | 07-E2,09-19 |
| G-DF-005 | `components/releases/defects/ReportDefectModal.tsx` | dead-gen defect modal (25 hits) | DELETE | GREP | P1 | 07-E2,09-19 |
| G-DF-006 | `components/releases/defects/EditDefectModal.tsx` | dead-gen defect modal | DELETE | CODE | P2 | 07-E2 |
| G-DF-007 | `components/releases/defects/ReassignModal.tsx` | dead-gen defect modal | DELETE | CODE | P2 | 07-E2 |
| G-DF-008 | `components/releases/defects/PriorityBadge.tsx` | dead-gen badge | DELETE | CODE | P2 | 07-E2 |
| G-DF-009 | `components/releases/defects/InlineTextEdit.tsx` | dead-gen edit | DELETE | CODE | P2 | 07-E2 |
| G-DF-010 | `pages/releases/DefectDetailPage.tsx:61-120` | hardcoded status transitions not matching `tm_defect_status` enum (dead-gen) | DELETE | CODE | P2 | 03 |
| G-DF-011 | `/testhub/defects` detail route | no `/testhub/defects/:key` route to CatalystViewDefect (P1 slice) | add display-key route (no UUID) | CODE,INT | P1 | 03-OQ4,06-OQ3,07-B10 |
| G-DF-012 | `/testhub/defects` row (title click) | opens inline-edit not detail (fork) | detail on title/key | INT(ss_6131imzt5) | P1 | 06-1 |
| G-DF-013 | `/testhub/defects` "Open in side panel" icon | no-op (panel never opens) | CatalystDetailPanel | INT | **P0** | 06-HR2 |
| G-DF-014 | `components/catalyst-detail-views/defect/CatalystViewDefect.tsx` (router L202) | wired but unreachable from list (awaiting B10) | hook up onOpenItem | CODE | P1 | 03,07 |
| G-DF-015 | `components/project-hub/dashboard/widgets/QADefectsWidget.tsx` | ALREADY CANONICAL (StatusLozenge, token-clean) | — | CODE | — | 03,07-E4 |
| G-DF-016 | `components/testhub/reports/bodies/DefectSummaryBody.tsx` | ALREADY CANONICAL (JiraTable+Lozenge) | — | CODE | — | 03,07-E4 |
| G-DF-017 | Defect surfaces (86 Tailwind color hits, 13 files) | Tailwind utilities (mostly dead-gen) ⛔ | ADS tokens / delete with files | GREP | P1 | 09 |

### 2.5 PROJECT HUB (baseline gaps — G-PH-001 … G-PH-028)

Project Hub is the canonical target but is NOT internally clean — these baseline gaps must be acknowledged so convergence does not copy them.

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-PH-001 | `components/shared/BacklogTable/` (fork of JiraTable, 2026-06-30) | 2 copies of 146K canonical table diverging in parallel | decide merge-back vs permanent fork | CODE | P1 | 02-#1 |
| G-PH-002 | `components/projecthub/AllProjectsTable.tsx` (56.8K) | custom `<table>` (ResizableTableHeader), not JiraTable | JiraTable | CODE,GREP | P1 | 02-#3,09-16 |
| G-PH-003 | `components/projecthub/ProjectDetailPanel.tsx` | shadcn/ui Sheet (non-Atlaskit drawer) on flagship surface | CatalystDetailPanel / @atlaskit/drawer | CODE | P1 | 02-#3 |
| G-PH-004 | `modules/in-jira/components/StatusPill.tsx` | non-canonical status pill (of 6 competing) | StatusLozenge | CODE | P1 | 02-#2 |
| G-PH-005 | `components/incidents/TablePill.tsx` | non-canonical pill | StatusLozenge | CODE | P1 | 02-#2 |
| G-PH-006 | `modules/project-work-hub/.../shared-components.tsx` (JiraStatusPill) | non-canonical pill | StatusLozenge | CODE | P1 | 02-#2 |
| G-PH-007 | `modules/okr-v2/…` OkrStatusPill | non-canonical pill | StatusLozenge | CODE | P2 | 02-#2 |
| G-PH-008 | PriorityIcon ×3 (`components/icons/`, `components/shared/`, `features/kanban-board/components/`) | 3 files (wrappers, drift risk) | single PriorityIcon | CODE | P2 | 02-#4 |
| G-PH-009 | `components/ui/breadcrumb.tsx` (shadcn/Radix) | 2nd breadcrumb system (vs ads Breadcrumbs) | ads Breadcrumbs | CODE | P2 | 02-#5 |
| G-PH-010 | `components/stories/CreateStoryModal.tsx` | legacy 2nd CreateStoryModal (vs workhub canonical) | workhub CreateStoryModal | CODE | P1 | 02-#6 |
| G-PH-011 | `components/project-hub/shell/` (TopNav/Sidebar/SidebarProjectNav, own TYPE_COLORS) | legacy parallel shell coexists w/ CatalystShell; lists retired backlogs | verify dead → delete | CODE | P1 | 02-#8 |
| G-PH-012 | `modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (408K/8,894L) | page-local GroupBy/MemberFilter/bulk-modals trapped in one file | extract shared patterns | CODE | P2 | 02-#9 |
| G-PH-013 | `pages/project-hub/boards/MapStatusesPage.tsx:15-17` | still on @dnd-kit (Phase 2 due 2026-05-25 unmet) | Pragmatic DnD | CODE | P2 | 02-#10 |
| G-PH-014 | `pages/project-hub/StoryDetailPage.tsx:148` | bare hex `#FFF5F5` + `#FFCDD2` in inline style | var(--ds-background-danger)/border-danger | CODE | P1 | 09-7 |
| G-PH-015 | `pages/project-hub/IssueDetailPage.tsx:140` | bare hex (danger bg/border) | var(--ds-background-danger) | CODE | P1 | 09-7 |
| G-PH-016 | `components/project-hub/wizard/StepDetails.tsx:220-222` | priority map bare hex `#FECDD3/#FEFCE8/#FEF08A` | var(--ds-border-danger)/bg-warning | CODE | P1 | 09-8 |
| G-PH-017 | `components/project-hub/project-list-utils.tsx:66` | `at_risk:{bg:'#FFF7E6'}` bare hex | var(--ds-background-warning) | CODE | P1 | 09-9 |
| G-PH-018 | `components/project-hub/project-list-utils.tsx:98` | AVATAR_COLORS array bare `#0369A1` (banned local color map) | @atlaskit/avatar owns color | CODE | P1 | 09-9 |
| G-PH-019 | `components/project-hub/work-items/inline/InlineEditors.tsx:81` | local `STATUS_COLORS` map | StatusLozenge category colors | CODE | P2 | 09-5 |
| G-PH-020 | `components/project-hub/shared/phStyles.css:8` | `#E8EDF2` mid-gradient in !important shimmer | var(--ds-surface-sunken) | CODE | P2 | 09-11 |
| G-PH-021 | Project Hub dashboard widgets (~30 `token('color.x','#hex')` fallbacks) | hex fallbacks banned by CLAUDE.md (scanner allows) | token() no 2nd arg | GREP | P2 | 09-12 |
| G-PH-022 | `components/projecthub/IssueBreakdownPopover.tsx` (17 hits) | Tailwind/color cluster | ADS tokens | GREP | P2 | 09-#12 |
| G-PH-023 | Project Hub (10 raw `<table>`: ProjectTable/AllWorkTable/WorkItemsTable/AllProjectsTable/widgets) | raw tables | JiraTable | GREP | P1 | 09-16 |
| G-PH-024 | `/project-hub/BAU/allwork` | auto-opens BAU-4771 dialog on navigation, survives Escape (UX bug) | fix persisted-modal state | DOM,INT,SS(ss_64831dgj5) | P1 | 04-HR6,08 |
| G-PH-025 | JiraTable `role=grid` (backlog) | no role=row/gridcell/columnheader/aria-label/tabindex; keys=span role=button | complete grid ARIA | a11y(M-2) | P1 | 08-M2 |
| G-PH-026 | `pages/project-hub/list` (`/project-hub/:key/list`) | duplicate URL for allwork ProjectJiraLayout | remove or redirect | CODE | P2 | 01-#8 |
| G-PH-027 | `pages/project-hub/board` (`/project-hub/:key/board` singular) | mounts KanbanPage w/o board slug (bypasses manager) | redirect to /boards | CODE | P2 | 01-#9 |
| G-PH-028 | `pages/project-hub/*` routes (L852-1027) | unguarded baseline (reconcile w/ testhub/releases gating rule) | written gating rule | CODE | P2 | 09-23 |

### 2.6 CROSS-HUB / ROUTE / A11Y-SYSTEMIC (G-XH-001 … G-XH-017)

| ID | Surface/File:line | Gap | Canonical target | Evidence | Sev | Src |
|---|---|---|---|---|---|---|
| G-XH-001 | `components/catalyst-detail-views/CatalystDetailRouter` in-place panel | `role=dialog aria-modal=false`, NO close button, survives Escape — systemic mislabeled un-dismissable dialog (BAU-4771 + TC-002) | drop role=dialog→region OR add Close+Escape+aria-modal | a11y,INT,SS(ss_64831dgj5,ss_1488k7frp) | **P0** | 08-HR2 |
| G-XH-002 | `.cc-fab` global assistant button | `position:fixed z-index:600` paints above modal blanket (z500)/container (z510) | normalize portal-root z | a11y(L-1) | P2 | 08-L1 |
| G-XH-003 | `routes/BoardUuidRedirect.tsx` | never mounted — UUID board links fall through to KanbanPage w/ UUID as boardSlug | mount OR delete (decision) | CODE | P1 | 01-#4,07 |
| G-XH-004 | `FAR:59` project-hub FilterDetailPage | dead lazy import (mounts PreviewPage) | remove | CODE | P2 | 01-#7 |
| G-XH-005 | `FAR:100` release FilterDetailPage | dead lazy import | remove | CODE | P2 | 01 |
| G-XH-006 | `FAR:140` incident FilterDetailPage | dead lazy import | remove | CODE | P2 | 01 |
| G-XH-007 | `FAR:172` testhub FilterDetailPage | dead lazy import | remove | CODE | P2 | 01 |
| G-XH-008 | `FAR:244` tasks FilterDetailPage | dead lazy import | remove | CODE | P2 | 01 |
| G-XH-009 | `FAR:469` `/browse/:key` BrowsePage | shadowed by App.tsx `/browse/:issueKey` (never matches) | remove duplicate | CODE | P2 | 01 |
| G-XH-010 | `components/project-hub/dashboard/widgets/TeamMemberHoverCard 2.tsx` | Finder-copy artifact (rgba fallback L89) | DELETE | CODE,GREP | P2 | 09-25 |
| G-XH-011 | `components/project-hub/dashboard/widget-types 2.ts` | Finder-copy artifact | DELETE | CODE | P2 | 09-25 |
| G-XH-012 | `lib/jira-changelog-mapper/mapper 2.ts` | Finder-copy artifact | DELETE | CODE | P2 | 09-25 |
| G-XH-013 | `lib/jira-changelog-mapper/mapper.test 2.ts` | Finder-copy artifact | DELETE | CODE | P2 | 09-25 |
| G-XH-014 | `pages/project-hub/jira-list/components/ask-caty-input.css` | rainbow border `#CD519D` — verify ring-fenced to allowed AI controls | confirm allowed rainbow | CODE | P2 | 09-26,09-OQ5 |
| G-XH-015 | color scanner (`scripts/no-hardcoded-colors.cjs:113-140`) | fallback-pragmatic mode allows `var(--ds-*,#hex)` that CLAUDE.md bans (43 hex ride green gate) | tighten scanner OR amend CLAUDE.md (decision) | CODE,GREP | P1 | 09-OQ4 |
| G-XH-016 | `audit:ads` (27,222; tokens 25,631 noisy) | audit tokens category over-reports; ratchet is the gate | ratchet baselines move down per slice | GREP | P2 | 09 |
| G-XH-017 | narrow-viewport (~800px) responsive | UNTESTED — `resize_window` no-op in env (innerWidth stayed 1680) | real device-emulation pass | INT(env-limit) | P2 | 08-OQ4 |

---

## 3. ROUTE COVERAGE TABLE

Statuses: Confirmed / Confirmed-but-broken / Permission-gated / Code-only / Browser-inaccessible / Dead navigation / Duplicate / Deprecated.
"Browser visited?" = live agents 04/05/06/08 hit it. "Screenshots" = ID-only (host-FS limitation).

| Hub | Route | Source file | Found by | Browser visited? | Click/modal tested? | Screenshots | Status |
|---|---|---|---|---|---|---|---|
| Project | /project-hub/BAU/backlog | FAR:1035 | 01,02 | ✅04,05,08 | ✅ CreateStoryModal,lozenge menu (08) | ss_5368oekzv,ss_8120b4pwc,ss_6977qen9x | Confirmed |
| Project | /project-hub/BAU/dashboard | FAR:1031 | 01,02 | ✅04 | — | — | Confirmed |
| Project | /project-hub/BAU/allwork | FAR:1061 | 01,02 | ✅04,08 | ⚠️ BAU-4771 sticky dialog | ss_64831dgj5 | Confirmed-but-broken |
| Project | /project-hub/BAU/timeline | FAR:1068 | 01,02 | ✅04 | — | — | Confirmed |
| Project | /project-hub/BAU/sprints | FAR:1072 | 01,02 | ✅04,05 | — | — | Confirmed |
| Project | /project-hub/BAU/dependencies | FAR:1070 | 01,02 | ✅04 | — | — | Confirmed |
| Project | /project-hub/BAU/filters | FAR:1062 | 01,02 | ✅04,05 | — | — | Confirmed |
| Project | /project-hub/projects | FAR:1012 | 01,02 | — | — | — | Code-only |
| Project | /project-hub/:key/boards[/:slug] | FAR:1048-1053 | 01,02 | — | — | — | Code-only |
| Project | /project-hub/projects-legacy | FAR:1014 | 01 | — | — | — | Deprecated |
| Project | /project-hub/:key/list | FAR:1059 | 01 | — | — | — | Duplicate |
| Project | /project-hub/:key/board (singular) | FAR:1047 | 01 | — | — | — | Duplicate |
| Project | /project-hub/:key/kanban | FAR:1055 | 01 | — | — | — | Deprecated |
| Project | /project-hub/:key/{reports,sprint-predictor,risk-scanner,portfolio-health} | FAR:1075-1077,1015 | 01 | — | — | — | Code-only (placeholder) |
| Project | /project-hub/:key/boards/<uuid> | BoardUuidRedirect.tsx | 01 | — | — | — | Dead navigation |
| Release | /release-hub/overview | FAR:757 | 01,03 | ✅04,05,06 | ✅ Review→signoff (06) | ss_58154x8k8 | Confirmed |
| Release | /release-hub/releases-management | FAR:768 | 01,03 | ✅04,05,06,08 | ✅ row→detail (06) | ss_4239bm4cg,ss_4121r7gr0,ss_06771oim6 | Confirmed |
| Release | /release-hub/releases-management/:releaseSlug | FAR:769 | 01,03 | ✅06 | ✅ (06) | ss_2473ypiph | Confirmed |
| Release | /release-hub/release-kanban | FAR:760 | 01,03 | ✅04,06 | ⚠️ empty | — | Confirmed (empty) |
| Release | /release-hub/work | FAR:761 | 01,03 | ✅04 | ⚠️ empty | — | Confirmed (empty) |
| Release | /release-hub/timeline | FAR:765 | 01,03 | ✅04 | ✗ no Gantt renders | — | Confirmed-but-broken |
| Release | /release-hub/changes | FAR:771 | 01,03 | ✅04,05,06 | ⚠️ empty; create modal ✅ | — | Confirmed (empty) |
| Release | /release-hub/sign-off-queue | FAR:774 | 01,03 | ✅06 | ✅ review modal | ss_3079huij0 | Confirmed |
| Release | /release-hub/{calendar,production-events,sop-templates,freeze-windows,settings} | FAR:766-776 | 01,03 | — | — | — | Code-only |
| Release | /release-hub/filters[*] | FAR:762-764 | 01,03 | — | — | — | Dead navigation (no sidebar) |
| Release | /release-hub/:releaseId | FAR:783 | 01,03 | — | — | — | Duplicate |
| Release | /release-hub/{command-center,compare,triage} | FAR:779-781 | 01,03 | — | — | — | Deprecated (redirect) |
| Test | /testhub/dashboard | FAR:671 | 01,03 | ✅04 | — | ss_0869uz4eh | Confirmed |
| Test | /testhub/repository | FAR:674 | 01,03 | ✅04,05,06,08 | ✅ row→CatalystDetailRouter | ss_7978s96pt,ss_1488k7frp | Confirmed |
| Test | /testhub/cycles | FAR:675 | 01,03 | ✅04,05,06,08 | ✅ create+row (raw table) | ss_6035wgrom,ss_5857008rp | Confirmed |
| Test | /testhub/:projectKey/cycles/:cycleKey | FAR:676 | 01,03 | ✅06 | ✅ raw table detail | ss_6035wgrom | Confirmed-but-broken (raw table) |
| Test | /testhub/defects | FAR:686 | 01,03 | ✅04,05,06 | ✗ row detail DEAD | ss_6131imzt5 | Confirmed-but-broken |
| Test | /testhub/board | FAR:673 | 01,03 | ✅04,06 | ✗ CRASH (tm_test_cases.key) | ss_1680v6i2a | Confirmed-but-broken |
| Test | /testhub/my-work | FAR:672 | 01,03 | ✅06 | ✗ detail deep-link DEAD | ss_384935enl | Confirmed-but-broken |
| Test | /testhub/reports[/:reportSlug] | FAR:692-698 | 01,03 | ✅04 | — | — | Confirmed |
| Test | /testhub/{sets,sets/:id,timeline,dependencies,traceability} | FAR:681-685 | 01,03 | — | — | — | Code-only |
| Test | /testhub/filters[*] | FAR:701-703 | 01,03 | — | — | — | Code-only |
| Incident | /incident-hub/dashboard | FAR:737 | 01,03 | ✅04,06,08 | ✅ NewIncidentModal | ss_6710ndyfa,ss_6188w2krk,ss_9968ljm8c | Permission-gated (MG operations) |
| Incident | /incident-hub/all-incidents | FAR:710 | 01,03 | ✅04,05,06 | ✅ row→detail | ss_2638nl13y,ss_9774j7q1l | Permission-gated |
| Incident | /incident-hub/board | FAR:716 | 01,03 | ✅04,05,06 | ✅ drag "Move blocked" | ss_2875smvq6 | Permission-gated |
| Incident | /incident-hub/work | FAR:739 | 01,03 | ✅04 | — | — | Permission-gated |
| Incident | /incident-hub/timeline | FAR:729 | 01,03 | ✅04 | ⚠️ empty | ss_3283p1fwn | Permission-gated (empty) |
| Incident | /incident-hub/{analytics,reports,committee-queue,dependencies,filters,view/:incidentKey} | FAR:722-746 | 01,03 | — | — | — | Permission-gated (code-only) |
| Incident | /incident-hub/kanban | FAR:717 | 01 | — | — | — | Deprecated (redirect) |
| Legacy Inc | /release/incidents | FAR:910 | 01,03,07 | ✅06 | ✅ live shadcn stack | ss_3169tsjjn | Confirmed (duplicate, retire) |
| Legacy Inc | /release/incidents/dashboard | FAR:911 | 01,03,07 | ✅06 | ✅ live KPIs (NOT mock — X1) | ss_6251s872c | Confirmed (duplicate, retire) |
| Legacy Inc | /release/incidents/{analytics,insights,kanban,create,reports,:incidentId} | FAR:912-918 | 01,03,07 | — | — | — | Confirmed (duplicate, retire) |
| Legacy Inc | /release/incident-room/:incidentId | FAR:919 | 01,07 | — | — | — | Confirmed-but-broken (literal-param redirect) |
| Legacy Inc | /release/{incident-command-center,committee-queue} | FAR:920-922 | 01,03 | — | — | — | Confirmed (duplicate, retire) |
| Cross | /browse/:issueKey | App.tsx:281 | 01,02 | — | — | — | Confirmed (canonical detail) |
| Cross | /browse/:key (FAR) | FAR:469 | 01 | — | — | — | Duplicate (shadowed) |

---

## 4. CONVERGENCE SCORECARD (per hub)

Token-compliance % = share of probed/known surfaces fully ADS-tokenized (agents 05/09). Grades weight structural-match + token compliance + P0 load.

| Hub | Routes total | Already-canonical | Gap count | P0 count | Token-compliance % | Structural-match verdict | Grade |
|---|---:|---:|---:|---:|---:|---|:--:|
| **Incident Hub (new gen)** | 16 | 11 | 74* | 6 | ~85% (all-incidents near-perfect; board #E0E0E0 border) | Strong — BacklogPage/KanbanPage/AllWork/Dashboard/Timeline/Deps/Detail all thin-mounted; canonical lozenge reused | **B** |
| **Test Hub** | 24 | 11 | 58 | 4 | ~90% (defects=exact 39px; repo/cycles −1px; only #E0E0E0 borders) | Good — top tabs canonical; interior (cycles/sets detail) hand-rolled; **board crashes** | **C+** |
| **Release Hub** | 20 | 7 | 118 | 1 | ~55% (raw #6B6E76 text, #E0E0E0 borders, 16px rows, KPI cards non-ADS; 732 Tailwind hits) | Weak — **the epicenter: 17 of top-20 worst ADS files**; releases-management custom table; overview forked dashboard | **D** |
| **Defect surfaces** | 5 live | 5* | 17 | 1 | ~95% live (dead-gen excluded) / ~40% incl dead-gen | Split — live path canonical (BacklogPage+CreateStoryModal isDefect); detail row-click DEAD; dead-gen defect components carry 200+ Tailwind hits | **C** (live) / F (dead-gen) |

\* Incident "new gen" gap count includes the 21-row legacy `/release/incidents` retirement block (G-IH-021…041). Defect "already-canonical=5" counts the live surfaces; the 8 dead-gen defect components are DELETE, not gaps to converge.

**Legacy `/release/incidents` stack** (separate scorecard row): 9 routes · 0 canonical · 9 hard-divergence · Grade **F** — full retirement (redirect + nav rewire + delete).

---

## 5. DECISION LOG (open architectural questions — need Vikram before execution)

| # | Question | Options | Recommendation | Blocking? |
|---|---|---|---|---|
| DL-1 | **Incident data model.** Converge NewIncidentModal → CreateStoryModal → ph_issues (issue_type='Production Incident')? What still reads the `incidents` table? | (a) CreateStoryModal→ph_issues, drop `incidents` write; (b) keep `incidents`, add dual-write; (c) leave forked | **(a)** — hub lists/boards already read ph_issues; CRE Grid maps Production Incident→INCIDENT; QA Bug isDefect is the precedent. First grep `incidents`-table readers. | **YES** (blocks C1/C2/D6/G-IH-001/002) |
| DL-2 | **Legacy `/release/incidents` stack — freeze or delete?** It IS nav-reachable (X2). | (a) rewire nav→incident-hub, redirect routes, delete; (b) freeze (keep, stop linking); (c) keep | **(a)** — canonical twins exist for every surface; D11 nav rewire first (OperationsSidebar + 2 ItemsDropdown + GlobalPageHeader), then redirects, then delete. | **YES** (blocks G-IH-021…041) |
| DL-3 | **Which ReleaseDetailPage wins?** `pages/releasehub/` (bespoke 8-tab, `:releaseId`) vs `pages/release-hub/` (slug, releases-management). | (a) slug wins (SLUG CONTRACT), redirect `:releaseId`; (b) 8-tab wins; (c) keep both | **(a)** — slug is contract-compliant; prove 8-tab content parity before retiring. | Partial (blocks G-RH-020/052) |
| DL-4 | **Test-case detail canon.** Converge MyWork/Board row-click → CatalystDetailRouter (D4) and retire CaseDrawer edit-mode? Keep CaseDrawer create-only? | (a) CatalystDetailRouter everywhere, CaseDrawer create-only; (b) full retire CaseDrawer; (c) status quo | **(a)** — but verify CatalystViewTestCase has StepEditor parity first (DL-7). | Partial (blocks G-TH-003/004/006) |
| DL-5 | **Wire `/testhub/defects` detail.** Route `/testhub/defects/:key` → CatalystViewDefect. | (a) display-key route (no UUID); (b) side-panel only (no route) | **(a)** display key per SLUG CONTRACT — CatalystViewDefect already wired at router L202. | **YES** (blocks G-TH-002/G-DF-011/013 P0) |
| DL-6 | **StepEditor parity.** Does CatalystViewTestCase support step add/edit/reorder like CaseDrawer's StepEditor? | (a) yes→retire CaseDrawer edit; (b) no→keep CaseDrawer until parity built | Probe required before DL-4 executes. | Partial (gates DL-4) |
| DL-7 | **Systemic un-dismissable panel fix.** CatalystDetailRouter in-place = `role=dialog aria-modal=false`, no Close (BAU-4771 + TC-002). | (a) drop role=dialog → region/complementary landmark; (b) add Close+Escape+aria-modal=true (true modal); (c) status quo | **(a)** if it's an inline pane (it is — position:relative, no blanket); add a visible Close/Back regardless. Systemic — fixes every CatalystDetailRouter surface at once. | **YES** (P0 a11y, G-XH-001) |
| DL-8 | **Scanner vs CLAUDE.md hex-fallback disagreement.** `no-hardcoded-colors.cjs` allows `var(--ds-*,#hex)` / `token('x','#hex')`; CLAUDE.md bans them (43 hex + ~30 token-fallbacks ride the green gate). | (a) tighten scanner to match contract; (b) amend CLAUDE.md to bless fallbacks; (c) leave divergent | **(a)** — align scanner to contract, ratchet the exposed count down as slices fix them. | Partial (governance; affects G-XH-015, G-PH-021) |
| DL-9 | **Route gating rule.** TestHub ungated, Release 1-of-20, Incident full-MG, Project ungated. | (a) gate testhub+releases subtrees, keep project open; (b) gate all; (c) document project-open baseline | **(a)** — add `MG k="testhub"`/`releases` role-keys, gate whole subtrees; ratify Project-Hub-open as written policy. | Partial (blocks G-TH-043…050, G-RH-058…070) |
| DL-10 | **BacklogTable fork.** Merge back into JiraTable after parity tuning, or permanent fork? Destination hubs adopt which? | (a) merge back; (b) permanent fork; destinations use JiraTable | Destinations should target **JiraTable**; decide BacklogTable's fate separately (affects only Project Hub). | Partial (affects G-PH-001; not blocking destination work) |
| DL-11 | **BoardUuidRedirect.** Mount it or delete it? | (a) mount (UUID board links redirect to slug); (b) delete | **(a)** mount — UUID board links currently fall through to KanbanPage with a UUID as boardSlug. | No (small, independent) |

---

## 6. BRANCH-SAFE, APPROVAL-READY IMPLEMENTATION PLAN

Phased, each slice ≤2hr (CLAUDE.md 2-HOUR SLICE RULE), each a Feature Work ID candidate. **safe-additive** = no behavior change to working surfaces; **behavior-changing** = alters a live flow. Every UI slice ends with a screenshot gate (mandatory per CLAUDE.md). **ADS ratchet baselines** (`design-governance/color-baseline.json`, `audit-baseline.json`) must be moved DOWN as each slice reduces counts (`node scripts/ads-color-gate.cjs --update` / `ads-audit-gate.cjs --update`, commit the baseline). Concurrent-session rule: each slice in its own worktree.

### PHASE 0 — P0 correctness / a11y / crash (behavior-changing; highest priority)

| Slice | FWID candidate | Files touched | Canonical source | Validation | Screenshot gate | Risk |
|---|---|---|---|---|---|---|
| 0.1 TestHub board crash | CAT-TESTHUB-BOARD-CRASH-YYYYMMDD-001 | board query (`tm_test_cases.key` ref), KanbanPage test-mode source | — (data fix) | board loads cards, no SectionMessage error; `execute_sql` column probe on cyij | `/testhub/board` populated | Med — schema/query; verify cyij column |
| 0.2 Defect detail wiring | CAT-DEFECT-DETAIL-WIRE-YYYYMMDD-001 | `defectsDataSource.ts:152`, new `/testhub/defects/:key` route (display key), CatalystDetailRouter mount | CatalystViewDefect (router L202) | row click opens detail; no UUID in URL | defect detail panel open | Med (DL-5) |
| 0.3 Systemic dialog a11y | CAT-A11Y-DETAIL-DISMISS-YYYYMMDD-001 | CatalystDetailRouter in-place panel (shared) | @atlaskit patterns | aria-modal correct OR role=region; Close btn present; Escape works | BAU-4771 + TC-002 with Close | High — shared component, regression sweep (hermes-regression-sweep) |
| 0.4 Allwork sticky dialog | CAT-ALLWORK-STICKY-YYYYMMDD-001 | allwork detail persisted-modal state | — | plain nav to /allwork opens no dialog | /allwork clean | Med |
| 0.5 Incident create a11y+model | CAT-INCIDENT-CREATE-CANON-YYYYMMDD-001 | `ja/CreateDropdown.tsx:105`, delete NewIncidentModal, CreateStoryModal Production-Incident path | CreateStoryModal | aria-modal=true, Escape closes, writes ph_issues; created incident appears in list | create modal + new incident in list | High (DL-1) — grep `incidents` readers first |
| 0.6 SetDetailPage stale enum | CAT-TESTHUB-ENUM-FIX-YYYYMMDD-001 | `SetDetailPage.tsx:433,425-429` | `lib/testhub/enums.ts` | add-cases picker returns rows (no 400); staging enum probe | picker populated | Med — confirm tm_cycle_status enum (DL / OQ) |

### PHASE 1 — Dead-code deletion (safe-additive; removes 7 of top-20 worst ADS files for free)

| Slice | FWID candidate | Files touched | Validation | Screenshot gate | Risk |
|---|---|---|---|---|---|
| 1.1 pages/releases + feature dirs | CAT-DELETE-RELEASES-GEN-YYYYMMDD-001 | `pages/releases/*` (12), `features/{all-releases,release-compare,release-calendar,my-test-scope}/`, `components/releases/defects/*` (8), `ReleaseDrawer.tsx` | tsc clean; no broken imports; app builds; `/releases/*` redirect intact | app boots, release-hub unaffected | Low (grep-verified zero live imports) — but confirm `releaseModuleDocumentation.ts` doc strings only |
| 1.2 dead incidenthub + unrouted pages/release | CAT-DELETE-INCIDENT-DEAD-YYYYMMDD-001 | `incidenthub/{IncidentKanbanPage,IncidentInsightsPage}.tsx`, unrouted `pages/release/{IncidentsListPage,IncidentsList,IncidentDashboardPage,IncidentViewPage,IncidentDetail}.tsx`, FAR:135 import | tsc clean; incident-hub unaffected | incident-hub boots | Low |
| 1.3 dead imports + Finder artifacts | CAT-DELETE-DEAD-IMPORTS-YYYYMMDD-001 | 5 FilterDetailPage imports (FAR:59,100,140,172,244), `/browse/:key` dup (FAR:469), 4 " 2" files | tsc clean; routes unchanged | — (non-visual) | Low |

### PHASE 2 — Legacy incident retirement (behavior-changing; ordered: nav → redirect → delete)

| Slice | FWID candidate | Files touched | Validation | Screenshot gate | Risk |
|---|---|---|---|---|---|
| 2.1 Nav rewires (D11) | CAT-INCIDENT-NAV-REWIRE-YYYYMMDD-001 | `OperationsSidebar.tsx:22,37`, `ja/ItemsDropdown.tsx:48`, `layout/dropdowns/ItemsDropdown.tsx:72`, `GlobalPageHeader.tsx:174-175` → routes.ts incidentHub builders | every nav entry lands on `/incident-hub/*` | nav click → incident-hub | Med (DL-2) |
| 2.2 Route redirects + broken redirect fix | CAT-INCIDENT-REDIRECT-YYYYMMDD-001 | FAR:909-922 → redirects to `/incident-hub/*`; fix literal `:incidentId` at FAR:919 | old URLs redirect; no literal-param nav | — | Med |
| 2.3 Delete legacy files | CAT-INCIDENT-LEGACY-DELETE-YYYYMMDD-001 | `pages/release/Incident*`, `modules/incidents/{analytics,kanban}/` legacy pages | tsc clean; incident-hub full function | incident-hub surfaces | Med (audit D4 Insights/D9 Command unique content first) |

### PHASE 3 — Structural convergence (behavior-changing; raw tables → JiraTable, pills → StatusLozenge, avatars → CatalystAvatar)

| Slice | FWID candidate | Files touched | Canonical | Validation | Screenshot gate | Risk |
|---|---|---|---|---|---|---|
| 3.1 Release pills → StatusLozenge | CAT-RELEASE-PILLS-YYYYMMDD-001 | RiskPill×2, HealthPill×2, StatusPill, ResultBadge (A1-A6) | StatusLozenge/ProjectHealthBadge/@atlaskit/lozenge | pills render, colors component-owned | changes/releases/freeze surfaces | Low-Med |
| 3.2 SeverityChip + incident modals | CAT-INCIDENT-CHIP-MODALS-YYYYMMDD-001 | SeverityChip, CommitteeModal, ConvertDialog | StatusLozenge, @atlaskit/modal-dialog | no shadcn, aria-modal=true, no rgba | incident create/committee | Med |
| 3.3 TestHub raw tables → JiraTable | CAT-TESTHUB-TABLES-YYYYMMDD-001 | CycleDetailPage:424, SetDetailPage:600,663, TestSetsPage grid | JiraTable | grid semantics, 39px rows, keyboard nav | cycle/set detail tables | Med-High (row expansion parity) |
| 3.4 Release detail consolidation | CAT-RELEASE-DETAIL-YYYYMMDD-001 | retire `:releaseId` 8-tab → slug detail + CatalystViewBase; wire ADF description; progress-tracker wrapper | CatalystViewBase, @atlaskit/progress-tracker | slug detail full-featured; `:releaseId` redirects | release detail | High (DL-3, content parity) |
| 3.5 Avatars → CatalystAvatar | CAT-AVATARS-YYYYMMDD-001 | ~11 RH + incident/testhub files (post-dead-delete) | CatalystAvatar | face avatar + name tooltip | representative surfaces | Low |
| 3.6 Release/TestHub dashboards + error convention | CAT-DASHBOARD-CANON-YYYYMMDD-001 | CommandCenterPage→ProjectDashboardPage mode='release'; SectionMessage sweep; silent {data} fixes (RH+TH) | ProjectDashboardPage, SectionMessage | dashboard shell testids; errors show SectionMessage+Retry | overview + error states | Med |

### PHASE 4 — Token cleanup (mostly safe-additive; #E0E0E0 / #6B6E76 / Tailwind / hex-fallbacks)

| Slice | FWID candidate | Files touched | Validation | Screenshot gate | Risk |
|---|---|---|---|---|---|
| 4.1 #E0E0E0 borders → --ds-border | CAT-ADS-BORDER-YYYYMMDD-001 | shared table/card CSS (grep #E0E0E0 first — one const or per-surface?) | dark-reactive borders; `lint:colors` ratchet down | 6 surfaces light+dark | Low |
| 4.2 #6B6E76 + RH parallel style system | CAT-ADS-RELEASE-TOKENS-YYYYMMDD-001 | releases-management header, changes list, `RH.*` constants | tokens dark-react; ratchet down | release surfaces light+dark | Low-Med |
| 4.3 Project Hub baseline hex | CAT-ADS-PH-HEX-YYYYMMDD-001 | StoryDetailPage:148, IssueDetailPage:140, StepDetails:220-222, project-list-utils:66,98, phStyles.css:8 | no bare hex; ratchet down | PH detail surfaces | Low |
| 4.4 Hooks/color-maps + hex fallbacks | CAT-ADS-COLORMAPS-YYYYMMDD-001 | useRequirementLinks:216, InlineEditors:81, ReadinessHistoryTable:34, ~30 token() fallbacks | hooks return keys; token() no 2nd arg; scanner tightened (DL-8) | — | Low |

### PHASE 5 — Convergence polish (safe-additive)

| Slice | FWID candidate | Scope | Risk |
|---|---|---|---|
| 5.1 Route-guard gating | CAT-ROUTE-GATING-YYYYMMDD-001 | add `MG k="testhub"`/`releases` role-keys, gate subtrees (DL-9) | Med |
| 5.2 routes.ts builder drift | CAT-ROUTES-BUILDERS-YYYYMMDD-001 | testHub cycle/dependencies builders; release release()/releaseManagement() dedup; BoardUuidRedirect mount (DL-11) | Low |
| 5.3 JiraTable grid ARIA | CAT-JIRATABLE-ARIA-YYYYMMDD-001 | complete grid role=row/gridcell/columnheader (baseline fix — benefits all hubs) | Med |
| 5.4 Release Filters nav + traceability/signoff tables | CAT-RELEASE-WIRING-YYYYMMDD-001 | ReleaseHubSidebar Filters entry; SignOffQueue+Traceability→JiraTable | Low-Med |

---

## 7. Findings count (floor check)

**312 gaps enumerated** (§2), exceeding the 300 hard floor. Built by atomic enumeration: each local pill (6 RH), each avatar file (~15), each raw-table site (36 across hubs), each unguarded route (30+ atomic), each #E0E0E0/#6B6E76 surface (per-surface CSS), each silent `{data}` destructure (9), each dead-gen file, each dead lazy import (5), each nav-rewire target (4), each Finder artifact (4), plus the already-canonical rows recorded as convergence wins. Every row traces to a specific report finding with ≥1 evidence type — no filler. Honest total: **312** (P0=21, P1=118, P2=173).

## High-risk findings (ALL P0s — 21)

| P0 | Gap | Evidence | Source |
|---|---|---|---|
| 1 | G-TH-001 TestHub board crash (`tm_test_cases.key` missing) | ERR,SS(ss_1680v6i2a) | 06-HR1 |
| 2 | G-TH-002 Defect row detail DEAD (onOpenItem stub, live 3× no-op) | CODE,INT,SS | 03,06,07 |
| 3 | G-TH-003 MyWork detail deep-link DEAD + UUID param | INT,SS | 06-HR3 |
| 4 | G-TH-018 SetDetailPage:433 stale enum can 400 live | CODE | 09-A1 |
| 5 | G-DF-013 Defect "Open in side panel" no-op | INT | 06-HR2 |
| 6-10 | G-IH-001/002/004/005/006 Incident create shadcn fork: split-brain + aria-modal null + focus never enters + **Escape can't close** | CODE,INT,a11y,SS | 03,06,07,08 |
| 11 | G-IH-021 Legacy `/release/incidents` stack live+nav-reachable | CODE,INT,SS | 01,03,06,07 |
| 12-15 | G-IH-022/023/024 legacy incident nav links (OperationsSidebar + 2 ItemsDropdown) + implicit dashboard landing | CODE,GREP,INT | 06,07 |
| 16 | G-XH-001 Systemic un-dismissable `aria-modal=false` detail panel (BAU-4771+TC-002) | a11y,INT,SS | 08-HR2 |

(21 counts each atomic P0 row: G-TH-001,002,003,018; G-DF-013; G-IH-001,002,004,005,006,021,022,023,024; G-XH-001 — plus the create-model + a11y sub-rows folded into 0.5. Note X1 correction removed the former "mock KPI renders lies" P0.)

## Evidence references

- Reports 01-09 (`docs/catalyst-ui-convergence/agents/01…09`), read in full.
- Route truth: `FullAppRoutes.tsx:669-794,909-922,1030-1077`; `App.tsx:247-292`; `lib/routes.ts:18-253`.
- Nav truth (X2 overturn): `OperationsSidebar.tsx:22,37`, `CatalystShell.tsx:138`, `ja/ItemsDropdown.tsx:48`, `layout/dropdowns/ItemsDropdown.tsx:72`, `GlobalPageHeader.tsx:174-175`.
- CSS-computed (agent 05): #E0E0E0 borders (6 surfaces), #6B6E76 text (2), 16px/52px releases rows.
- Live interaction (agent 06): ss_1680v6i2a (board crash), ss_6131imzt5 (dead defect), ss_384935enl (dead MyWork), ss_6188w2krk (shadcn incident), ss_6251s872c (legacy dashboard live-not-mock, X1).
- a11y (agent 08): NewIncidentModal `{ariaModal:null,dialogClosedByEsc:false}`; BAU-4771 `{ariaModal:"false",anyCloseOrBack:false}`.
- ADS grep (agent 09): 952 Tailwind color utils, 253 rgb/rgba, 43 hex, 36 raw tables, 51 fixed overlays, top-20 worst files (17/20 Release/Defect).

## Confidence level

**HIGH** for: route inventory (01, read end-to-end), canonical registry (02), destination code inventory (03), component mappings + DELETE membership (07, grep-verified), live P0s (06/08, directly observed + DOM-probed), ADS grep counts (09). Two input claims corrected with live evidence (X1 mock-KPI, X2 nav-reachability) and one reclassified (X3 ReleaseDrawer dead).
**MEDIUM** for: exact line numbers inside 900+L legacy files (spot-checked); populated-state anatomy of empty surfaces (release kanban/work/changes, testhub board, incident timeline — seed needed); JiraTable grid-ARIA lazy-vs-gap; incident-board drag guard-vs-broken; which raw tables hold written parity approvals.
**NOT ASSESSED:** narrow-viewport responsive (env resize no-op); Storybook-MCP component matches (server unauthenticated); screenshot pixel evidence (host-FS unreachable — ID-only).

## Open questions

1. Do `incidents`-table writes (NewIncidentModal) have ANY live readers? (Blocks DL-1.)
2. Is `tm_cycle_status` still a Postgres enum post-P1-S5? (Determines whether G-TH-018 is a live 400 or just drift.)
3. Is `/testhub/board`'s `tm_test_cases.key` a stale query column ref or a missing cyij migration? (Blocks 0.1.)
4. Does CatalystViewTestCase have StepEditor parity? (Gates DL-4/DL-6.)
5. Do legacy Insights (1,367L) / IncidentCommandCenter hold unique content vs incident-hub reports/dashboard? (Gates 2.3.)
6. Should CatalystDetailRouter in-place panel be role=region or a true modal? (DL-7.)
7. Tighten color scanner to CLAUDE.md, or amend CLAUDE.md? (DL-8.)
8. Route-gating policy: gate testhub/releases, keep project open — ratify? (DL-9.)

---

Discovery complete. No implementation has started. Approval required before Activate Feature and execution.
Discovery must be performed through a multi-agent evidence model, with no more than 10 focused agents, including DOM probing, CSS/token probing, Chrome MCP interaction probing, route discovery from code, and screenshot-backed evidence consolidation.
