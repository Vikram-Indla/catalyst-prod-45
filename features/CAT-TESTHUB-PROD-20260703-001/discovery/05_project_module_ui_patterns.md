# Discovery 05 — PROJECT Module Canonical UI Pattern Library + TestHub Audit

Feature: CAT-TESTHUB-PROD-20260703-001
Agent: UI/UX pattern discovery (read-only)
Date: 2026-07-03
Repo: /Users/vikramindla/Documents/GitHub/catalyst-prod-45

Rules of evidence: every claim below cites `file:line` or command output observed in this session.

---

## PART 1 — CANONICAL PATTERN LIBRARY (the gold standard)

### 1.1 JiraTable — canonical table

**File:** `src/components/shared/JiraTable/JiraTable.tsx` (3,197 lines)
**Types:** `src/components/shared/JiraTable/types.ts`
**Barrel:** `src/components/shared/JiraTable/index.ts`

The types file header explicitly declares intent: *"Designed to be reused across ProjectHub, ReleaseHub, TestHub, IncidentHub"* (`types.ts:4-5`).

**Full prop surface** (`types.ts:120-356`, `JiraTableProps<TRow>`):

| Capability | Props | Evidence |
|---|---|---|
| Column schema | `columns: Column<TRow>[]` — id, label, width (fraction/100), `flex`, `sortable`, `align`, `alwaysVisible`, `hidden`, `defaultVisible`, `accessor`, `cell`, `headerStyle`, `lockedPosition`, `subSorts` | types.ts:34-94 |
| Per-column filters | `filterable`, `renderFilterMenu(close)`, `hasActiveFilter` (hover chevron popup, Jira parity) | types.ts:69-73 |
| Grouping | `groups: RowGroup<TRow>[]` (id/label/rows/isCollapsed/meta/`labelNode` rich label), `collapsedGroups` + `onToggleGroup` | types.ts:97-117, 213-214 |
| Group inline create | `onAddToGroup`, `renderGroupInlineRow(groupId)`, gated by `enableGroupCreateButton` | types.ts:225, 238, 323 |
| Row expand (hierarchy) | `getRowHasChildren`, `expandedRowIds`, `onToggleRowExpanded`, `getRowDepth` (16px per level indent) | types.ts:248-261, 137 |
| Inline edit | `onCellEdit(row, columnId, next)`; per-cell `commit(next)` in `CellProps` | types.ts:139, 27 |
| Selection + bulk | `selectable`, `selection: ReadonlySet<string>`, `onSelectionChange`; pair with exported `BulkFooterBar` | types.ts:141-143; index.ts (BulkFooterBar export) |
| Sort (controlled) | `sortKey`, `sortOrder: 'ASC'\|'DESC'`, `onSortChange` | types.ts:145-147 |
| Pagination + row count footer | `rowsPerPage`, `page`, `onPageChange`, `showRowCount`, `totalRowCount` ("N of Total items") | types.ts:149-161 |
| Row drag | `renderRowDragHandle(row)` (absolute overlay grip-on-hover), `rowDragHandleHidden` | types.ts:173-174 |
| Keyboard nav | `focusedRowId`, `onFocusedRowChange`, `onEscape` | types.ts:176-180 |
| Density | `density: 'comfortable' \| 'compact'` (comfortable = Catalyst default) | types.ts:13, 182 |
| Loading/empty | `isLoading`, `emptyView` | types.ts:184-185 |
| Column picker | `columnVisibility` + `onColumnVisibilityChange` → trailing `+` header button | types.ts:205-206 |
| Column resize persistence | `initialColumnWidths`, `onColumnWidthsChange` (localStorage/URL) | types.ts:284-290 |
| Column reorder | `enableColumnReorder`, `columnOrder`, `onColumnOrderChange` | types.ts:301-304 |
| Virtualization | `enableVirtualization` (@tanstack/react-virtual, ≥500 rows; auto-off when grouped) | types.ts:313 |
| Sticky create footer | `enableStickyCreateFooter` + `stickyCreateFooter { placeholder, onActivate, active, onRefresh }` | types.ts:332-355 |
| Context menu | `contextMenuActions[]` (right-click portal menu, same list as `makeRowActionsCell`) | types.ts:269-277 |
| Bottom slot | `bottomSlot` (inline "+ Create" row inside viewport) | types.ts:195 |

**Prefab cell factories** (`index.ts` exports; implementations in `cells.tsx` 33K / `editors.tsx` 76K):
`makeCheckboxCell, makeKeyCell, makeSummaryCell, makeStatusCell, makeStatusEditCell, makeAssigneeCell, makeParentCell, makeCommentsCell, makePriorityCell, makeDateCell, makeTypeIconCell, makeCaretCell, makeLabelsCell, makeSprintReleaseCell, makeDragHandleCell, makeRowMenuCell` plus inline editors `makeStatusEditCellAkPopup, makeSummaryInlineEditCell, makeAssigneeEditCell, makePriorityEditCell, makeParentEditCell, makeRowActionsCell, makeDateEditCell, makeLabelsEditCell`.

**Usage example** (TestHub itself, already correct): `src/pages/testhub/cycles/CyclesPage.tsx:178` — `<JiraTable<TMCycle> …>`; `src/pages/testhub/repository/RepositoryPage.tsx:905` — `<JiraTable<TMTestCase> …>`.

### 1.2 Detail views — CatalystViewBase + CatalystDetailRouter

**Shell:** `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` (43.9K). Header doc (lines 2-16): modal overlay OR panel mode, top bar with breadcrumb slot + Share/More/Close, resizable two-column body (left panel + right sidebar), splitter, Escape handling, shared animations. Container queries collapse the sidebar under 440px (`CatalystViewBase.tsx:55-62`).

**Router:** `src/components/catalyst-detail-views/CatalystDetailRouter.tsx` (9.5K). Already has TestHub short-circuits:
- `entityKind === 'test_case'` → lazy `CatalystViewTestCase` reading `tm_test_cases` (router lines 32-35, 128-130; view: `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx`, 27.4K)
- `entityKind === 'test_cycle'` → lazy `CatalystViewTestCycle` reading `tm_test_cycles` (router lines 37-40, 152-154; view: `src/components/catalyst-detail-views/test-cycle/CatalystViewTestCycle.tsx`, 8.7K)

**Right sidebar (canonical):** `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx` — header comment: *"CANONICAL — Right sidebar for all CatalystView\* components. Change here → updates all work item types."* Renders Status dropdown → Details header → EditableAssignee → Assign-to-me → `{children}` slot → EditablePriority → Reporter → EditableLabels → EditableSprintRelease → timestamps. Compact-rail context flips FieldRow to stacked below 360px width. Story Points BANNED (file header GUARDRAIL).

**Key details section:** `src/components/catalyst-detail-views/shared/sections/CatalystKeyDetails.tsx`.
**Supporting shared pieces:** `CoverStrap.tsx`, `WatchersChip.tsx`, `ConfirmDeleteDialog.tsx`, `MoveIssueDialog.tsx`, `DiscussTicketButton.tsx` (all under `catalyst-detail-views/shared/`).

### 1.3 Modals — CreateStoryModal + @atlaskit/modal-dialog

**Canonical create modal:** `src/components/workhub/create-story/CreateStoryModal.tsx` (1,666 lines). Props (`CreateStoryModal.tsx:126-166`): `open, onClose, projectId?, projectKey?, onSuccess?(issueKey), linkedSource?, onOpenBusinessRequest?, onOpenTask?, workTypes?, creModule?` (CRE filtering of creatable types), `defaultWorkType?` (default 'Story'), `initialSummary?`, initial parent key.
Per memory + repo convention, TestHub defect creation already goes through CreateStoryModal with `defaultWorkType` 'QA Bug' → `tm_defects` (isDefect branch).

**Generic modal primitive:** `@atlaskit/modal-dialog` (`Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition`) — used by CatalystSidebarDetails (import at its top) and by TestHub's good pages (`CyclesPage.tsx:17`, `ExecutionPage.tsx:4`, `CaseDrawer.tsx:4`, `RepositoryPage.tsx:28`). Confirm dialogs: `ConfirmDeleteDialog.tsx` / `ConfirmArchiveDialog.tsx` / `ConfirmCloneDialog.tsx` in `catalyst-detail-views/shared/`.

### 1.4 Status pills — StatusLozenge (CANONICAL)

**File:** `src/components/shared/StatusLozenge/StatusLozenge.tsx`. Header: *"CANONICAL status pill. Single source of truth for work-item status pills across every Catalyst surface."* (CAT-ADS-STATUSPILL-UNIFY-20260629-001).
- Sizes: `sm` (20px, For You row parity) / `md` (32px, Jira status-button parity) — SIZE_SPECS table in file.
- Colors from `statusPalette.ts` (ADS `*-bold` tokens + `--ds-text-inverse`), zero hex, dark-mode safe.
- API (`StatusLozengeProps`): `status`, `statusCategory?`, `size?`, `trailing?` (chevron inside pill), `appearance?` override for non-status domains (environment/health/deploy) — the sanctioned way to reuse the pill for test-domain values.
- Helpers exported: `statusToAppearance(status, category)` (delegates to canonical `statusToLozenge` table; accepts snake_case and Title Case), `humanizeStatus`.
- Dropdown variant: `src/components/shared/StatusLozenge/StatusLozengeDropdown.tsx`.

Note: there is NO component named `CatalystStatusPill` in the repo (`find … -iname "*CatalystStatusPill*"` → 0 files). The canonical name is StatusLozenge. Raw `@atlaskit/lozenge` remains acceptable for non-work-item semantics (component owns its color) but work-item status must use StatusLozenge.

### 1.5 Flags / toasts — @atlaskit/flag via shims

- **Flag engine:** `src/components/shared/JiraTable/flags.tsx` — exports `showFlag(input)`, `flag.{success,error,info,warning}` helpers, `FlagsHost` (mounted once in App.tsx), `FlagAppearance`, `FlagAction` (flags.tsx:33-131).
- **sonner shim:** `src/components/ui/sonner.tsx` — *"ADS notification shim — replaces Sonner with @atlaskit/flag"*; `toast/success/error/info/warning/loading/dismiss` all delegate to `showFlag`; `Toaster` is a null component.
- **catalystToast shim:** `src/lib/catalystToast.ts` — Phase 6 ADS migration (2026-05-26); `catalystToast.{success,error,warning,info,loading,undo,dismiss}` delegate to `showFlag`.
- Rule of thumb for new code: call `showFlag`/`flag` from `@/components/shared/JiraTable/flags` directly; the shims exist only for legacy call sites.
- TestHub already uses `catalystToast` correctly (e.g. `CycleDetailPage.tsx:28,119,122,138,145,150,572,612`).

### 1.6 Backlog / board / kanban

- **Backlog canonical:** `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (406K) — the full JiraTable surface (toolbar, column picker, inline edit, bulk actions, group-by, URL state, Ask Caty). It is **adapter-driven**: TestHub mounts it via `useTestCasesSource()` (`src/modules/project-work-hub/adapters/testCasesDataSource`) in `src/pages/testhub/MyWorkPage.tsx` and via `useDefectsSource()` in `src/pages/testhub/DefectsPage.tsx` — props: `projectId, projectKey, displayName, baseUrl, dataSource, filterContext`, with `adapter.ChromeHeader` and `allowedColumnIds` overrides (MyWorkPage.tsx full text captured in session).
- **Kanban canonical:** `src/features/kanban-board/KanbanPage.tsx` — mode-parameterised. TestHub board = `<KanbanPage mode="test" keyOverride="TESTHUB" />` (`src/pages/testhub/BoardPage.tsx`, entire 19-line file). Column set TEST_BOARD_COLUMNS (DRAFT/IN REVIEW/APPROVED/DEPRECATED) per its header comment.
- Board atoms also exist at `src/components/board/` (BoardCard/BoardColumn/BoardToolbar).

### 1.7 Breadcrumbs & page chrome

- **ADS breadcrumbs wrapper:** `src/components/ads/Breadcrumbs.tsx` (wraps `@atlaskit/breadcrumbs`).
- **Detail-view breadcrumbs:** `src/modules/project-work-hub/components/TicketBreadcrumbs.tsx` (9.5K) — used in CatalystViewBase top bar (import at CatalystViewBase.tsx:28).
- **Page chrome band:** `src/modules/project-work-hub/components/ProjectChromeBand.tsx` (12.6K, uses @atlaskit/breadcrumbs).
- **Hub page header:** `src/components/layout/ProjectPageHeader.tsx` — TestHub pages already mount it with `projectKey="TESTHUB" hubType="test"` (grep count: CyclesPage/RepositoryPage/TestSetsPage/defects DefectsPage each ×2).

### 1.8 Filters UI

**Canonical dir:** `src/components/filters/` — `BasicFilterBar.tsx` (23K, the standard toolbar filter bar), `CanonicalFilter.tsx` (123K), `FilterKebabMenu.tsx`, `FilterResultsPanel.tsx`, `FilterSaveModal.tsx`, `FilterTemplateGallery.tsx`, `FilterVersionHistory.tsx`, `JQLEditor.tsx`, `JQLAutocompleteDropdown.tsx`.
TestHub filters pages are already canonical wrappers: `src/pages/testhub/FiltersListPage.tsx` mounts `@/pages/project-hub/filters/FiltersListPage` with `hubType="test"` (entire file captured); FilterPreviewPage/FilterDetailPage are 316B/323B wrappers.
Per-column filtering inside tables goes through JiraTable's `filterable`/`renderFilterMenu` (types.ts:69-73) — not a separate bar.

### 1.9 Empty states & error states

- **Canonical:** `src/components/ads/EmptyState.tsx` — *"Catalyst wrapper over @atlaskit/empty-state. Use for first-run / no-results / zero-state views. For error states with a retry, use SectionMessage appearance='error'"* (file header). Size variants calibrated for full-page vs widget.
- **Error pattern:** `SectionMessage` from `@/components/ads/SectionMessage` + Retry (repo-wide "silent query-error sweep" pattern; CatalystViewBase imports it at line 34).
- Specialized: `src/components/empty-states/EmptyBoardState.tsx`, `EmptyTimelineState.tsx`.

---

## PART 2 — TESTHUB AUDIT vs THE PATTERN LIBRARY

TestHub source: `src/pages/testhub/**` + `src/components/testhub/**` (11,675 lines of .tsx total) + `src/styles/testhub.css` (1,861 lines).

### 2.1 Compliant surfaces (keep)

| Surface | Route | Pattern used | Evidence |
|---|---|---|---|
| MyWorkPage | /testhub/my-work | Canonical BacklogPage + testCasesDataSource adapter + ProjectPageHeader | MyWorkPage.tsx (whole file) |
| DefectsPage (wrapper) | /testhub/defects | Canonical BacklogPage + defectsDataSource | pages/testhub/DefectsPage.tsx:1-13; FullAppRoutes.tsx:682 |
| BoardPage | /testhub/board | Canonical KanbanPage mode='test' | BoardPage.tsx (whole file) |
| DashboardPage | /testhub/dashboard | Canonical ProjectDashboardPage mode='test' | DashboardPage.tsx header |
| Filters pages | /testhub/filters* | Canonical project-hub FiltersListPage hubType='test' | FiltersListPage.tsx (whole file) |
| CyclesPage list | /testhub/cycles | JiraTable<TMCycle> + @atlaskit/modal-dialog + ProjectPageHeader | CyclesPage.tsx:17,23-24,178 |
| RepositoryPage list | /testhub/repository | JiraTable<TMTestCase> | RepositoryPage.tsx:26-27,905 |
| Toasts everywhere | — | catalystToast → showFlag (ADS flags) | CycleDetailPage.tsx:28 etc. |
| Detail routing hooks | — | CatalystDetailRouter test_case / test_cycle short-circuits exist | CatalystDetailRouter.tsx:128-154 |

### 2.2 VIOLATIONS TABLE

| # | Surface / file | Violation | Canonical replacement | Evidence |
|---|---|---|---|---|
| V1 | `src/pages/testhub/cycles/CycleDetailPage.tsx:423` | Hand-rolled `<table style={{borderCollapse:'collapse'…}}>` for the cycle's case-scope list (checkbox th at :427) | JiraTable (selection, sort, inline edit come free) | sed output :415-430 |
| V2 | `src/pages/testhub/sets/SetDetailPage.tsx:600,663` | Two hand-rolled `<table>`s (set cases; cycles containing set) | JiraTable | sed output :598-610 |
| V3 | `src/pages/testhub/sets/TestSetsPage.tsx:415-438` | Hand-rolled CSS-grid table (`gridTemplateColumns: '48px 1fr 120px…'`) for the sets list | JiraTable | grep output |
| V4 | `src/pages/testhub/defects/DefectsPage.tsx:370-379` | Hand-rolled CSS-grid table (`role="table"`, 8 fixed columns) — **file appears DEAD**: /testhub/defects routes to the canonical wrapper (`FullAppRoutes.tsx:682` → `pages/testhub/DefectsPage.tsx`), no route imports `defects/DefectsPage.tsx` | Delete or fold into canonical wrapper | grep of FullAppRoutes + file |
| V5 | `src/pages/testhub/cycles/CycleDetailPage.tsx:636-645` | Hand-rolled right drawer: `createPortal` + fixed overlay + fixed 480px panel, manual Escape listener, zIndex 8000/8001 | CatalystViewBase panel mode / CatalystDetailRouter (test_case short-circuit already exists), or `@atlaskit/drawer` | sed output :630-650 |
| V6 | `src/pages/testhub/sets/SetDetailPage.tsx:151-170` (and second dialog at :324) | Hand-rolled centered modal: `createPortal` + fixed overlay + translate(-50%,-50%) card | `@atlaskit/modal-dialog` | sed output :148-170 |
| V7 | `src/pages/testhub/sets/TestSetsPage.tsx:189-215` | Hand-rolled dropdown/kebab menu: portal div `role="menu"` + manual onMouseEnter/Leave hover styling | `@atlaskit/dropdown-menu` or JiraTable `makeRowMenuCell` / `contextMenuActions` | sed output |
| V8 | `src/components/testhub/AIGenerateTestCasesDialog.tsx:28-50` | shadcn/`@/components/ui/*` stack (dialog, button, textarea, input, label, switch, progress, scroll-area, select, collapsible, separator) — banned hand-rolled/non-ADS UI layer | @atlaskit/modal-dialog + @atlaskit primitives | import list |
| V9 | `src/components/testhub/versioning/VersionDiffView.tsx:7-10` | shadcn Dialog/Select/ScrollArea | @atlaskit/modal-dialog + @atlaskit/select | import list |
| V10 | Whole module: 0 grep hits for `StatusLozenge` under testhub; 12+ files import raw `@atlaskit/lozenge` for status (CycleDetailPage:21, CyclesPage:13, RepositoryPage:31, TraceabilityPage:5, defects/DefectsPage:4, SetDetailPage:6, ReportStatusView:8, ReportNavigator:2, ReportCanvas:2, 6 report bodies) | Work-item/case statuses should render via canonical `StatusLozenge` (`appearance` override sanctioned for test-domain values like PASS/FAIL) | grep outputs |
| V11 | `src/styles/testhub.css:765-775` `.th-badge-*` classes | Hand-rolled status pill CSS classes; lines 771-772 have **bare `rgba(6,182,212,0.1)` / `rgba(215,119,6,0.1)`** (no token, color-law violation); other badges use nonsense double-fallbacks like `var(--ds-link, var(--ds-link))` | StatusLozenge / @atlaskit/lozenge; delete .th-badge-* | sed output :771-775 |
| V12 | 12 inline `var(--ds-*, rgba(…))` hex/rgba fallbacks in pages (CycleDetailPage:638,642; CaseDrawer:182; SetDetailPage:155,166,324; TestSetsPage:193,198,204,210,328,447) + ~30 matches in testhub.css | CLAUDE.md bans fallback colors in `var(--ds-*, #fallback)` — token-only | grep count output (12) |
| V13 | `src/pages/testhub/repository/CaseDrawer.tsx` (401 lines) | Create/edit path is a form modal (@atlaskit/modal-dialog — acceptable primitive) but duplicates the detail-view role: full case view should be `CatalystViewTestCase` via CatalystDetailRouter (router comment: "Coexists with CaseDrawer (create path)" — CatalystDetailRouter.tsx:33). Row click from MyWork navigates to `?case=<id>` opening CaseDrawer, not the canonical view | Route detail to CatalystViewTestCase; keep CaseDrawer only for create, or replace with CreateStoryModal-style flow | CaseDrawer.tsx:1-60; MyWorkPage.tsx header comment |
| V14 | `src/pages/testhub/cycles/ExecutionPage.tsx` (949 lines) | Bespoke execution runner: hand-rolled two-pane layout, grid detail panes (:709), custom offline queue — no canonical shell (no CatalystViewBase/ProjectPageHeader breadcrumb chrome). Uses ADS primitives (ModalDialog, Textarea, Spinner) so it is primitive-compliant but layout is fully bespoke | Wrap in canonical page chrome; consider CatalystViewBase panel mode for the case pane | ExecutionPage.tsx:1-30, 709 |
| V15 | `src/pages/testhub/traceability/TraceabilityPage.tsx:6` | Uses raw `@atlaskit/dynamic-table` instead of JiraTable, and raw Lozenge with local `execAppearance()` color mapping (:35-40) | JiraTable + StatusLozenge appearance override | file head |
| V16 | Local `EmptyState` re-implementations: `SetDetailPage.tsx:758` (`function EmptyState({message,action})`), `ReportEmptyState` (`reports/lab/ReportEmptyState`), plus centered-div empties in CycleDetailPage:415-420 | `@/components/ads/EmptyState` (wraps @atlaskit/empty-state); errors → SectionMessage + Retry | grep + sed outputs |
| V17 | Breadcrumbs: 0 grep hits for "Breadcrumb" under src/pages/testhub | Detail pages (CycleDetailPage, SetDetailPage, ExecutionPage) lack the canonical breadcrumb band (ProjectChromeBand / ads Breadcrumbs) that project-hub pages carry | grep output (empty) |
| V18 | Duplicate page pairs: `pages/testhub/DefectsPage.tsx` (routed) vs `pages/testhub/defects/DefectsPage.tsx` (468-line hand-rolled, unrouted) — dead parallel implementation contradicting "move not copy" | Delete dead file after confirming no imports | FullAppRoutes.tsx:179,682 |

### 2.3 Route inventory (FullAppRoutes.tsx:162-181, 666-682)

/testhub → dashboard; /testhub/{dashboard, my-work, board, repository, cycles, defects, filters, filters/:id, filter-preview} + /testhub/:projectKey/cycles/:cycleKey (CycleDetailPage), ExecutionPage, sets + SetDetailPage, traceability, reports (ReportsHubPage), timeline, dependencies.

---

## PART 3 — GAP SUMMARY FOR PLAN LOCK

1. **Table consolidation:** 4 hand-rolled table/grid surfaces (V1-V4) → JiraTable with prefab cells; JiraTable already proves TM typing works (`JiraTable<TMCycle>`, `JiraTable<TMTestCase>`).
2. **Detail-view unification:** CatalystViewTestCase + CatalystViewTestCycle already exist and are routed by CatalystDetailRouter — TestHub pages just don't open them (V5, V13). Biggest leverage, lowest risk.
3. **Modal/menu primitives:** replace 2 hand-rolled portals modals + 1 hand-rolled menu + 2 shadcn dialogs (V6-V9).
4. **Status pill unification:** introduce StatusLozenge (with `appearance` override for PASS/FAIL/BLOCKED/DRAFT domains), delete `.th-badge-*` CSS (V10-V11).
5. **Color-law debt:** 12 inline rgba fallbacks + testhub.css lines incl. 2 bare rgba (V11-V12) — ratchet baselines down after fix.
6. **Chrome/empty-state polish:** breadcrumbs on detail pages, ads EmptyState/SectionMessage (V16-V17).
7. **Dead code deletion:** `pages/testhub/defects/DefectsPage.tsx` (V18).
