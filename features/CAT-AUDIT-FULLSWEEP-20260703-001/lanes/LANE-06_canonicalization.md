# LANE 6 — Component Canonicalization / Duplicates

Audit: CAT-AUDIT-FULLSWEEP-20260703-001 · Lane 6 · 2026-07-03 · READ-ONLY sweep
Scope: table implementations, dialog systems, duplicate page trees, near-duplicate component families, registry freshness.
Method: static grep/find over `src/` + `src/routes/FullAppRoutes.tsx` import tally + `src/registry/usage-map.generated.ts` (read, not regenerated). No builds, no runtime probes — all "Route" claims derive from FullAppRoutes imports.

Canonical baseline (per CLAUDE.md): `src/components/shared/JiraTable` for work-item tables; `@atlaskit/*` primitives elsewhere; hand-rolled UI banned.

---

## CLUSTER A — Table implementations

### Inventory (file counts, grep-based)

| Implementation | File Path | Importing files | Status |
|---|---|---|---|
| JiraTable (canonical) | `src/components/shared/JiraTable/` | **111** | Canonical — wraps `@atlaskit/dynamic-table` |
| Raw `<table>` renders | 155 `.tsx` files | **155** | Banned by default for work-item/list surfaces |
| shadcn `ui/table.tsx` | `src/components/ui/table.tsx` | **38** | Hand-rolled system competing with JiraTable |
| CatalystTable | `src/components/ui/catalyst-table.tsx` | 4 (ForYouTable, ReportTable, StoryBacklogPage, release/IncidentReportsPage) | Parallel "single source of truth" — competing canon |
| `@atlaskit/dynamic-table` direct | ~14 prod files (ads/DynamicTable, shared/dynamic-table, BacklogTable, LinkTypeGroup, SubtasksPanel, AllProductsPage, TraceabilityPage, 4 admin pages, ThemeCard…) | ~14 | Acceptable ADS primitive, but two wrapper duplicates exist (0511) |
| shared/dynamic-table wrapper | `src/components/shared/dynamic-table/DynamicTable.tsx` | 1 real consumer | Duplicate of `ads/DynamicTable` |
| ads/DynamicTable wrapper | `src/components/ads/DynamicTable.tsx` | ~10+ via `@/components/ads` barrel (features/*) | Duplicate of shared/dynamic-table |

### Findings 0500–0509 — Work-item surfaces on raw `<table>` (JiraTable mandatory)

All ten share these field values unless noted:
**Category:** Tables / hand-rolled · **Mode:** static code · **CRE Rule Impact:** violates "JIRATABLE / TABLE-LIST RULE" (mandatory for Jira/work-item surfaces) + "HAND-ROLLED UI BANNED" · **ADS Impact:** bypasses ADS table semantics/tokens owned by dynamic-table · **Typography Impact:** local font sizing (e.g. `text-[13px]`, `text-sm`) instead of table-owned type · **Performance Impact:** none inherent; loses dynamic-table virtual/pagination affordances · **Accessibility Impact:** loses dynamic-table sort/row a11y contract (aria-sort, keyboard) — hand-rolled `<th>` sorting is unaudited · **Recommended Fix:** migrate to `src/components/shared/JiraTable` (111 existing consumers prove fit); migration risk = column-renderer rewrite, medium · **Validation Required:** screenshot signoff + DOM probe of sort/select/row-click parity · **Regression Risk:** Medium (live surfaces).

| ID | Severity | Surface | Route (via FullAppRoutes tree) | Component / File Path | Evidence | Suggested PR |
|---|---|---|---|---|---|---|
| CAT-AUDIT-0500 | High | Project Hub work items | `pages/project-hub` (routed) | `src/components/project-hub/work-items/WorkItemsTable.tsx` | line 243: `<table className="w-full border-collapse table-fixed">` | PR1 |
| CAT-AUDIT-0501 | High | Project Hub jira-list All Work | `pages/project-hub/jira-list/ProjectJiraLayout` (routed) | `src/pages/project-hub/jira-list/components/AllWorkTable.tsx` | line 251 raw `<table>`; 0 JiraTable refs in file | PR1 |
| CAT-AUDIT-0502 | High | Work Hub All Work | `modules/work-hub/views` (routed) | `src/modules/work-hub/views/AllWorkView.tsx` | line 651: `<table className="min-w-full border-collapse">` | PR2 |
| CAT-AUDIT-0503 | High | Work Hub List view | `modules/work-hub/views` (routed) | `src/modules/work-hub/views/ListView.tsx` | line 447: raw `<table>` `minWidth: 1100px` | PR2 |
| CAT-AUDIT-0504 | High | Tasks list | `modules/tasks` (routed) | `src/modules/tasks/components/TaskList/TaskListTable.tsx` | line 187: `<table className="w-full text-sm">` | PR3 |
| CAT-AUDIT-0505 | High | Epic backlog table view | `modules/backlog` (consumed by routed backlog pages) | `src/modules/backlog/components/EpicTableView.tsx` | line 444: `<table … text-[13px]>` (hardcoded font-size — typography impact confirmed) | PR3 |
| CAT-AUDIT-0506 | High | Program epics list | `modules/program-epics` (via ProgramEpicsPage, routed) | `src/modules/program-epics/components/EpicListView.tsx` | line 331: raw `<table>` `minWidth: 900px` | PR3 |
| CAT-AUDIT-0507 | Medium | Execution Workbench table | `pages/program` (routed) | `src/pages/program/ExecutionWorkbench/views/TableView.tsx` | line 286: `<table className="w-full">` | PR4 |
| CAT-AUDIT-0508 | Medium | Release defects table | releases surfaces (consumed by routed releasehub pages) | `src/components/releases/defects/DefectTableView.tsx` | line 41: `<table className="w-full">` | PR4 |
| CAT-AUDIT-0509 | High | Project Work Hub List tab | `modules/project-work-hub` (routed) | `src/modules/project-work-hub/components/tabs/ListTab.tsx` | line 124: `<table className="w-full border-collapse">` | PR2 |

**Why (all):** These are work-item surfaces (epics, stories, tasks, defects, all-work). CLAUDE.md makes JiraTable mandatory here; each hand-rolled table forks sorting, selection, column config, and status-pill rendering from the canonical path.

### CAT-AUDIT-0510 — CatalystTable: a second self-declared "single source of truth"
- **Category:** Tables / competing canon · **Severity:** Medium · **Surface:** For You, Reports, Story Backlog, Incident Reports · **Route:** ForYouPage, StoryBacklogPage, IncidentReportsPage (routed trees) · **Component:** `CatalystTable` · **File Path:** `src/components/ui/catalyst-table.tsx` · **Mode:** static
- **CRE Rule Impact:** violates canonical hierarchy (existing canonical = JiraTable; CatalystTable is a hand-rolled flex/grid table, not an @atlaskit wrapper). **ADS Impact:** not dynamic-table-based. **Typography/Perf/A11y:** own contract, unaudited vs ADS.
- **Evidence:** header comment literally claims "CATALYST TABLE COMPONENT — Single Source of Truth". 4 consumers: `src/components/for-you/ForYouTable.tsx`, `src/components/reports/ReportTable.tsx`, `src/modules/project-work-hub/pages/StoryBacklogPage.tsx`, `src/pages/release/IncidentReportsPage.tsx`.
- **Why:** Two components both claiming canon guarantees drift. StoryBacklogPage even imports BOTH CatalystTable and dynamic-table variants (`StoryBacklogPage.atlaskit.tsx` exists in parallel).
- **Recommended Fix:** freeze CatalystTable (no new consumers); migrate the 4 consumers to JiraTable; delete. Migration risk: medium (canGrow column model differs). **Regression Risk:** Medium. **Validation:** screenshot + row-interaction DOM probes on all 4 surfaces. **Suggested PR:** PR5.

### CAT-AUDIT-0511 — Duplicate dynamic-table wrappers (ads/ vs shared/)
- **Category:** Tables / duplicate wrapper · **Severity:** Medium · **Surface:** cross-cutting · **Route:** n/a · **Components:** `src/components/ads/DynamicTable.tsx` and `src/components/shared/dynamic-table/DynamicTable.tsx` · **Mode:** static
- **CRE Rule Impact:** two wrappers for the same @atlaskit primitive splits the canonical path. **ADS Impact:** neutral (both wrap ADS). **Typography/Perf/A11y:** n/a.
- **Evidence:** both files wrap `@atlaskit/dynamic-table`. `shared/dynamic-table` has 1 real consumer (`src/modules/project-work-hub/pages/StoryBacklogPage.tsx`) + stories/registry refs; `ads/DynamicTable` serves `features/*` via the `@/components/ads` barrel.
- **Recommended Fix:** keep `ads/DynamicTable` (barrel-exported, more consumers); repoint StoryBacklogPage; delete `shared/dynamic-table/`. Migration risk: low. **Regression Risk:** Low. **Validation:** tsc + StoryBacklogPage screenshot. **Suggested PR:** PR5.

### CAT-AUDIT-0512 — shadcn `ui/table.tsx` still active (38 importers)
- **Category:** Tables / legacy system · **Severity:** Medium · **Surface:** cross-cutting (admin, budget, releases, work-manager…) · **Route:** multiple routed trees · **Component:** `Table/TableHeader/TableRow…` · **File Path:** `src/components/ui/table.tsx` · **Mode:** static
- **CRE Rule Impact:** hand-rolled table primitives banned by default; competes with JiraTable and dynamic-table. **ADS Impact:** shadcn styling, not ADS-token-owned. **A11y:** basic `<table>` semantics only.
- **Evidence:** 38 files import from `@/components/ui/table`.
- **Recommended Fix:** ratchet — ban new imports (lint rule), migrate work-item consumers first (overlaps 0500-cluster), leave low-risk admin/dev pages last. Migration risk: medium, spread across many small surfaces. **Regression Risk:** Medium. **Validation:** per-surface screenshots. **Suggested PR:** PR6 (ratchet + first tranche).

### CAT-AUDIT-0513 — 155 files render raw `<table>` (appendix baseline)
- **Category:** Tables / baseline · **Severity:** Low (tracking) · **Surface:** repo-wide · **Mode:** static
- **Evidence:** `grep -rl "<table" src --include="*.tsx"` → 155 files (includes legitimate uses: rich-text ADF renderers, print views, email-ish reports).
- **Why:** baseline for a ratchet; not all 155 are violations — work-item ones are itemized in 0500–0509.
- **Recommended Fix:** record 155 as Lane-6 baseline; add raw-`<table>` ratchet analogous to color gate. **Regression Risk:** None (tooling). **Validation:** ratchet script output. **Suggested PR:** PR6.

---

## CLUSTER B — Dialog systems

### CAT-AUDIT-0514 — Two full modal systems: Radix `ui/dialog` (196 files) vs `@atlaskit/modal-dialog` (126 files)
- **Category:** Dialogs / dual system · **Severity:** High · **Surface:** repo-wide · **Route:** all trees · **Components:** `src/components/ui/dialog.tsx` (Radix/shadcn) vs `@atlaskit/modal-dialog` · **Mode:** static
- **CRE Rule Impact:** "HAND-ROLLED UI BANNED — modals"; canonical hierarchy puts @atlaskit above shadcn/Radix. **ADS Impact:** Radix dialogs carry shadcn overlay/shadow/radius, not `--ds-shadow-overlay` ADS surfaces. **Typography Impact:** shadcn dialog titles ≠ ADS modal header type. **A11y Impact:** two different focus-trap/ESC/stacking behaviors coexist — inconsistent UX; Radix+Atlaskit modal stacking can conflict when nested. **Performance:** double dependency weight for the same capability.
- **Evidence:** 196 files import `components/ui/dialog`; 126 files import `@atlaskit/modal-dialog`. Radix system is currently the MAJORITY despite ADS being canonical.
- **Recommended Fix:** declare `@atlaskit/modal-dialog` (or a thin Catalyst wrapper) canonical; ban new `ui/dialog` imports via lint; migrate by surface (start where a file already imports both). Migration risk: high in aggregate, low per-modal. **Regression Risk:** Medium–High (196 call sites). **Validation:** per-modal screenshot + focus/ESC DOM probes. **Suggested PR:** PR7 (ban + tranche 1), PR8 (tranches).

### CAT-AUDIT-0515 — Third wrapper: `overlays/AtlassianModal.tsx` (2 importers)
- **Category:** Dialogs / stray wrapper · **Severity:** Low · **Surface:** 2 call sites · **Component:** `AtlassianModal` · **File Path:** `src/components/overlays/AtlassianModal.tsx` (sole file in `src/components/overlays/`) · **Mode:** static
- **CRE Rule Impact:** third parallel modal entry point. **ADS Impact:** wrapper-dependent. **Evidence:** `grep -rl "components/overlays"` → 2 importers.
- **Recommended Fix:** fold into the canonical modal wrapper chosen in 0514; delete directory. Migration risk: trivial. **Regression Risk:** Low. **Validation:** 2 screenshots. **Suggested PR:** PR7.

---

## CLUSTER C — Duplicate page trees (routing truth = FullAppRoutes.tsx import tally)

FullAppRoutes reference counts: `pages/project-hub` 24 · `pages/releasehub` 17 · `pages/producthub` 12 · `pages/product-hub` 11 · `pages/items` 10 · `pages/release` 8 · `modules/work-hub` 5 · `pages/project` 4 · `pages/release-hub` 2 · `pages/projects` 2 · `pages/product` 1 · `pages/workhub` 1 · `pages/work-tree` 1 · `pages/work` 1 · `pages/releases` 0.

### CAT-AUDIT-0516 — `src/pages/releases/` tree is ORPHANED (0 routes, ~15 files, ~350 KB)
- **Category:** Page trees / dead code · **Severity:** High · **Surface:** none (unrouted) · **Route:** none in FullAppRoutes · **File Path:** `src/pages/releases/` (AllReleasesPage.tsx 88.6K, DefectDetailPage.tsx 44K, CommandCenterPage.tsx 35.7K, CoverageReportsPage.tsx 34.3K, QualityGatesPage.tsx 33.1K, + 10 more) · **Mode:** static
- **CRE Rule Impact:** competes with routed `pages/releasehub/AllReleasesPage` (live, linked from `SidebarBase.tsx`); agents keep "fixing" the dead twin. **Performance Impact:** dead weight in repo/graph tooling (lazy-loaded, so no bundle cost unless imported). **ADS/Typo/A11y:** n/a (dead).
- **Evidence:** `pages/releases` appears 0 times in FullAppRoutes; only refs are `src/utils/releaseModuleDocumentation.ts` and `src/components/releases/cycle-command-center/CycleTabNavigation.tsx` (nav strings), plus generated registry.
- **Recommended Fix:** confirm CycleTabNavigation link target, then delete tree (or move to `archive/`). Migration risk: low — verify no dynamic-import strings first. **Regression Risk:** Low–Medium (verify the 2 refs). **Validation:** tsc + grep for dynamic imports + smoke the releasehub routes. **Suggested PR:** PR9.

### CAT-AUDIT-0517 — `pages/release-hub` vs `pages/releasehub`: BOTH routed, duplicate ReleaseDetailPage
- **Category:** Page trees / split canon · **Severity:** High · **Surface:** Release detail · **Route:** both `pages/release-hub/ReleaseDetailPage` and `pages/releasehub/ReleaseDetailPage` are imported by FullAppRoutes · **File Paths:** `src/pages/release-hub/{ReleaseDetailPage,ReleaseWorkNavigatorPage}.tsx` (24.2K/36.1K) vs `src/pages/releasehub/ReleaseDetailPage.tsx` · **Mode:** static
- **CRE Rule Impact:** two live "Release Detail" implementations = guaranteed drift on a core surface. **ADS/Typo/A11y:** divergence risk, unmeasured here.
- **Evidence:** FullAppRoutes imports both trees (release-hub ×2, releasehub ×17).
- **Recommended Fix:** map which URL each serves; consolidate into `releasehub` (dominant tree, 17 routes); redirect old paths. Migration risk: medium (route params/slug contract). **Regression Risk:** Medium. **Validation:** navigate both URLs, confirm redirect + parity screenshots. **Suggested PR:** PR9.

### CAT-AUDIT-0518 — Product triple-tree: `producthub` (12) + `product-hub` (11) + `product` (1) all live
- **Category:** Page trees / split canon · **Severity:** Medium · **Surface:** Product Hub · **Route:** all three imported by FullAppRoutes · **File Paths:** `src/pages/producthub/` (ideas, ideation, requirement-assist, roadmap), `src/pages/product-hub/` (products, milestones, backlog, board, timeline), `src/pages/product/ideas/IdeasRoadmapPage.tsx` · **Mode:** static
- **CRE Rule Impact:** near-duplicate pages both routed: `pages/producthub/IdeasRoadmapPage` AND `pages/product/ideas/IdeasRoadmapPage` are each imported by FullAppRoutes — two live Ideas-roadmap implementations.
- **Evidence:** FullAppRoutes import list (see tally above).
- **Recommended Fix:** decide one naming (`product-hub` matches `project-hub`); merge `producthub` in; collapse `pages/product/` (single file) first — verify which IdeasRoadmapPage each route serves, keep one, redirect. Migration risk: medium. **Regression Risk:** Medium. **Validation:** route smoke of both ideas-roadmap URLs. **Suggested PR:** PR10.

### CAT-AUDIT-0519 — Project trees: `project-hub` (24) vs `project` (4) vs `projects` (2); ProjectSummaryPage orphan candidate
- **Category:** Page trees / split canon · **Severity:** Medium · **Surface:** Project Hub · **Route:** all three trees partially routed · **File Paths:** `src/pages/project/{BoardView,FeatureDetailPage,ProjectWorkspace,TimelineView}.tsx` (routed); `src/pages/projects/{ProjectBacklogPage,ProjectComingSoonPage}.tsx` (routed); `src/pages/projects/ProjectSummaryPage.tsx` (28.5K — NOT in FullAppRoutes; orphan candidate, verify secondary importers) · **Mode:** static
- **CRE Rule Impact:** `project-hub` is clearly dominant (24 refs) yet legacy `project`/`projects` pages still serve live routes — canonical-screen discovery will keep landing on the wrong tree.
- **Recommended Fix:** absorb the 6 routed legacy pages into `project-hub`; delete `ProjectSummaryPage.tsx` if grep confirms zero non-generated importers. Migration risk: medium. **Regression Risk:** Medium. **Validation:** route smoke + tsc. **Suggested PR:** PR10.

### CAT-AUDIT-0520 — Six "work" trees live simultaneously
- **Category:** Page trees / fragmentation · **Severity:** Medium · **Surface:** Work Hub / epics-features · **Route:** all routed · **File Paths:** `src/pages/items/` (10 routes — epic/feature canon), `src/pages/work/Dependencies.tsx` (1 route, sole file), `src/pages/work-tree/WorkTreePage.tsx` (1), `src/pages/workhub/AllWork.tsx` (1), `src/modules/work-hub/` (5 routes, views), `src/modules/workhub/admin/` (1 route) · **Mode:** static
- **CRE Rule Impact:** `work` vs `work-hub` vs `workhub` naming means three casing variants of the same domain; discovery agents and imports routinely miss siblings. Also note component-level split: `src/components/workhub/` AND `src/modules/work-hub/` AND `src/modules/workhub/` all exist.
- **Recommended Fix:** naming decision (`work-hub`), folder moves only (no logic change), path-alias codemod. Migration risk: low-medium (import churn only). **Regression Risk:** Low. **Validation:** tsc + route smoke. **Suggested PR:** PR11.

---

## CLUSTER D — Near-duplicate component families

Common fields: **Mode:** static · **Route:** cross-cutting · **Performance Impact:** duplicate code weight only unless noted.

### CAT-AUDIT-0521 — StatusPill family (5+ implementations)
- **Severity:** High · **Category:** Pills/lozenges
- **Family:** canonical `CatalystStatusPill` (defined in `src/components/catalyst-detail-views/shared/sections/statusPalette.ts`, 11 importers, ADS SUBTLE tier — per D-log 2026-06-29) · competitors: `src/modules/in-jira/components/StatusPill.tsx`, `src/modules/okr-v2/components/shared/OkrStatusPill.tsx`, `src/components/incidents/TablePill.tsx`, `src/components/hierarchy/StatusBadge.tsx`, `src/components/shared/StatusLozenge/StatusLozengeDropdown.tsx`.
- **CRE Rule Impact:** "status pills" explicitly on the banned hand-roll list; color decisions must live only in statusPalette.ts. **ADS Impact:** competitor pills own their colors → bypass the palette-only rule. **A11y:** inconsistent contrast tiers.
- **Recommended Fix:** canonical = `CatalystStatusPill`/statusPalette.ts. Migrate in-jira StatusPill and TablePill first (work-item surfaces). Migration risk: low-medium (status-key mapping). **Regression Risk:** Medium (visual). **Validation:** dark-mode screenshots per surface. **Suggested PR:** PR12.

### CAT-AUDIT-0522 — Avatar family (~20 implementations, incl. a name collision)
- **Severity:** High · **Category:** Avatars
- **Family:** de-facto canonical `src/components/shared/CatalystAvatar.tsx` (**85 importers**); `@atlaskit/avatar` direct (26); `src/components/shared/UserAvatar.tsx` (19); plus bespoke: `ads/Avatar`, `ads/UnassignedAvatar`, `capacity/CapacityAvatar`, `kanban/KanbanAvatar`, `icons/ProjectAvatar`, `icons/ProductAvatar`, `project-hub/shell/CurrentUserAvatar`, `caty-ai-chat/CatyAIAvatar`, `workhub/shared/AvatarChip`, `chat/main/{AtlaskitAvatar,avatar}`, `chat-v2 PresenceAvatar/ConversationAvatar`, `planner/task-modal/atoms/Avatar`, `tasks/kanban/AssigneeAvatar`.
- **Name collision:** `src/components/ui/catalyst/CatalystAvatar.tsx` (1 importer) duplicates the name of the 85-importer canonical — active hazard for auto-imports.
- **CRE Rule Impact:** avatars on the banned hand-roll list. **A11y:** inconsistent alt/tooltip behavior across 20 variants.
- **Recommended Fix:** canonical = `shared/CatalystAvatar` (delegating to @atlaskit/avatar). Immediate: delete/rename `ui/catalyst/CatalystAvatar.tsx` (1 importer). Then fold bespoke wrappers. Migration risk: low per component. **Regression Risk:** Low–Medium. **Validation:** tsc + spot screenshots. **Suggested PR:** PR12.

### CAT-AUDIT-0523 — DatePicker family (4 implementations)
- **Severity:** Medium · **Category:** Date fields
- **Family:** `src/components/ui/catalyst-date-picker.tsx` (23 importers) vs `@atlaskit/datetime-picker` direct (16) vs `src/modules/work-hub/components/InlineDatePicker.tsx` vs `src/modules/tasks/components/task-list/InlineDatePicker.tsx` (two same-named inline pickers).
- **CRE Rule Impact:** date fields on banned hand-roll list. **Recommended Fix:** canonical = `catalyst-date-picker` (verify it wraps @atlaskit/datetime-picker; if not, that's the first fix); merge the two InlineDatePickers into one shared inline variant. Migration risk: low. **Regression Risk:** Low. **Validation:** date-edit DOM probe on work-hub + tasks lists. **Suggested PR:** PR12.

### CAT-AUDIT-0524 — EmptyState family (11 files; one dead)
- **Severity:** Medium · **Category:** Empty states
- **Family:** canonical `src/components/ads/EmptyState.tsx` (5 direct + ~53 barrel importers of an `EmptyState` symbol) · `@atlaskit/empty-state` direct (23) · `src/components/ui/EmptyState.tsx` (**1 importer — near-dead duplicate**) · bespoke: releasehub/EmptyState, notifications/EmptyState, chat ConversationEmptyState, workhub AllWorkEmptyState, ja/home EmptyStates, for-you StarredEmptyState, shared/dependencies DependenciesEmptyState, priorities PriEmptyState, chat-v2 ChannelEmptyState.
- **Recommended Fix:** canonical = `ads/EmptyState`; delete `ui/EmptyState.tsx` after repointing its 1 importer; fold bespoke ones opportunistically. Migration risk: trivial for the dead one. **Regression Risk:** Low. **Validation:** tsc. **Suggested PR:** PR12.

### CAT-AUDIT-0525 — Toolbar family (~40 implementations)
- **Severity:** Medium · **Category:** Toolbars
- **Family:** shared candidates `src/components/shared/ListScreenToolbar.tsx` (8 importers) and `src/components/shared/CatalystListPage/CatalystListToolbar.tsx`; `src/components/ui/unified-toolbar.tsx` has only 2 importers (failed unifier). ~37 bespoke per-surface toolbars (BoardToolbar, KanbanToolbar ×2, RoadmapToolbar ×4 different files, AllWorkToolbar ×2, ProjectToolbar, ReleasesToolbar, ForYouToolbar, …).
- **CRE Rule Impact:** not per-se banned, but 4 separately named `RoadmapToolbar` files and 2 `AllWorkToolbar` files are direct near-duplicates.
- **Recommended Fix:** canonical = ListScreenToolbar/CatalystListToolbar for list surfaces; retire `ui/unified-toolbar` (2 importers). Full consolidation is out of 2-hour-slice scope — target only the exact-name duplicates first. Migration risk: medium. **Regression Risk:** Medium. **Validation:** per-surface screenshots. **Suggested PR:** PR12 (name-dup subset only).

### CAT-AUDIT-0526 — Breadcrumb family (7 files; shadcn one dead)
- **Severity:** Low · **Category:** Breadcrumbs
- **Family:** `src/components/ads/Breadcrumbs.tsx` (6 importers) · `@atlaskit/breadcrumbs` direct (6) · `src/components/ui/breadcrumb.tsx` (**0 importers — dead shadcn file**) · bespoke: BacklogBreadcrumb, strategy/Breadcrumbs, workhub WorkHubBreadcrumb, project-work-hub TicketBreadcrumbs, incidents KanbanBreadcrumb.
- **Recommended Fix:** delete dead `ui/breadcrumb.tsx`; canonical = `ads/Breadcrumbs`. Migration risk: none for the deletion. **Regression Risk:** None (dead code). **Validation:** tsc. **Suggested PR:** PR12.

### CAT-AUDIT-0527 — UserPicker family (6 implementations)
- **Severity:** Medium · **Category:** User pickers
- **Family:** `src/components/ui/user-picker.tsx` (6 importers) · `@atlaskit/user-picker` direct (2) · bespoke: `incidents/InlineUserPicker`, `kanban/AssigneePickerPopover`, `project-hub/jira-list/WorkCardAssigneePicker`, `task10/T10AssigneePicker`, `features/kanban-board/AssigneePicker`.
- **CRE Rule Impact:** inline-edit fields on banned hand-roll list; 5 bespoke assignee pickers = 5 different search/avatar/unassign behaviors on work-item surfaces.
- **Recommended Fix:** pick canonical (audit whether `ui/user-picker` wraps @atlaskit/user-picker; prefer the @atlaskit-based one); consolidate assignee pickers. Migration risk: medium (data sources differ). **Regression Risk:** Medium. **Validation:** assignee-change DOM probe per surface. **Suggested PR:** PR12.

### CAT-AUDIT-0528 — FilterBar family (~40 implementations)
- **Severity:** Medium · **Category:** Filter bars/dialogs
- **Family:** shared candidate `src/components/filters/BasicFilterBar.tsx`; ~12 `*FiltersDialog.tsx` near-clones (forecast, features, incidents ×2, epic-backlog ×2, executive-roadmap, skills, risks, program, workbench, okr-v2, feature-backlog) plus ~25 per-surface FilterBar/Filters components.
- **CRE Rule Impact:** the FiltersDialog clones are copy-paste siblings — same dialog skeleton per module; drift already visible in naming (`EpicFiltersDialog` exists in BOTH `components/epic-backlog/` and `modules/backlog/components/`).
- **Recommended Fix:** extract one canonical FiltersDialog + config; start with the two identically-named `EpicFiltersDialog` files. Migration risk: medium. **Regression Risk:** Medium. **Validation:** filter-apply DOM probes. **Suggested PR:** PR12 (EpicFiltersDialog pair only), rest deferred.

---

## CLUSTER E — Registry

### CAT-AUDIT-0529 — `usage-map.generated.ts` is 6+ weeks stale
- **Category:** Registry · **Severity:** Low · **Surface:** tooling · **File Path:** `src/registry/usage-map.generated.ts` · **Mode:** static (read only, NOT regenerated per lane rules)
- **Evidence:** header `Captured: 2026-05-18T16:04:33.679Z · Stats: 3815 components observed (512 atlaskit, 3303 internal)`; 51,524 lines. Predates the sprints-native work, tasks overhaul, and this audit's trees.
- **Why:** canonical-discovery agents consuming this map get stale consumer lists.
- **Recommended Fix:** regenerate via `npx tsx scripts/scan-components.ts` in a dedicated session (out of lane scope). **Regression Risk:** None. **Validation:** diff stats line. **Suggested PR:** PR6.

---

## Appendix — Totals

| Cluster | Findings | Key counts |
|---|---|---|
| A Tables | 0500–0513 (14) | JiraTable 111 importers · raw `<table>` 155 files · shadcn ui/table 38 · CatalystTable 4 · dynamic-table wrappers ×2 · 10 work-item raw-table surfaces |
| B Dialogs | 0514–0515 (2) | Radix ui/dialog 196 files · @atlaskit/modal-dialog 126 files · overlays/AtlassianModal 2 |
| C Page trees | 0516–0520 (5) | `pages/releases` orphaned (~15 files) · release detail duplicated live ×2 · product ×3 trees · project ×3 trees · work ×6 trees |
| D Families | 0521–0528 (8) | StatusPill 5+ · Avatar ~20 (+1 name collision) · DatePicker 4 · EmptyState 11 (1 dead) · Toolbar ~40 · Breadcrumb 7 (1 dead) · UserPicker 6 · FilterBar ~40 |
| E Registry | 0529 (1) | usage map stale since 2026-05-18 |
| **Total** | **30 findings** | **~640+ competing/duplicate occurrence sites** (155 raw tables + 38 shadcn tables + 322 dialog files + ~125 family duplicates) |

Severity: High 14 · Medium 12 · Low 4.

## Lane Summary

Catalyst has one declared canonical table (JiraTable, 111 importers) but four competing table systems still live, including 10 routed **work-item** surfaces on hand-rolled `<table>` (WorkItemsTable, AllWorkTable, AllWorkView, ListView, ListTab, TaskListTable, EpicTableView, EpicListView, Workbench TableView, DefectTableView) — each a direct JIRATABLE-rule violation. The dialog layer is inverted: the non-canonical Radix `ui/dialog` (196 files) outnumbers `@atlaskit/modal-dialog` (126). Page trees are fragmented: `pages/releases` is fully orphaned (~350 KB), Release Detail ships twice live (`release-hub` + `releasehub`), product/project/work domains each split across 3–6 sibling trees. Component families show ~20 avatars (with a `CatalystAvatar` name collision), 5+ status pills competing with statusPalette.ts, ~40 toolbars, ~40 filter components (incl. two files both named `EpicFiltersDialog`), and two dead files (`ui/breadcrumb.tsx`, near-dead `ui/EmptyState.tsx`) deletable at zero risk. Recommended sequence: PR1–PR4 JiraTable migrations, PR5 kill CatalystTable + wrapper dup, PR6 ratchets + registry regen, PR7–PR8 dialog convergence, PR9–PR11 tree consolidation, PR12 family canonicalization quick wins.
