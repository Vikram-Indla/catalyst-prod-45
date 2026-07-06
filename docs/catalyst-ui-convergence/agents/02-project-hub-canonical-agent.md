# Agent 02 — Project Hub Canonical Inventory

> UI-convergence discovery, Agent 02 of 10. CODE-ONLY pass (browser probing owned by agents 04–06).
> Project Hub is the SOURCE OF TRUTH that Release Hub / Test Hub / Incident Hub / Defect surfaces converge to.
> Date: 2026-07-03. Repo: `catalyst-prod-45` @ main (7437425c8).

---

## Scope covered

All Project Hub surfaces reachable under `/project-hub/*` plus the shared canonical components they compose:

| Surface | Route | Page component |
|---|---|---|
| Hub landing (smart redirect) | `/project-hub` | `ProjectHubLanding` — `src/components/layout/HubLanding.tsx:38` |
| Projects directory | `/project-hub/projects` | `AllProjectsPage` — `src/pages/project-hub/AllProjectsPage.tsx:37` |
| Dashboard (summary) | `/project-hub/:key/dashboard` | `ProjectDashboardPage` — `src/pages/project-hub/ProjectDashboardPage.tsx:140` |
| Backlog (unified) | `/project-hub/:key/backlog` | `NativeBacklogPage` — `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (8,894 lines) |
| Backlog full-page detail | `/project-hub/:key/backlog/:issueKey` | `BacklogDetailPage` — `src/modules/project-work-hub/pages/BacklogDetailPage.tsx:28` |
| All Work | `/project-hub/:key/allwork` | `ProjectJiraLayout` → `ProjectAllWorkView` — `src/pages/project-hub/jira-list/ProjectJiraLayout.tsx:1-67`, `ProjectAllWorkView.tsx:20` |
| All Work detail | `/project-hub/:key/allwork/:issueKey` | `AllWorkDetailPage` — `src/modules/project-work-hub/pages/AllWorkDetailPage.tsx` |
| Board (kanban) | `/project-hub/:key/board`, `/boards/:boardSlug` | `KanbanPage` — `src/features/kanban-board/KanbanPage.tsx:58-588` |
| Board manager | `/project-hub/:key/boards` | `ProjectBoardManagerPage` → `BoardManagerPage` — `src/components/boards/BoardManagerPage.tsx:31` |
| Board settings / map statuses | `/boards/:slug/settings`, `/map-statuses` | `ProjectBoardSettingsPage.tsx`, `MapStatusesPage.tsx` |
| Timeline | `/project-hub/:key/timeline` | `ProjectHubTimelinePage` — `src/pages/project-hub/timeline/ProjectHubTimelinePage.tsx:74` |
| Sprints | `/project-hub/:key/sprints` (+ detail/work) | `SprintsPage` — `src/pages/project-hub/SprintsPage.tsx:58-451` |
| Releases (in-project) | `/project-hub/:key/releases` | `ReleasesPage` — `src/pages/project-hub/ReleasesPage.tsx:53-529` |
| Dependencies | `/project-hub/:key/dependencies` | `DependenciesPage` — `src/pages/project-hub/DependenciesPage.tsx:22-94` |
| Filters | `/project-hub/:key/filters` (+ create/:filterId) | `FiltersListPage.tsx:15`, `FilterPreviewPage.tsx` — `src/pages/project-hub/filters/` |
| Roadmaps | `/project-hub/:key/roadmaps` | `RoadmapsListPage` — `src/pages/project-hub/roadmaps/RoadmapsListPage.tsx:8` |
| Universal issue detail | `/browse/:issueKey` | `IssueFullPage` (mounts `CatalystDetailRouter`) — `src/pages/IssueFullPage.tsx` |

Out of scope (placeholders): `/reports`, `/sprint-predictor`, `/risk-scanner` (`PHPlaceholderPage`).

---

## Routes inspected (code-level)

- Route builders: `src/lib/routes.ts:18-54` (`projectHubRoutes` → exported via `Routes.projectHub`). Slug/key contract: `:key` project display key, `:issueKey` display key, `:boardSlug`/`:sprintSlug`/`:filterSlug` frozen slugs. No UUID params.
- Mounting: `src/App.tsx:247` (`/project-hub` landing, outside CatalystShell), `src/App.tsx:255-256` (excluded-key redirects `ProjectHubKeyRedirect`), full block in `src/routes/FullAppRoutes.tsx:1030-1077`.
- Legacy redirects: per-type backlogs → unified backlog (`FullAppRoutes.tsx:1043-1045`), `/kanban` → boards (`:1055`), UUID board URLs → slug (`src/routes/BoardUuidRedirect.tsx`).
- Landing rule: recency-first synchronous redirect, membership fallback with spinner — `src/components/layout/HubLanding.tsx:38-55`.

## Screenshots captured

N/A — code pass; browser agents 04–06 own screenshots.

---

## 1. Layout skeleton — the canonical page shell

**Pattern PH-SHELL:**
```
CatalystShell (src/components/layout/CatalystShell.tsx — app chrome, top nav, left sidebar)
 └─ AtlaskitPageShell (src/components/ads/AtlaskitPageShell.tsx — flush | chromeBand | cardPadding)
     └─ ProjectPageHeader (src/components/layout/ProjectPageHeader.tsx)
         breadcrumb ("Projects / <Project> / <RouteWord>") + <h2> RouteWord + WorkItemStarButton
     └─ Toolbar row (surface-specific)
     └─ Content (table | board | grid)
```

- **`ProjectPageHeader`** — `src/components/layout/ProjectPageHeader.tsx:1-40`. Vikram directive 2026-06-14: ALL project-hub and product-hub routes render breadcrumb + H2 (`14px/400 var(--ds-text-subtlest)` crumbs; `24px/653/28px var(--ds-text)` title). Uses `Breadcrumbs` from `@/components/ads`, `@atlaskit/heading`, `ProjectIcon` crumb icon, entity crumb icons (`AkReleaseIcon`, `AkSprintIcon`, `AkTargetIcon`, `AkRoadmapIcon` at xsmall/12px). `hubType: 'project' | 'product'` prop. Used by: Backlog (`BacklogPage.atlaskit.tsx:4237`), Dashboard (`ProjectDashboardPage.tsx:616`), Board (KanbanPage), Sprints (`SprintsPage.tsx:329`), Releases (`ReleasesPage.tsx:407-411`), AllProjects, Filters, Roadmaps, Timeline.
- **`CatalystListPageLayout`** — `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx:61+`. Canonical list-page composition: owns `AtlaskitPageShell` wrapper (`:23`), optional `CatalystQuickTabBar`, `CatalystListToolbar` (search + filters), `CatalystBulkActionBar` (when selection > 0), children (table), footer count. Used by Sprints, Releases, Filters, Roadmaps — this is the shell destination hubs should adopt for list surfaces.
- Breadcrumbs removed from Backlog per 2026-05-02 directive (sidebar owns nav) — `BacklogPage.atlaskit.tsx:4224-4336` chrome band uses `ProjectPageHeader` instead of retired `ProjectChromeBand`.

## 2. Table canon — JiraTable

**`JiraTable<TRow>`** — `src/components/shared/JiraTable/JiraTable.tsx:120` (3,198 lines). Canonical Jira-style work-item table (Round H, plain `<table>` on TanStack virtualizer; `@atlaskit/dynamic-table` retired Apr 2026).

Conventions baked in (all file:line in JiraTable.tsx):
- **Density**: `compact` default = 40px row / 14px cell / 12px header / 24px avatar; `comfortable` = 48px row / 32px avatar (`:69-91`).
- **Header**: sticky, `var(--ds-surface-sunken)` band, 12px/653 `var(--ds-text-subtle)` Title Case labels, hover-revealed sort arrow + 3-dot column menu (`:796-875`).
- **Rows**: hover tint `var(--ds-background-neutral-subtle-hovered)`; focused row = 3px `var(--ds-link)` left bar + sunken bg (`:514-568`); grid lines via `inset 0 -1px 0 var(--ds-border)`.
- **Keyboard**: `j/k/↑/↓/Enter/Esc` nav (`:440-506`); Enter opens row (`onRowClick`), Esc clears focus / `onEscape`.
- **Key props** (`types.ts` `JiraTableProps`): `columns`, `data|groups`, `getRowId`, `onRowClick`, `onCellEdit`, `selectable+selection+onSelectionChange` (shift-click range `:1145-1173`), `sortKey/sortOrder/onSortChange`, `columnVisibility/onColumnVisibilityChange` (column manager `+` in `__actions` header), `collapsedGroups/onToggleGroup`, `expandedRowIds/getRowHasChildren/onToggleRowExpanded` (hierarchy chevrons — gate expand slot on actual expandability, see MEMORY jiratable-chevron-slot-gating), `enableColumnReorder/columnOrder`, `enableVirtualization`, `enableStickyCreateFooter/stickyCreateFooter`, `initialColumnWidths/onColumnWidthsChange` (drag-resize `:349-407`), `contextMenuActions` (right-click menu `:186-229`), `renderRowDragHandle` (hover-revealed 6-dot grip), `density`, `isLoading`, `emptyView`.
- **Runtime config**: `useComponentConfig('jira-table', …)` — /admin/components publishes flag overrides; explicit caller props win (`:176-183`).
- **Satellites**: `cells.tsx` (33K — `makeKeyCell`, `makeSummaryInlineEditCell`, `makeStatusEditCell`, `makeAssigneeEditCell`, `makePriorityEditCell`, `makeParentEditCell`, `makeDateCell/makeDateEditCell`, `makeLabelsEditCell`, `makeCommentsCell`, `makeSprintReleaseCell`, `makeRowActionsCell/makeRowMenuCell`), `editors.tsx` (76K — portal `EditorPopover` engine), `BulkFooterBar.tsx:13-59` (`selectedCount/onSelectAll/onDeselectAll/onDelete/onMove/onTransition`), `ToolbarMenuButton.tsx:28-242` (portal menu, keyboard nav), `ColumnHeaderMenu.tsx:19-60` (sort/move/remove/resize/reset + submenu), `ResizeColumnDialog.tsx`, `flags.tsx` (`flag.success()/flag.error()` toast canon), `types.ts` (Column schema: `id/label/width(fraction×12→px)/sortable/alwaysVisible/hidden/lockedPosition/align/cell`).

**Consumers on Project Hub**: Backlog (via BacklogTable fork, below), Board manager (`BoardManagerPage.tsx:31+`), Filters list (`FiltersListPage.tsx:15+`), Roadmaps list (`RoadmapsListPage.tsx:17`), SprintsTable (`src/components/sprints/SprintsTable.tsx:45-120`), ReleasesTable (`src/components/releases/ReleasesTable.tsx`). ~29 consumers repo-wide.

**`BacklogTable`** — `src/components/shared/BacklogTable/` — verbatim fork of JiraTable created 2026-06-30 so grouped backlog can be tuned to Jira-list parity without touching the other 29 consumers; shares types/cells/editors/flags/menus from the JiraTable directory (`BacklogTable/index.ts:1-22`). See High-risk findings.

### Backlog invocation (reference contract, `BacklogPage.atlaskit.tsx:4571-5035`)

`<BacklogTable<BacklogItem>` with: `groups` (group-by status/type/assignee/reporter/parent/sprint_release), `collapsedGroups/onToggleGroup`, `enableGroupCreateButton`, `expandedRowIds` + `getRowHasChildren={(row) => showHierarchy && childrenOf.has(row.id)}`, `enableVirtualization`, `enableColumnReorder`, `rowsPerPage={0}` (no pagination), `enableStickyCreateFooter` + `stickyCreateFooter` (`:4768-4823`), `renderGroupInlineRow` (per-group inline create `:4679-4740`), drag ranking via Pragmatic DnD → `sort_order` (`:4898-4911`; drag grip hidden while column-sorted).

Column schema (`:3102-3750`): default visible `['key','status','parent','assignee']` + sprint_release, priority, created (`:2540`). `key` = composite Work cell (type icon 16px + key link + inline-editable summary + hover actions "↗ open" / "+ create child"). BR-adapter columns (request_type/category/theme/urgency) exist for product mode.

## 3. Board canon — features/kanban-board

**`KanbanPage`** — `src/features/kanban-board/KanbanPage.tsx:58-588`, multi-mode (`project|product|incident|tasks|release|test`).

- Composition: `ProjectPageHeader` (+ board-switcher PortalMenu `:412-420`) → `Toolbar` (`components/Toolbar.tsx:115-257`: Textfield search, `AvatarFilter`, `CanonicalFilter`, group-by PortalMenu, view-settings PortalMenu, more-actions PortalMenu) → `Board` (`components/Board.tsx:150-461`) with `SwimlaneHeader` (`:309-341`), `ColumnHeader` (`Column.tsx:21-52` — uppercase name, count badge, WIP `{count}/{max}` warning/exceeded colors), `ColumnBody` (flex, virtualization disabled 2026-06-15), `DraggableCard` → `Card` (`Card.tsx:63-317`).
- **DnD**: `@atlaskit/pragmatic-drag-and-drop` (+hitbox closest-edge, +react-drop-indicator). `@dnd-kit` only on `MapStatusesPage.tsx:15-17`. Done-category cards frozen (reject drags, 2026-06-21).
- **Card anatomy** (Card.tsx): cover (`:123-141`), ⋯ context menu (`CardContextMenu.tsx`, hover-revealed `:142-146`), editable summary (`:178-217`), epic Lozenge (`:223-227`), due-date chip (danger when overdue `:230-241`), footer = `IssueTypeIcon` (→ JiraIssueTypeIcon) + key + `DesignPopover` + flag icon + `PriorityIcon` (→ CanonicalPriorityIcon) + `CatalystAvatar`/UnassignedAvatar (`:248-312`).
- **Card click** → `useGlobalSearchStore.getState().openDetail({ id: issueKey })` → canonical Catalyst detail (KanbanPage.tsx:382-394).
- **Inline create**: column-footer "+ Create" → `InlineCreateCard` (`src/components/kanban/InlineCreateCard.tsx:1-100`) — TextArea + CRE-filtered type dropdown + calendar portal + debounced assignee search; one open form per board.
- Sizing constants (`constants.ts:44-83`): COLUMN_WIDTH 272, COLUMN_HEADER_HEIGHT 40, CARD_RADIUS 4, CARD_PADDING 12, CARD_GAP 12.
- States: Spinner large (`KanbanPage.tsx:478-480`), `@atlaskit/empty-state` "Your board is empty" (`:482-484`), `SectionMessage` error + Retry (`:469-476`).

## 4. Detail canon — CatalystDetailRouter / CatalystViewBase

- **`CatalystDetailRouter`** — `src/components/catalyst-detail-views/CatalystDetailRouter.tsx:64-69`. Dispatches by normalized `itemType` to `CatalystViewStory/Epic/Feature/Task/Subtask/Defect/Incident/BusinessRequest/Idea/TestCase/TestCycle`. Props: `isOpen/onClose/itemId/itemType/projectId/projectKey/panelMode/fullPageMode/onTogglePanelMode/navigationItems/onNavigate/entityKind`.
- **`CatalystViewBase`** — `shared/CatalystViewBase.tsx` — base shell for all detail views: modal OR side-panel OR full-page mode, resizable columns, top bar + breadcrumb slot, print/share rules (tested in `shared/__tests__/`).
- **`CatalystKeyDetails`** — `shared/sections/CatalystKeyDetails.tsx:39-47` + exported `KeyDetailsFieldRow` factory (responsive label width via ResizeObserver). **`CatalystTitleEditor`** — `shared/sections/CatalystTitleEditor.tsx` (@atlaskit/inline-edit + heading H1). **`WatchersChip`** — `catalyst-detail-views/shared/WatchersChip.tsx:56-173` (`issueKey` prop; eye toggle + count popover, capture-phase Escape guard).
- **Mounting patterns on Project Hub**:
  - Backlog row → **`CatalystDetailPanel`** side panel (`src/components/shared/CatalystDetailPanel.tsx`, 35K) — resizable, width persisted in localStorage; invoked `BacklogPage.atlaskit.tsx:5054-5092` (`itemId/itemType/projectKey/projectId/onOpenFullPage/width/onResize`).
  - Full page → `BacklogDetailPage.tsx` / `AllWorkDetailPage.tsx` / `/browse/:issueKey` mount `CatalystDetailRouter` in fullPageMode.
  - Board card → `useGlobalSearchStore.openDetail` modal.
  - All Work → split view: `WorkListPanel` (`src/components/WorkListPanel/WorkListPanel.tsx:21-57`, 360px left rail) + `CatalystDetailRouter` right (`ProjectAllWorkView.tsx:113`).

## 5. Modal / drawer canon

| Purpose | Component | File |
|---|---|---|
| Create work item (canonical) | `CreateStoryModal` | `src/components/workhub/create-story/CreateStoryModal.tsx` — @atlaskit/form + select + ProseMirror ADF editor + StatusLozengeDropdown; `defaultWorkType` prop; `isDefect` branch → `tm_defects` (see MEMORY defect-creation-canonical-qabug) |
| Danger confirm (type-to-confirm) | `DangerConfirmModal` | `src/components/shared/DangerConfirmModal.tsx` |
| Bulk ops | `BulkDeleteModal/BulkMoveModal/BulkTransitionModal/BulkWizardModal` | inline in `BacklogPage.atlaskit.tsx:5169-5505` |
| Workflow reason capture | `ReasonCaptureModal` | `catalyst-detail-views/shared/workflow/ReasonCaptureModal.tsx` (WF_REASON_REQUIRED retry pattern) |
| Create sprint / release | `SprintCreateModal`, `ReleaseCreateModal` (+ Archive/Merge/Confirmation/Delete dialogs shared release↔sprint) | `SprintsPage.tsx:391-448`, `ReleasesPage.tsx:460-527` |
| Create board | `CreateBoardModal` | `src/components/boards/CreateBoardModal.tsx` |
| Create project | `CreateSpaceModal` | mounted `AllProjectsPage.tsx:500-509` |
| Side drawer (modal detail) | `CatalystSideDrawer` | mounted `BacklogPage.atlaskit.tsx:5119-5128` |

All modals: `@atlaskit/modal-dialog` + `ModalTransition`. Dashboard kebab is self-rolled to dodge an @atlaskit/popup (0,0) positioning bug (`ProjectDashboardPage.tsx:46-118`).

## 6. Filter / search / toolbar canon

- **`CatyAiSearch`** (`src/components/caty/CatyAiSearch.tsx`) — branded AI search bar w/ sparkle + ask-Caty toggle → `AskCatyInlineBar` (Backlog `:4402`, `:4350-4356`).
- **`CanonicalFilter`** — multi-facet filter (status/assignee/type/priority/labels + saved filters), used on Backlog (`:4416`) and Board (`Toolbar.tsx:174-183`). Saved-filter scoping: `backlogFilterScope.ts:23-48` (`isFilterRelevantToBacklog`).
- **`MemberFilterAvatars`** / `AvatarFilter` — avatar-stack assignee filter (Backlog `:6418-6595`; Board `Toolbar.tsx:56-83`).
- **Group-by**: portal dropdown control, options none/status/type/assignee/reporter/parent/sprint_release (Backlog `:6598-6840`; Board group-by menu).
- **Per-column filtering**: header chevron → `ColumnFilterMultiSelect` (status/assignee/priority) — Backlog column schema `:3350-3471`.
- **List toolbars** (Sprints/Releases/Filters/Roadmaps): `@atlaskit/textfield` search (300ms debounce) + `@atlaskit/select` (with `portalSelectStyles` from `src/lib/select-portal-styles`) + eye-toggle status visibility + `ToolbarMenuButton` view options (density, expand/collapse all).
- **Projects directory**: `@atlaskit/tabs` (All / My Projects / Starred) with Lozenge counts — `AllProjectsToolbar.tsx:96-151`.

## 7. Status pill / lozenge / icon / avatar canon

| Pattern | Canonical component | File | Notes |
|---|---|---|---|
| Status pill | **`StatusLozenge`** | `src/components/shared/StatusLozenge/StatusLozenge.tsx` | THE canonical pill (CAT-ADS-STATUSPILL-UNIFY-20260629-001). Sizes `sm` 20px / `md` 32px. `statusToAppearance(status, category)` → `statusToLozenge` table; colors from `statusPalette.ts` (ADS *-bold + `--ds-text-inverse`), zero hex, WCAG AA. Editable variant: `StatusLozengeDropdown.tsx` |
| Status palette | `statusPalette.ts` | `catalyst-detail-views/shared/sections/statusPalette.ts` | single source of status→color; `statusBg/statusFg/statusFgSubtle` |
| Issue type icon | **`JiraIssueTypeIcon`** | `src/components/shared/JiraIssueTypeIcon.tsx` (impl in `src/lib/jira-issue-type-icons.tsx`) | 16px in table cells/cards; icon contract: work items ALWAYS get type icon wherever listed |
| Work type icon (registry) | `WorkItemTypeIcon` | `src/components/icons/WorkItemTypeIcon.tsx:52-140` | 14 canonical types, /admin/icons overrides, light/dark |
| Priority icon | **`PriorityIcon`** | `src/components/icons/PriorityIcon.tsx:20-66` (registry) — re-exported/wrapped by `src/components/shared/PriorityIcon.tsx` and `src/features/kanban-board/components/PriorityIcon.tsx` | 6 tiers, admin overrides |
| Avatar | **`CatalystAvatar`** | `src/components/shared/CatalystAvatar.tsx:23-80` | deterministic initials fallback (`colorForName`), bans third-party avatar CDNs; face avatar + name tooltip contract |
| Assignee editor | `EditableAssignee` | `src/components/EditableAssignee/EditableAssignee.tsx:27-51` | portal picker + PresenceRing |
| Project icon | **`ProjectIcon`** | `src/components/shared/ProjectIcon.tsx:50-240` | canonical (admin override → registry → Lucide-on-tinted-square → stock); `solid|ghost` variants; also `ProjectAvatar` registry (`src/components/icons/ProjectAvatar.tsx:28-130`) |
| Health badge | `ProjectHealthBadge` / `HealthStatusBadge` | `src/components/projecthub/ProjectHealthBadge.tsx`, `src/components/business-request/HealthStatusBadge.tsx` | |
| Key link | `IssueKeyLink` | `src/components/shared/IssueKeyLink.tsx` | |
| Generic lozenge | `@atlaskit/lozenge` (or `src/components/ads/Lozenge.tsx` wrapper) | | component owns color; epic chip on board cards |

## 8. Empty / loading / error canon

| State | Canonical pattern | Evidence |
|---|---|---|
| Page loading | `@atlaskit/spinner` size="large" centered with label | `HubLanding.tsx:27-36`, `BacklogPage.atlaskit.tsx:4059-4066`, `KanbanPage.tsx:478-480` |
| List loading | skeleton rows (pulse) | `AllProjectsPage.tsx:256-297`, `ProjectDashboardPage.tsx:646-658` |
| Primary query error | `SectionMessage` appearance="error" + title + **Retry action** (never `{data}`-only destructure — see MEMORY silent-query-error-sweep) | `src/components/ads/SectionMessage.tsx:18-46`; `BacklogPage.atlaskit.tsx:4073-4097`; `SprintsPage.tsx:347-365`; `KanbanPage.tsx:469-476` |
| True empty (0 items) | `@atlaskit/empty-state` or icon + heading + description + CTA | `KanbanPage.tsx:482-484`; `AllProjectsPage.tsx:298-341`; `src/components/empty-states/EmptyBoardState.tsx:10-62`, `EmptyTimelineState.tsx:10-54` |
| Filtered empty | icon + "No items match…" + Clear-filters button | `BacklogPage.atlaskit.tsx:4954-5024`; `SprintsPage.tsx:386-388` |
| Toasts | `flag.success()/flag.error()` from `JiraTable/flags`, `catalystFlag` wrapper (`src/lib/catalystFlag`) | `AllProjectsPage.tsx:22,160`; `SprintsPage.tsx:26` |
| Unknown data | render nothing (dash/null) — zero-assumption rule | CLAUDE.md contract; enforced in cells |

## 9. ADS token conventions

- Pattern: `token('color.text', 'var(--ds-text)')` from `@atlaskit/tokens`, or raw `var(--ds-*)` (no hex fallbacks in new code). Legacy `--cp-*` fallback chains persist inside JiraTable's injected CSS (`JiraTable.tsx:59-61,526`) — pre-existing debt under the ratchet gate (`design-governance/color-baseline.json`, `npm run lint:colors:gate`).
- Header/typography canon: table header 12px/653 `var(--ds-text-subtle)`; body cell 14/20/400 `var(--ds-text)`; page H2 24px/653; breadcrumbs 14/400 `var(--ds-text-subtlest)`.
- Component-owned color: Lozenge/StatusLozenge/Badge/PriorityIcon own their colors; callers pass no color props.
- Documented exceptions: board epic identity palette (hardcoded, CAT-KANBAN-EPIC-COLOR-20260702-001, `Board.tsx:23`); a few rgba fallbacks inside token() calls (`Board.tsx:97,410`, `Card.tsx:234`) — inert under increase-only ratchet; `AIIntelligenceButton` rainbow is the only sanctioned rainbow.

## 10. Interaction conventions

- **Row click** → side detail panel (backlog/all-work/timeline) or route navigate (sprints/releases/filters/roadmaps) or global detail modal (board). Key-cell click vs row body handled inside `makeKeyCell`.
- **Hover actions** on Work cell: "↗ open in panel" + "+ create child" (display:none at rest, `JiraTable.tsx:1095-1103`).
- **Kebab / context menus**: row ⋯ via `makeRowActionsCell` (canonical 8+ item list — View, Comment, Log work, Agile board, Rank top/bottom, Attach, Open in Jira, Copy link, Duplicate, Delete-danger — `BacklogPage.atlaskit.tsx:2846-2972`); right-click context menu via `contextMenuActions`; portal menus use `ToolbarMenuButton`/`PortalMenu` pattern (Atlaskit popup workaround) with capture-phase Escape.
- **Inline edit**: every editable cell is a `make*EditCell` factory + `EditorPopover`; summary uses Atlaskit InlineEdit with `.cv-cell-inline-edit-no-label` CSS surgery (`JiraTable.tsx:577-686`); ghost affordances (`data-jira-cell-ghost`, italic subtlest "Set status"/"Unassigned").
- **Inline create**: sticky footer "+ Create" row, per-group "+", per-row insert-above; board column-footer `InlineCreateCard`. Type options filtered through Catalyst Rules Engine (`filterCreatableTypes`, `@/lib/catalyst-rules`).
- **Keyboard**: j/k/arrows/Enter/Esc in tables; Esc closes popovers before panel (SubtasksPanel guard `JiraTable.tsx:489-500`); Enter submits inline create.
- **DnD**: Pragmatic drag-and-drop everywhere (rank in backlog, cards on board, widgets on dashboard); long-press-to-drag grip on backlog rows; drag grip hidden while sorted/grouped.
- **Bulk**: checkbox column + shift-click range + `BulkFooterBar` + bulk modals.
- **Starring**: `WorkItemStarButton` in page header; star column in list tables; single star model `user_starred_items`.

---

## Findings count

**47 cataloged patterns/components** across 17 surfaces; **10 high-risk findings** below.

## High-risk findings

1. **BacklogTable fork of JiraTable** (`src/components/shared/BacklogTable/`, 2026-06-30). Two copies of the 146K canonical table now evolve in parallel (fork already diverging toward Jira-list parity). Convergence work must pick ONE target; destination hubs should not clone a third.
2. **Six competing status-pill implementations**: canonical `StatusLozenge` vs `src/modules/in-jira/components/StatusPill.tsx`, `src/components/incidents/TablePill.tsx`, releases table pill (`src/components/releases/ReleasesTable.tsx`), `JiraStatusPill` (`src/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components.tsx`), `OkrStatusPill` (`src/modules/okr-v2/…`). Destination hubs (Incident/Release) are on non-canonical pills today.
3. **AllProjectsTable is a custom `<table>`** (`src/components/projecthub/AllProjectsTable.tsx`, 56.8K, ResizableTableHeader) — not JiraTable; and **ProjectDetailPanel uses shadcn/ui Sheet** (`src/components/projecthub/ProjectDetailPanel.tsx`) — non-Atlaskit drawer on a flagship surface.
4. **Three PriorityIcon files** (`components/icons/`, `components/shared/`, `features/kanban-board/components/`) — wrappers today, drift risk tomorrow.
5. **Two breadcrumb systems**: `@/components/ads` Breadcrumbs (used by ProjectPageHeader — canonical) vs shadcn `src/components/ui/breadcrumb.tsx` (Radix) still exported.
6. **Two CreateStoryModal files**: canonical `src/components/workhub/create-story/CreateStoryModal.tsx` vs legacy `src/components/stories/CreateStoryModal.tsx`.
7. **Detail-open divergence across Project Hub itself**: backlog → CatalystDetailPanel side panel; board → `useGlobalSearchStore.openDetail` modal; sprints/releases/filters → route navigation. Convergence spec must declare the per-surface rule explicitly.
8. **Legacy parallel shell**: `src/components/project-hub/shell/` (TopNav/Sidebar/SidebarProjectNav with its own TYPE_COLORS) coexists with CatalystShell; SidebarProjectNav still lists retired per-type backlogs. Likely dead — verify before mirroring.
9. **BacklogPage.atlaskit.tsx is 408K / 8,894 lines** with page-local implementations of GroupByControl, MemberFilterAvatars, bulk modals, archive/delete modals — patterns other hubs will want are trapped in one file.
10. **MapStatusesPage still on @dnd-kit** (`MapStatusesPage.tsx:15-17`) while the deprecation memo (Phase 2 due 2026-05-25) says Pragmatic DnD is the target.

## Evidence references

- `src/lib/routes.ts:18-54`; `src/App.tsx:244-290`; `src/routes/FullAppRoutes.tsx:41-77,1030-1077`
- `src/components/shared/JiraTable/JiraTable.tsx:1-1250` (read directly); `BacklogTable/index.ts:1-22` (read directly)
- `src/components/layout/HubLanding.tsx:1-74`, `src/components/layout/ProjectPageHeader.tsx:1-40` (read directly)
- `src/components/shared/StatusLozenge/StatusLozenge.tsx:1-40` (read directly)
- Sub-inventory sweeps (this session, 4 parallel Explore agents): backlog/all-work (BacklogPage.atlaskit.tsx:2540-8894 sampled, ProjectAllWorkView, BacklogDetailPage, backlogFilterScope.ts), board (KanbanPage/Board/Column/Card/Toolbar/DraggableCard/InlineCreateCard/BoardManagerPage), dashboards/sprints/releases/timeline/dependencies/filters/roadmaps (AllProjectsPage/ProjectDashboardPage/SprintsPage/ReleasesPage/ProjectHubTimelinePage/DependenciesPage/FiltersListPage/RoadmapsListPage), shared components (CatalystDetailRouter/CatalystViewBase/CatalystKeyDetails/WatchersChip/CreateStoryModal/icons/avatars/empty-states/JiraTable satellites). Line refs above come from those reads.

## Confidence level

**HIGH** for: routes, JiraTable contract, backlog/board/list-page composition, status/icon/avatar canon, empty-error-loading canon (all read from source with line evidence).
**MEDIUM** for: exact line numbers inside the two giant files (BacklogPage.atlaskit.tsx, TimelineView.tsx — sampled, not exhaustively read); CatalystViewBase internal region layout; whether `src/components/project-hub/shell/*` is mounted anywhere live.
Not verified visually — code-only pass by design.

## Open questions

1. Is `src/components/project-hub/shell/` (TopNav/Sidebar) dead code or mounted on any live route? (Grep of route files suggests CatalystShell owns chrome; needs confirmation before agents 03/07 map against it.)
2. Which detail-open behavior is the convergence target — side panel (backlog), global modal (board), or route (sprints/releases)?
3. Is BacklogTable intended to merge back into JiraTable after parity tuning, or is the fork permanent? (Affects whether destination hubs adopt JiraTable or BacklogTable.)
4. AllProjectsTable + ProjectDetailPanel (shadcn Sheet): grandfathered or slated for JiraTable + Atlaskit drawer rewrite?
5. `WorkListPanel`/`IssueDetailPane` are marked F-phase placeholders — are they canon for All-Work split view or interim?
6. Should `CatalystListPageLayout` be mandated for ALL destination-hub list surfaces (it already covers sprints/releases/filters/roadmaps)?
