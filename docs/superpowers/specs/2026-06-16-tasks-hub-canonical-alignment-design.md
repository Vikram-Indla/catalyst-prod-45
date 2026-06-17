# Tasks Hub — Canonical Project Hub Alignment

**Date:** 2026-06-16
**Branch:** `tasks-hub-canonical-alignment`
**Status:** Approved design, pending implementation plan

## Problem

The Tasks Hub has 4 tabs (Overview, Board, Task List, Timeline) that visually drift from their Project Hub equivalents. Each tab in Tasks today uses a bespoke, parallel implementation while Project Hub already has canonical, battle-tested components for the same patterns.

This violates CLAUDE.md's "REUSE FIRST" and "ADOPT CANONICAL COMPONENTS" rules. Parallel implementations are the documented #1 cause of parity drift and session-wasting defects (see CLAUDE.md 2026-05-19 `CatalystJiraListView` and 2026-06-01 `BrSidebarDetails` incidents).

## Goal

For each of the 4 Tasks Hub tabs, mount the **same canonical Project Hub component** and feed it tasks data through a thin per-tab adapter. The Tasks Hub UI becomes pixel-identical to Project Hub. Tasks-specific behaviour (5-status taxonomy, single type, workstreams instead of epics) is expressed through adapter inputs and feature flags — never through forking the canonical.

## Non-goals

- The dedicated `/tasks/my-tasks` sidebar page is untouched.
- No changes to tasks schema or RLS.
- No new global components beyond one cell factory (`makeWorkstreamEditCell`) and the data-source extraction on `KanbanBoardPage`.
- No changes to Project Hub behaviour beyond the data-source extraction (which is invisible to the existing Project Hub mount).

## Canonical components being reused

| Tab | Project Hub canonical | Tasks adapter |
|---|---|---|
| Overview | `DashboardWidgetGrid` + `WidgetWrapper` + drag-to-reorder | `tasks-widget-registry.ts` (5 task-native widgets) |
| Board | `KanbanBoardPage` shell + `KanbanToolbar` + `PragmaticBoard` | `tasksKanbanSource.ts` (extracted `KanbanDataSource` prop) |
| Task List | `JiraTable` + factories in `src/components/shared/JiraTable/cells.tsx` + `editors.tsx` | `tasksListColumns.ts` + `useTasksTableData()` + one new factory `makeWorkstreamEditCell` |
| Timeline | `TimelineView` (shared, platform-agnostic) | `useTasksTimeline()` + `buildTasksTimelineTree()` |

## Execution order

**1. Task List** (smallest unknown, validates the adapter pattern)
**2. Board** (requires `KanbanDataSource` extraction — biggest refactor)
**3. Timeline** (current branch was already scoped to timeline work)
**4. Overview** (most net-new code — 5 widgets)

## Section 1 — Task List

### What ships

`/tasks/list` mounts `JiraTable` directly with the column schema below and a toolbar pattern mirroring `WorkItemsListPage`.

### Column schema (`src/modules/tasks/columns/tasksListColumns.ts`)

Default visible:

| ID | Cell factory | Editable |
|---|---|---|
| `__drag` | `makeDragHandleCell` | — |
| `key` | `makeKeyCell(getKey, onOpen, getHref, getIcon)` | — |
| `summary` | `makeSummaryInlineEditCell` | ✓ |
| `status` | `makeStatusEditCellAkPopup` (sourced from `task_statuses`) | ✓ |
| `priority` | `makePriorityEditCell` | ✓ |
| `assignee` | `makeAssigneeEditCell` | ✓ |
| `workstream` | new `makeWorkstreamEditCell` | ✓ |
| `due_date` | `makeDateEditCell` | ✓ |
| `__menu` | `makeRowMenuCell` | — |

Hidden but available in column picker: `created_at`, `updated_at`, `start_date`, `progress`, `blocked`, `description` preview.

### `DEFAULT_VISIBLE_COLUMNS` constant

Mirrors the per-CLAUDE.md 2026-05-07 rule: `DEFAULT_VISIBLE_COLUMNS` must be the canonical source for default-visibility, kept in sync with each column's `defaultVisible: true` flag.

### New cell factory — `makeWorkstreamEditCell`

Pattern-cloned from `makeParentEditCell` in `editors.tsx`. Renders the workstream chip (color + name from `workstreams` table), opens `@atlaskit/select` picker on click, persists `workstream_id`. Located in `src/components/shared/JiraTable/editors.tsx` so it's reusable across surfaces that need workstream editing.

### Adapter hook — `useTasksTableData()`

Returns `{ rows, columns, mutations }` matching the `JiraTable` contract.

- `rows`: shaped from the existing `useTaskItems()` hook output
- `columns`: from `tasksListColumns.ts`
- `mutations`: wires existing `useUpdatePlannerTask`, `useDeletePlannerTask` to JiraTable's `onEditCommit`, `onRowDelete`, etc.

### Page becomes

`TaskListPage.tsx` shrinks to a thin shell: data hook → toolbar → JiraTable. The existing `PlannerTaskList` component is deleted after the canonical mount is verified.

### Tests (TDD per CLAUDE.md)

- `tasksListColumns.test.ts` — column registry shape, hidden vs visible flags, `DEFAULT_VISIBLE_COLUMNS` parity
- `useTasksTableData.test.ts` — row mapping from tasks → JiraTable shape
- `makeWorkstreamEditCell.test.tsx` — render + click → opens picker + persist on commit

## Section 2 — Board

### What ships

`/tasks/board` mounts the full `KanbanBoardPage` shell with `source={tasksKanbanSource}` and `features={{ hideIssueTypeFilter: true, hideEpicGroupBy: true }}`.

### `KanbanDataSource` prop pair (extraction)

```ts
type KanbanDataSource = {
  useColumns: () => Array<{
    id: string;
    name: string;
    color: string;
    sort_order: number;
  }>;
  useItems: (filters: KanbanFilters) => BoardIssue[];
  mutations: {
    onStatusChange: (itemId: string, statusId: string) => Promise<void>;
    onCreate: (statusId: string, payload: NewItem) => Promise<void>;
    onReorder: (statusId: string, orderedIds: string[]) => Promise<void>;
    onColumnReorder: (orderedColumnIds: string[]) => Promise<void>;
  };
  features: {
    hideIssueTypeFilter?: boolean;
    hideEpicGroupBy?: boolean;
    hideDensityToggle?: boolean;
  };
};
```

### Two source modules

- `src/components/kanban/sources/projectHubKanbanSource.ts` — existing `KanbanBoardPage` logic, extracted. Reads `ph_workflow_statuses` + `ph_issues`. Project Hub continues to work unchanged.
- `src/modules/tasks/sources/tasksKanbanSource.ts` — new. Reads `task_statuses` + `tasks` via existing `useTaskItems()`. Wires `useUpdatePlannerTask` for status changes.

### `KanbanBoardPage` becomes parameterized

Current hardwired Supabase queries lift into `projectHubKanbanSource` and are accessed via `props.source`. No behaviour change for Project Hub callers.

### Toolbar feature flags

`KanbanToolbar` accepts the `features` object and hides:
- Issue Type filter chip (tasks have one type)
- Epic group-by option in the group-by dropdown (tasks have no epics)

The "Workstream" filter chip already exists as a generic scope picker — labelled per source (Project Hub: "Project"; Tasks: "Workstream"). Same component.

### Tests

- `projectHubKanbanSource.test.ts` — guards against behavioural drift in the extraction
- `tasksKanbanSource.test.ts` — column mapping, item mapping, status-change mutation
- `KanbanBoardPage.tasks.test.tsx` — integration: mount with tasks source, render, drag

## Section 3 — Timeline

### What ships

`/tasks/timeline` mounts the shared `TimelineView` with a tasks tree.

### `useTasksTimeline()` adapter hook

Returns `TimelineIssue[]` rooted at workstreams.

### Tree builder — `buildTasksTimelineTree(tasks, workstreams)`

```
workstream group
├── root task (parent_task_id IS NULL)
│   └── subtask (parent_task_id = root.id)
└── root task
```

1. Group tasks by `workstream_id` (null → "Unassigned").
2. Partition by `parent_task_id IS NULL` → roots, else children.
3. Nest children under parent by id.
4. Return as `TimelineIssue[]` with `{ key, summary, type: 'task', start_date, due_date, children, status, ... }`.

### Mutations adapter

`{ updateDates, changeStatus, reparent }` → wires existing tasks-side hooks.

### Menu variant

`menuVariant='jira'` — CLAUDE.md 2026-06-13 / commit `98050d7d4` confirms this is the unified variant used by both Project Hub and Product Hub timeline. Tasks Hub aligns.

### Page becomes

`TasksTimelinePage` ~20 lines: load tree → mount `<TimelineView tree={tree} mutations={mutations} menuVariant="jira" />`. Existing `PlannerTimeline.tsx` deleted after canonical mount is verified.

### Tests

- `buildTasksTimelineTree.test.ts` — pure function, full tree-building coverage including empty workstream, orphan subtask (parent not in input), multi-level (defensive — schema doesn't have it but logic should be safe), unassigned group
- `useTasksTimeline.test.ts` — hook integration

## Section 4 — Overview

### What ships

`/tasks/overview` mounts `DashboardWidgetGrid` with 5 task-native widgets registered in `tasks-widget-registry.ts`.

### Widgets

Each widget is a thin component that wraps the layout (header + count + list) of the corresponding Project Hub widget with a tasks query. The widget's wrapper (`WidgetWrapper`) is the canonical chrome — only the data and the inner body diverge.

| Widget | Mirrors | Query |
|---|---|---|
| `TasksByStatusWidget` | `ItemsByStatusWidget` | Tasks grouped by status |
| `OverdueTasksWidget` | `OverdueWidget` | `due_date < today AND status_is_done = false` |
| `BlockedTasksWidget` | `OnHoldWidget` | `blocked = true` |
| `AssigneeWorkloadWidget` | `TeamWorkloadWidget` | Open tasks per assignee |
| `WorkstreamProgressWidget` | `DemandFulfilmentGadget` | % done per workstream |

### Registry — `tasks-widget-registry.ts`

Parallels `widget-registry.ts`. Each entry: `{ id, title, component, defaultSpan: 12, minSpan: 12 }`.

### Page becomes

`TasksOverviewPage` mounts `<DashboardWidgetGrid registry={TASKS_WIDGET_REGISTRY} />`. Existing Tasks dashboard is deleted after canonical mount is verified.

### Tests

- `tasks-widget-registry.test.ts` — registry shape
- One render test per widget — verifies query → display contract

## CLAUDE.md compliance

- **REUSE FIRST**: every tab mounts an existing canonical. The only new components are: 5 task-native widgets (composing canonical chrome), 1 cell factory (`makeWorkstreamEditCell`), 1 tree builder (pure function), 4 adapter hooks. Zero new tables, dropdowns, modals, or status pills.
- **ADOPT CANONICAL COMPONENTS (P0)**: never re-create canonical markup with raw `@atlaskit/*` primitives. Tasks data flows through adapters; canonical components own the look.
- **CANONICAL TABLE — JiraTable (P0)**: Task List uses `JiraTable`. No new table from scratch.
- **Zero-assumption code (P0)**: no `|| 'Story'`-style typed fallbacks anywhere. Tasks have one type; the icon is the task icon, never a fallback.
- **No hardcoded colors (P0)**: every new component uses ADS tokens. The 5 widgets inherit chrome from `WidgetWrapper`.
- **`git add -A` banned**: every commit stages explicit paths.
- **TDD**: every implementation step starts with a failing test on the unit being built (adapter hook, tree builder, column registry, cell factory).
- **Small steps**: each commit is one logical change (one column factory, one widget, one source extraction).

## Deletions (after canonical mount verified)

- `src/modules/tasks/components/PlannerTimeline.tsx`
- `src/modules/tasks/components/PlannerTaskList.tsx` (if it exists as a separate component)
- Tasks-specific kanban board files in `src/modules/tasks/components/boards/` once `tasksKanbanSource` is mounted via canonical `KanbanBoardPage`
- Tasks-specific dashboard widget files in the planner module, once `tasks-widget-registry` is mounted

Deletion happens per-tab, in the same commit that wires the canonical mount, after a live verify pass.

## Out of scope

- The `/tasks/my-tasks` sidebar page.
- The `/tasks/workstreams` page.
- The `/tasks/priorities` page.
- The "+Add Task" modal (kept as-is across all 4 tabs).
- Any change to the Tasks sidebar nav.

## Risks

- **`KanbanBoardPage` data extraction is the biggest refactor.** ~109KB file. Mitigation: extract `projectHubKanbanSource` first as a no-op (proves the seam), test Project Hub unchanged, then add `tasksKanbanSource`.
- **`makeWorkstreamEditCell` is new shared code in `editors.tsx`.** Mitigation: pattern-clone `makeParentEditCell`; do not deviate from its shape.
- **Tree-building edge cases.** Mitigation: pure function with full unit tests, including orphan-subtask defensive handling.
- **Existing tasks code that other surfaces depend on.** Mitigation: delete only after canonical mount verified, and only after grepping for imports.
