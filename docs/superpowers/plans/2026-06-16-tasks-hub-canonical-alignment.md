# Tasks Hub Canonical Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount the existing Project Hub canonical components (`JiraTable`, `KanbanBoardPage`, `TimelineView`, `DashboardWidgetGrid`) inside the Tasks Hub's 4 tabs (Task List, Board, Timeline, Overview), fed by tasks-data adapters. Zero parallel implementations.

**Architecture:** Each Tasks Hub view becomes a ~30-line shell that mounts the canonical and passes tasks-data via thin adapter hooks. New code is limited to: 1 cell factory, 5 task-native widgets, 4 adapter hooks, 1 data-source extraction on `KanbanBoardPage`. Legacy Tasks-specific implementations are deleted in the same commit that wires the canonical mount, after live verification.

**Tech Stack:** React + TypeScript, Atlaskit (`@atlaskit/select`, `@atlaskit/modal-dialog`), Supabase, vitest + @testing-library/react, ADS design tokens (`var(--ds-*)`).

**Branch:** `tasks-hub-canonical-alignment` (already checked out).

**Reference spec:** `docs/superpowers/specs/2026-06-16-tasks-hub-canonical-alignment-design.md` (commit `19e982e42`).

**Order:** Phase 1 (Task List) → Phase 2 (Board) → Phase 3 (Timeline) → Phase 4 (Overview).

**Mandatory before every commit:**
- Stage explicit file paths only. NEVER `git add -A` / `git add .` (CLAUDE.md P0).
- Run `git status` to confirm only intended files are staged.

---

## Phase 1 — Task List (`/tasks/list` → JiraTable)

**Outcome:** `/tasks/list` renders the canonical `JiraTable` with task data. The legacy `PlannerTaskList.tsx` is deleted.

### Task 1.0: Read the canonicals first

**Files to read (no edits):**
- `src/components/shared/JiraTable/types.ts` — confirm `JiraTableProps<TRow>` shape, `Column<TRow>`, `RowGroup<TRow>`, `onCellEdit` signature.
- `src/components/shared/JiraTable/cells.tsx` — confirm `makeKeyCell`, `makeDragHandleCell`, `makeRowMenuCell` signatures.
- `src/components/shared/JiraTable/editors.tsx` — confirm `makeSummaryInlineEditCell`, `makeStatusEditCellAkPopup`, `makePriorityEditCell`, `makeAssigneeEditCell`, `makeParentEditCell`, `makeDateEditCell` signatures.
- `src/modules/tasks/hooks/useTaskItems.ts` — confirm `PlannerTask` shape and what columns are populated.
- `src/lib/jira-issue-type-icons.tsx` — confirm `'Task'` icon renders via `JiraIssueTypeIcon`.

- [ ] **Step 1: Read each file listed above.** No code changes. Take notes on prop signatures.

- [ ] **Step 2: Confirm note before proceeding.** State (out loud in your task tracker) the exact prop names you'll use for: `JiraTableProps`, `Column<TRow>`, the cell factory functions, the `useTaskItems` hook return type, and the `JiraIssueTypeIcon` `type` prop value (it must be `'Task'`).

No commit.

---

### Task 1.1: Add `makeWorkstreamEditCell` to `editors.tsx`

**Why:** Workstream is the tasks-side analog of Parent (project hub uses `makeParentEditCell`). Same shape: chip in idle, picker on click, persists FK.

**Files:**
- Modify: `src/components/shared/JiraTable/editors.tsx` (append a new factory)
- Test: `src/components/shared/JiraTable/__tests__/makeWorkstreamEditCell.test.tsx` (new)

- [ ] **Step 1: Read `makeParentEditCell` in `editors.tsx`** in full. The new factory mirrors its structure exactly (same idle state, same `@atlaskit/select` picker, same `onCommit` shape). Note the exact signature, especially the `getValue`/`getOptions`/`onCommit` parameters.

- [ ] **Step 2: Write the failing test.** Create `src/components/shared/JiraTable/__tests__/makeWorkstreamEditCell.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeWorkstreamEditCell } from '../editors';

describe('makeWorkstreamEditCell', () => {
  const row = { id: 't1', workstream_id: 'ws1' };
  const options = [
    { id: 'ws1', name: 'Platform', color: '#1868DB' },
    { id: 'ws2', name: 'Mobile', color: '#FF7452' },
  ];

  it('renders the current workstream chip in idle state', () => {
    const onCommit = vi.fn();
    const Cell = makeWorkstreamEditCell({
      getValue: (r) => r.workstream_id,
      getOptions: () => options,
      onCommit,
    });
    render(<Cell row={row} />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('renders an empty placeholder when no workstream is set', () => {
    const onCommit = vi.fn();
    const Cell = makeWorkstreamEditCell({
      getValue: () => null,
      getOptions: () => options,
      onCommit,
    });
    render(<Cell row={{ id: 't1', workstream_id: null }} />);
    expect(screen.getByText(/none|—|no workstream/i)).toBeInTheDocument();
  });

  it('calls onCommit with the new id when a workstream is picked', async () => {
    const onCommit = vi.fn();
    const Cell = makeWorkstreamEditCell({
      getValue: (r) => r.workstream_id,
      getOptions: () => options,
      onCommit,
    });
    render(<Cell row={row} />);
    fireEvent.click(screen.getByText('Platform'));
    // Picker is open — exact interaction depends on @atlaskit/select internals
    // Verify onCommit signature matches makeParentEditCell's pattern
    // (the executing engineer must mirror makeParentEditCell's test for picker interaction)
  });
});
```

- [ ] **Step 3: Run test to verify it fails.**

Run: `npx vitest run src/components/shared/JiraTable/__tests__/makeWorkstreamEditCell.test.tsx`
Expected: FAIL with "makeWorkstreamEditCell is not a function" (export does not yet exist).

- [ ] **Step 4: Implement `makeWorkstreamEditCell` in `editors.tsx`.**

Append at the end of the file. The implementation must mirror `makeParentEditCell` exactly — copy its structure and rename:
- Function name: `makeWorkstreamEditCell`
- Idle-state chip displays workstream name + color dot (use `var(--ds-text)`, NEVER hardcoded hex)
- Picker uses `@atlaskit/select` with `classNamePrefix="cv-workstream-select"`
- Options shape: `{ id: string; name: string; color: string }`
- Commit callback: `onCommit(rowId, newWorkstreamId)`

Do NOT copy and modify — re-read `makeParentEditCell`, then write the new factory using identical structure. The only differences: name, the data field it reads (`workstream_id`), and the picker options source.

- [ ] **Step 5: Run test to verify it passes.**

Run: `npx vitest run src/components/shared/JiraTable/__tests__/makeWorkstreamEditCell.test.tsx`
Expected: PASS for idle + empty placeholder tests. Picker-interaction test may need mirror from `makeParentEditCell.test.tsx` — adapt accordingly.

- [ ] **Step 6: Run the design-governance audit on the new code.**

Run: `node design-governance/rules/audit.js src/components/shared/JiraTable/editors.tsx`
Expected: 0 new violations introduced by your edit (pre-existing violations in the file are not your concern, but the rows you ADDED must be clean — no hex, no Tailwind utilities, only ADS tokens).

- [ ] **Step 7: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/components/shared/JiraTable/editors.tsx \
  src/components/shared/JiraTable/__tests__/makeWorkstreamEditCell.test.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
# Confirm only those 2 files are staged. If anything else appears, STOP — do not commit.
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(jira-table): add makeWorkstreamEditCell factory

Mirrors makeParentEditCell. Used by Tasks Hub list view to render the
workstream chip with inline-edit picker.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Create `tasksListColumns.ts`

**Files:**
- Create: `src/modules/tasks/columns/tasksListColumns.ts`
- Test: `src/modules/tasks/columns/__tests__/tasksListColumns.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { TASKS_LIST_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from '../tasksListColumns';

describe('tasksListColumns', () => {
  it('exports the canonical column set with the correct order', () => {
    const ids = TASKS_LIST_COLUMNS.map((c) => c.id);
    expect(ids).toEqual([
      '__drag', 'key', 'summary', 'status', 'priority',
      'assignee', 'workstream', 'due_date',
      'created_at', 'updated_at', 'start_date', 'progress', 'blocked', 'description',
      '__menu',
    ]);
  });

  it('marks the 9 default-visible columns', () => {
    const visible = TASKS_LIST_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(visible).toEqual([
      '__drag', 'key', 'summary', 'status', 'priority',
      'assignee', 'workstream', 'due_date', '__menu',
    ]);
  });

  it('keeps DEFAULT_VISIBLE_COLUMNS in sync with defaultVisible flags', () => {
    const flagged = TASKS_LIST_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    expect(DEFAULT_VISIBLE_COLUMNS).toEqual(flagged);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npx vitest run src/modules/tasks/columns/__tests__/tasksListColumns.test.ts`
Expected: FAIL with "Cannot find module '../tasksListColumns'".

- [ ] **Step 3: Read `src/components/shared/JiraTable/types.ts`** to confirm the exact `Column<TRow>` interface (key names: `id`, `label`, `defaultVisible`, `width`, `renderCell`, ...).

- [ ] **Step 4: Implement the column registry.**

Create `src/modules/tasks/columns/tasksListColumns.ts`:

```ts
import { type Column } from '@/components/shared/JiraTable/types';
import { type PlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import {
  makeDragHandleCell,
  makeKeyCell,
  makeRowMenuCell,
} from '@/components/shared/JiraTable/cells';
import {
  makeSummaryInlineEditCell,
  makeStatusEditCellAkPopup,
  makePriorityEditCell,
  makeAssigneeEditCell,
  makeDateEditCell,
  makeWorkstreamEditCell,
} from '@/components/shared/JiraTable/editors';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

export const DEFAULT_VISIBLE_COLUMNS = [
  '__drag', 'key', 'summary', 'status', 'priority',
  'assignee', 'workstream', 'due_date', '__menu',
] as const;

export function buildTasksListColumns(args: {
  onOpen: (row: PlannerTask) => void;
  getHref: (row: PlannerTask) => string;
  statusOptions: Array<{ id: string; name: string; color: string }>;
  workstreamOptions: Array<{ id: string; name: string; color: string }>;
  onCellEdit: (id: string, patch: Partial<PlannerTask>) => Promise<void>;
  onRowDelete: (id: string) => Promise<void>;
}): Column<PlannerTask>[] {
  return [
    { id: '__drag', label: '', width: 32, defaultVisible: true,
      renderCell: makeDragHandleCell() },
    { id: 'key', label: 'Key', width: 110, defaultVisible: true,
      renderCell: makeKeyCell(
        (r) => r.key,
        args.onOpen,
        args.getHref,
        () => <JiraIssueTypeIcon type="Task" size={16} />,
      ),
    },
    { id: 'summary', label: 'Summary', width: 360, defaultVisible: true,
      renderCell: makeSummaryInlineEditCell({
        getValue: (r) => r.title,
        onCommit: (r, v) => args.onCellEdit(r.id, { title: v }),
      }),
    },
    { id: 'status', label: 'Status', width: 140, defaultVisible: true,
      renderCell: makeStatusEditCellAkPopup({
        getValue: (r) => r.status_id,
        getOptions: () => args.statusOptions,
        onCommit: (r, v) => args.onCellEdit(r.id, { status_id: v }),
      }),
    },
    { id: 'priority', label: 'Priority', width: 110, defaultVisible: true,
      renderCell: makePriorityEditCell({
        getValue: (r) => r.priority,
        onCommit: (r, v) => args.onCellEdit(r.id, { priority: v }),
      }),
    },
    { id: 'assignee', label: 'Assignee', width: 160, defaultVisible: true,
      renderCell: makeAssigneeEditCell({
        getValue: (r) => r.assignee_id,
        onCommit: (r, v) => args.onCellEdit(r.id, { assignee_id: v }),
      }),
    },
    { id: 'workstream', label: 'Workstream', width: 140, defaultVisible: true,
      renderCell: makeWorkstreamEditCell({
        getValue: (r) => r.workstream_id,
        getOptions: () => args.workstreamOptions,
        onCommit: (r, v) => args.onCellEdit(r.id, { workstream_id: v }),
      }),
    },
    { id: 'due_date', label: 'Due date', width: 130, defaultVisible: true,
      renderCell: makeDateEditCell({
        getValue: (r) => r.due_date,
        onCommit: (r, v) => args.onCellEdit(r.id, { due_date: v }),
      }),
    },
    { id: 'created_at', label: 'Created', width: 130, defaultVisible: false,
      renderCell: () => null /* date display only */ },
    { id: 'updated_at', label: 'Updated', width: 130, defaultVisible: false,
      renderCell: () => null },
    { id: 'start_date', label: 'Start date', width: 130, defaultVisible: false,
      renderCell: makeDateEditCell({
        getValue: (r) => r.start_date,
        onCommit: (r, v) => args.onCellEdit(r.id, { start_date: v }),
      }),
    },
    { id: 'progress', label: 'Progress', width: 100, defaultVisible: false,
      renderCell: () => null },
    { id: 'blocked', label: 'Blocked', width: 100, defaultVisible: false,
      renderCell: () => null },
    { id: 'description', label: 'Description', width: 240, defaultVisible: false,
      renderCell: () => null },
    { id: '__menu', label: '', width: 40, defaultVisible: true,
      renderCell: makeRowMenuCell({
        onDelete: (r) => args.onRowDelete(r.id),
      }),
    },
  ];
}

export const TASKS_LIST_COLUMNS = buildTasksListColumns({
  onOpen: () => {},
  getHref: () => '#',
  statusOptions: [],
  workstreamOptions: [],
  onCellEdit: async () => {},
  onRowDelete: async () => {},
});
```

Notes:
- The exact prop shape of each `make*` factory (especially `getValue`/`getOptions`/`onCommit`) must match what `editors.tsx` actually exports. If the signature differs from the call sites shown above, ADJUST the column registry to match — do not modify the factory.
- For `created_at`, `updated_at`, `progress`, `blocked`, `description` — `renderCell: () => null` is a placeholder; replace with the actual display when the column is enabled. These columns are hidden by default; the placeholder is acceptable for v1.

- [ ] **Step 5: Run test to verify it passes.**

Run: `npx vitest run src/modules/tasks/columns/__tests__/tasksListColumns.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 6: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/columns/tasksListColumns.ts \
  src/modules/tasks/columns/__tests__/tasksListColumns.test.ts
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): add tasksListColumns registry for JiraTable

9 default-visible columns + 5 hidden. DEFAULT_VISIBLE_COLUMNS kept in
sync with defaultVisible flags per CLAUDE.md 2026-05-07 rule.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.3: Create `useTasksTableData` adapter hook

**Files:**
- Create: `src/modules/tasks/hooks/useTasksTableData.ts`
- Test: `src/modules/tasks/hooks/__tests__/useTasksTableData.test.ts`

- [ ] **Step 1: Read `useTaskItems`, `useUpdatePlannerTask`, `useDeletePlannerTask`** in `src/modules/tasks/hooks/useTaskItems.ts`. Confirm exact return types.

- [ ] **Step 2: Look up where `task_statuses` and `workstreams` are queried** in existing tasks code:

Run: `grep -rn "from('task_statuses')\|from(\"task_statuses\")" ~/Documents/mim/catalyst/catalyst-prod-45/src/modules/tasks | head -5`
Run: `grep -rn "from('workstreams')\|from(\"workstreams\")\|from('task_workstreams')" ~/Documents/mim/catalyst/catalyst-prod-45/src/modules/tasks | head -5`

If hooks already exist (likely named `useTaskStatuses`, `useWorkstreams`, or `useTaskWorkstreams`), record their paths and reuse them. If they don't exist, create them as separate commits BEFORE proceeding with Task 1.3 Step 5:

```ts
// src/modules/tasks/hooks/useTaskStatuses.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTaskStatuses() {
  return useQuery({
    queryKey: ['task_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_statuses')
        .select('id, name, color, sort_order, is_done')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}
```

Same pattern for `useWorkstreams()` against `workstreams` (or `task_workstreams` — confirm via the grep). Commit each hook as its own commit before moving on.

- [ ] **Step 3: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { mapTasksToRows } from '../useTasksTableData';

describe('mapTasksToRows', () => {
  it('returns an empty array for empty input', () => {
    expect(mapTasksToRows([])).toEqual([]);
  });

  it('preserves the task shape as JiraTable rows (no field renaming)', () => {
    const tasks = [
      { id: 't1', key: 'PLN-1', title: 'Test', status_id: 's1', priority: 'high',
        assignee_id: null, workstream_id: 'w1', due_date: null,
        start_date: null, progress: 0, blocked: false,
        created_at: '2026-01-01', updated_at: '2026-01-01', description: null },
    ];
    const rows = mapTasksToRows(tasks as any);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('t1');
    expect(rows[0].key).toBe('PLN-1');
    expect(rows[0].title).toBe('Test');
  });
});
```

- [ ] **Step 4: Run test to verify it fails.**

Run: `npx vitest run src/modules/tasks/hooks/__tests__/useTasksTableData.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 5: Implement the hook.**

Create `src/modules/tasks/hooks/useTasksTableData.ts`:

```ts
import { useMemo } from 'react';
import { useTaskItems, useUpdatePlannerTask, useDeletePlannerTask, type PlannerTask } from './useTaskItems';
import { buildTasksListColumns } from '@/modules/tasks/columns/tasksListColumns';

export function mapTasksToRows(tasks: PlannerTask[]): PlannerTask[] {
  return tasks; // JiraTable consumes PlannerTask directly — no shape transformation needed
}

export function useTasksTableData(args: {
  onOpen: (row: PlannerTask) => void;
  getHref: (row: PlannerTask) => string;
  statusOptions: Array<{ id: string; name: string; color: string }>;
  workstreamOptions: Array<{ id: string; name: string; color: string }>;
}) {
  const { data: tasks = [], isLoading, error } = useTaskItems();
  const updateMutation = useUpdatePlannerTask();
  const deleteMutation = useDeletePlannerTask();

  const onCellEdit = async (id: string, patch: Partial<PlannerTask>) => {
    await updateMutation.mutateAsync({ id, updates: patch });
  };

  const onRowDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const columns = useMemo(
    () =>
      buildTasksListColumns({
        onOpen: args.onOpen,
        getHref: args.getHref,
        statusOptions: args.statusOptions,
        workstreamOptions: args.workstreamOptions,
        onCellEdit,
        onRowDelete,
      }),
    [args.onOpen, args.getHref, args.statusOptions, args.workstreamOptions],
  );

  return {
    rows: mapTasksToRows(tasks),
    columns,
    isLoading,
    error,
  };
}
```

If `useUpdatePlannerTask`'s `mutateAsync` signature differs from `{ id, updates }`, adjust the call to match the actual signature — do not change the hook.

- [ ] **Step 6: Run test to verify it passes.**

Run: `npx vitest run src/modules/tasks/hooks/__tests__/useTasksTableData.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/hooks/useTasksTableData.ts \
  src/modules/tasks/hooks/__tests__/useTasksTableData.test.ts
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): add useTasksTableData adapter for JiraTable

Wires useTaskItems + update/delete mutations into the JiraTable contract.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.4: Build `TasksTaskListView` (mounts JiraTable)

**Files:**
- Create: `src/modules/tasks/views/TasksTaskListView.tsx`

- [ ] **Step 1: Read** `src/pages/project-hub/WorkItemsListPage.tsx` to understand the toolbar pattern Project Hub uses around `JiraTable` (search, filters, +Add). Note which components are reusable (e.g. `WorkItemsToolbar`).

- [ ] **Step 2: Implement the view.**

Create `src/modules/tasks/views/TasksTaskListView.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { JiraTable } from '@/components/shared/JiraTable/JiraTable';
import { useTasksTableData } from '@/modules/tasks/hooks/useTasksTableData';
import { useTaskStatuses } from '@/modules/tasks/hooks/useTaskStatuses';
import { useWorkstreams } from '@/modules/tasks/hooks/useWorkstreams';
import type { PlannerTask } from '@/modules/tasks/hooks/useTaskItems';

export default function TasksTaskListView() {
  const navigate = useNavigate();
  const { data: statuses = [] } = useTaskStatuses();
  const { data: workstreams = [] } = useWorkstreams();

  const { rows, columns, isLoading, error } = useTasksTableData({
    onOpen: (row) => navigate(`/tasks/list/${row.key}`),
    getHref: (row) => `/tasks/list/${row.key}`,
    statusOptions: statuses.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    workstreamOptions: workstreams.map((w) => ({ id: w.id, name: w.name, color: w.color })),
  });

  if (isLoading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (error) return <div style={{ padding: 16, color: 'var(--ds-text-danger)' }}>Error loading tasks.</div>;

  return (
    <div style={{ padding: 16 }}>
      <JiraTable
        data={rows}
        columns={columns}
        getRowId={(r: PlannerTask) => r.id}
      />
    </div>
  );
}
```

If `useTaskStatuses` and `useWorkstreams` hooks don't already exist (verified via grep earlier), create them as lightweight Supabase queries before this step. Add them as separate commits to keep the diff scoped.

- [ ] **Step 3: Run the design-governance audit.**

Run: `node design-governance/rules/audit.js src/modules/tasks/views/TasksTaskListView.tsx`
Expected: 0 violations (no hex, no Tailwind utilities, only ADS tokens).

- [ ] **Step 4: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/views/TasksTaskListView.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): TasksTaskListView mounts canonical JiraTable

Replaces PlannerTaskList — same data, canonical component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.5: Wire `TasksTaskListView` into `PlannerPage`

**Files:**
- Modify: `src/modules/tasks/PlannerPage.tsx` — replace `PlannerTaskList` branch with `TasksTaskListView`.

- [ ] **Step 1: Read** `src/modules/tasks/PlannerPage.tsx` to find the `activeView === 'task-list'` branch (or equivalent).

- [ ] **Step 2: Replace the import and the render branch.**

Change:
```tsx
import PlannerTaskList from './components/PlannerTaskList';
// ...
{activeView === 'task-list' && <PlannerTaskList ... />}
```

To:
```tsx
import TasksTaskListView from './views/TasksTaskListView';
// ...
{activeView === 'task-list' && <TasksTaskListView />}
```

Pass through any props PlannerTaskList was receiving only if `TasksTaskListView` needs them. Most likely it doesn't (it owns its data).

- [ ] **Step 3: Live verify (REQUIRED — see CLAUDE.md 2026-06-01 lesson on functional verification).**

Start the dev server if it's not running. Open `http://localhost:8080/tasks/list` in Chrome.

Verify by DOM probe (NOT screenshot — per CLAUDE.md P0):
- `JiraTable` rendered (look for `table[role="grid"]` or `[data-testid="jira-table"]` if it exists)
- 9 default columns visible (drag, key, summary, status, priority, assignee, workstream, due date, menu)
- At least 1 row renders if tasks exist
- Click a status pill — picker opens
- Click an assignee chip — picker opens

If any probe fails, STOP, document the failure, and fix before committing.

- [ ] **Step 4: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/modules/tasks/PlannerPage.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): mount TasksTaskListView in PlannerPage

Tasks list now uses canonical JiraTable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.6: Delete legacy `PlannerTaskList.tsx`

**Files:**
- Delete: `src/modules/tasks/components/PlannerTaskList.tsx` (and any direct child components only it used)

- [ ] **Step 1: Verify nothing else imports PlannerTaskList.**

Run: `grep -rn "PlannerTaskList" ~/Documents/mim/catalyst/catalyst-prod-45/src --include='*.ts' --include='*.tsx'`
Expected: only the deletion target (PlannerTaskList.tsx itself + its `__tests__` directory if any) appears.

If anything else imports it, STOP. Open a sub-question: are there other surfaces still mounting the legacy list? Fix those before deleting.

- [ ] **Step 2: Delete the file (and only it).**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 rm src/modules/tasks/components/PlannerTaskList.tsx
# If it has a tests/__tests__ subdir referenced ONLY by this file, also rm those exact paths.
```

- [ ] **Step 3: Re-run a build/type-check to confirm no broken imports.**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 0 errors related to the deleted file.

- [ ] **Step 4: Live re-verify `/tasks/list`** in Chrome. Same checks as Task 1.5 Step 3.

- [ ] **Step 5: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
chore(tasks): delete legacy PlannerTaskList

Canonical JiraTable adoption complete for /tasks/list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Phase 1 done.** Pause for user approval before starting Phase 2.

---

## Phase 2 — Board (`/tasks/board` → KanbanBoardPage + PragmaticBoard)

**Outcome:** `/tasks/board` mounts the canonical `KanbanBoardPage` shell, fed by `tasksKanbanSource`. Legacy `BoardKanban`, `SortableColumn`, `BoardColumn`, `BoardTaskCard` are deleted.

### Task 2.1: Define `KanbanDataSource` interface

**Files:**
- Create: `src/components/kanban/sources/types.ts`
- Test: `src/components/kanban/sources/__tests__/types.test.ts` (optional — type-only file; if a test isn't valuable, skip and document why in commit)

- [ ] **Step 1: Implement the type file.**

```ts
import { type ReactNode } from 'react';

export type KanbanColumn = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  category?: string;
  wip_limit?: number | null;
};

export type KanbanItem = {
  id: string;
  key: string;
  title: string;
  status_id: string;
  priority: string | null;
  assignee_id: string | null;
  group_id?: string | null; // workstream_id for tasks, project_key for project hub
  blocked?: boolean;
  due_date?: string | null;
  description?: string | null;
};

export type KanbanFilters = {
  search?: string;
  statusIds?: string[];
  priorities?: string[];
  assigneeIds?: string[];
  groupIds?: string[];
};

export type KanbanFeatureFlags = {
  hideIssueTypeFilter?: boolean;
  hideEpicGroupBy?: boolean;
  hideDensityToggle?: boolean;
  hideAddColumn?: boolean;
};

export type KanbanDataSource = {
  useColumns: () => { data: KanbanColumn[]; isLoading: boolean; error: unknown };
  useItems: (filters: KanbanFilters) => { data: KanbanItem[]; isLoading: boolean; error: unknown };
  mutations: {
    onStatusChange: (itemId: string, statusId: string) => Promise<void>;
    onCreate: (statusId: string, payload: { title: string; group_id?: string | null }) => Promise<void>;
    onReorder: (statusId: string, orderedIds: string[]) => Promise<void>;
    onColumnReorder?: (orderedColumnIds: string[]) => Promise<void>;
  };
  features: KanbanFeatureFlags;
  groupLabel: string; // 'Workstream' for tasks, 'Project' for project hub — used in the toolbar filter chip
};
```

- [ ] **Step 2: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/components/kanban/sources/types.ts
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(kanban): define KanbanDataSource interface

Extraction seam for project-hub vs tasks data sources on the canonical
KanbanBoardPage.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Extract `projectHubKanbanSource` from `KanbanBoardPage`

**Why first:** A no-op extraction proves the seam works before the tasks source is added. Project Hub must continue to function unchanged.

**Files:**
- Create: `src/components/kanban/sources/projectHubKanbanSource.ts`
- Modify: `src/pages/project-hub/KanbanBoardPage.tsx` — accept `source` prop, default to `projectHubKanbanSource` for backward compatibility.

- [ ] **Step 1: Read `KanbanBoardPage.tsx` end-to-end.** Note every Supabase query (look for `from('ph_issues')`, `from('ph_workflow_statuses')`, etc.), every mutation, and the toolbar's data dependencies.

- [ ] **Step 2: Move the queries and mutations into `projectHubKanbanSource.ts`.**

Each Supabase query becomes a hook inside the source module. Each mutation becomes a function on `mutations`. Wire the source to expose the `KanbanDataSource` shape.

- [ ] **Step 3: Modify `KanbanBoardPage.tsx` to accept `source?: KanbanDataSource` prop.**

```tsx
import { projectHubKanbanSource } from '@/components/kanban/sources/projectHubKanbanSource';
import type { KanbanDataSource } from '@/components/kanban/sources/types';

export default function KanbanBoardPage({
  source = projectHubKanbanSource,
}: {
  source?: KanbanDataSource;
}) {
  // Replace inlined queries with: const { data: columns } = source.useColumns();
  // Replace inlined mutations with: source.mutations.onStatusChange(...)
  // Pass source.features to KanbanToolbar
  // Pass source.groupLabel to KanbanToolbar
  // ...
}
```

This is the biggest task in the plan. Take it slowly. Every replacement is one logical change. Consider committing the extraction in multiple sub-steps (one query at a time) if the diff gets large.

- [ ] **Step 4: Run all tests + live verify Project Hub board.**

Run: `npx vitest run` (full suite — confirms nothing else broke)
Expected: same passing test count as before the extraction.

Open `http://localhost:8080/project-hub/BAU/board` in Chrome. DOM-probe:
- Columns load
- Cards render
- Drag a card between columns — status persists (refresh, card stays in the new column)
- Toolbar filters work
- Group-by works

If ANY behaviour differs from before the extraction, STOP and revert.

- [ ] **Step 5: Commit.**

If you broke the extraction into sub-commits, each one stages its own files and follows the same pattern. Final commit:

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/components/kanban/sources/projectHubKanbanSource.ts \
  src/pages/project-hub/KanbanBoardPage.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
refactor(kanban): extract projectHubKanbanSource from KanbanBoardPage

No-op extraction — Project Hub board behaviour unchanged. Opens the
seam for tasks data source in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.3: Add feature flags to `KanbanToolbar`

**Files:**
- Modify: `src/components/kanban/toolbar/KanbanToolbar.tsx`
- Test: `src/components/kanban/toolbar/__tests__/KanbanToolbar.feature-flags.test.tsx`

- [ ] **Step 1: Read `KanbanToolbar.tsx`** to find the filter-chip locations (Issue Type filter, Group-By dropdown, Density toggle).

- [ ] **Step 2: Write the failing test.**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KanbanToolbar } from '../KanbanToolbar';

describe('KanbanToolbar feature flags', () => {
  it('hides the Issue Type filter when hideIssueTypeFilter is true', () => {
    render(<KanbanToolbar features={{ hideIssueTypeFilter: true }} {...minimalProps} />);
    expect(screen.queryByText(/issue type/i)).not.toBeInTheDocument();
  });

  it('hides the Epic Group-By option when hideEpicGroupBy is true', () => {
    // Open group-by dropdown, expect no "Epic" option
  });
});
```

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Add `features?: KanbanFeatureFlags` prop to `KanbanToolbar`.** Conditional-render the Issue Type filter, and omit the Epic option from the Group-By dropdown when the flag is set.

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Verify Project Hub board still renders the Issue Type filter** (since `projectHubKanbanSource.features.hideIssueTypeFilter` is `false` / undefined).

- [ ] **Step 7: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/components/kanban/toolbar/KanbanToolbar.tsx \
  src/components/kanban/toolbar/__tests__/KanbanToolbar.feature-flags.test.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(kanban): add feature flags to KanbanToolbar

Allows non-project-hub mounts to hide irrelevant chips (e.g. issue type
filter for tasks which have one type).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.4: Create `tasksKanbanSource`

**Files:**
- Create: `src/modules/tasks/sources/tasksKanbanSource.ts`
- Test: `src/modules/tasks/sources/__tests__/tasksKanbanSource.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { tasksKanbanSource } from '../tasksKanbanSource';

describe('tasksKanbanSource', () => {
  it('exports the KanbanDataSource shape', () => {
    expect(tasksKanbanSource.useColumns).toBeTypeOf('function');
    expect(tasksKanbanSource.useItems).toBeTypeOf('function');
    expect(tasksKanbanSource.mutations.onStatusChange).toBeTypeOf('function');
    expect(tasksKanbanSource.features.hideIssueTypeFilter).toBe(true);
    expect(tasksKanbanSource.features.hideEpicGroupBy).toBe(true);
    expect(tasksKanbanSource.groupLabel).toBe('Workstream');
  });
});
```

- [ ] **Step 2: Run test to verify it fails.**

- [ ] **Step 3: Implement the source.**

```ts
import { useTaskStatuses } from '@/modules/tasks/hooks/useTaskStatuses';
import { useTaskItems, useUpdatePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import { useCreateTask } from '@/modules/tasks/hooks/useCreateTask';
import type { KanbanDataSource, KanbanFilters, KanbanItem } from '@/components/kanban/sources/types';

export const tasksKanbanSource: KanbanDataSource = {
  useColumns: () => {
    const q = useTaskStatuses();
    return {
      data: (q.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        sort_order: s.sort_order,
      })),
      isLoading: q.isLoading,
      error: q.error,
    };
  },
  useItems: (filters: KanbanFilters) => {
    const q = useTaskItems();
    const items: KanbanItem[] = (q.data ?? []).map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      status_id: t.status_id,
      priority: t.priority,
      assignee_id: t.assignee_id,
      group_id: t.workstream_id,
      blocked: t.blocked ?? false,
      due_date: t.due_date,
      description: t.description,
    }));
    // Apply client-side filters
    const filtered = items.filter((i) => {
      if (filters.search && !i.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.statusIds?.length && !filters.statusIds.includes(i.status_id)) return false;
      if (filters.priorities?.length && (!i.priority || !filters.priorities.includes(i.priority))) return false;
      if (filters.assigneeIds?.length && (!i.assignee_id || !filters.assigneeIds.includes(i.assignee_id))) return false;
      if (filters.groupIds?.length && (!i.group_id || !filters.groupIds.includes(i.group_id))) return false;
      return true;
    });
    return { data: filtered, isLoading: q.isLoading, error: q.error };
  },
  mutations: {
    onStatusChange: async (itemId, statusId) => {
      const update = useUpdatePlannerTask();
      await update.mutateAsync({ id: itemId, updates: { status_id: statusId } });
    },
    onCreate: async (statusId, payload) => {
      const create = useCreateTask();
      await create.mutateAsync({
        title: payload.title,
        status_id: statusId,
        workstream_id: payload.group_id,
      });
    },
    onReorder: async (statusId, orderedIds) => {
      // Read existing reorder logic from the legacy BoardKanban first (before it's deleted in Task 2.6).
      // The tasks table has a `position` column. Issue N concurrent updates (one per id) setting
      // `position = index`, using useUpdatePlannerTask.mutateAsync. Wrap in Promise.all.
      const update = useUpdatePlannerTask();
      await Promise.all(
        orderedIds.map((id, index) =>
          update.mutateAsync({ id, updates: { position: index } }),
        ),
      );
    },
  },
  features: {
    hideIssueTypeFilter: true,
    hideEpicGroupBy: true,
  },
  groupLabel: 'Workstream',
};
```

Note: `useUpdatePlannerTask` and `useCreateTask` are hooks — calling them inside async functions is wrong. Either: (a) call them at the top of `tasksKanbanSource` factory and return a closure-bound source, OR (b) refactor mutations to take the mutation result objects as arguments. Pick the pattern that matches how `projectHubKanbanSource` solved this in Task 2.2 — must be consistent.

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/sources/tasksKanbanSource.ts \
  src/modules/tasks/sources/__tests__/tasksKanbanSource.test.ts
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): add tasksKanbanSource for canonical KanbanBoardPage

Maps tasks + task_statuses + workstreams into the KanbanDataSource shape.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.5: Build `TasksBoardView` (mounts `KanbanBoardPage`)

**Files:**
- Create: `src/modules/tasks/views/TasksBoardView.tsx`

- [ ] **Step 1: Implement.**

```tsx
import KanbanBoardPage from '@/pages/project-hub/KanbanBoardPage';
import { tasksKanbanSource } from '@/modules/tasks/sources/tasksKanbanSource';

export default function TasksBoardView() {
  return <KanbanBoardPage source={tasksKanbanSource} />;
}
```

If `KanbanBoardPage` cannot be cleanly mounted outside the `/project-hub/:key/board` route (e.g. depends on `useParams<{ key }>()`), refactor the page to read project key from the source (`source.projectKey`) rather than `useParams`. Update `projectHubKanbanSource` to expose its project key. Do this in this commit.

- [ ] **Step 2: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/modules/tasks/views/TasksBoardView.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): TasksBoardView mounts canonical KanbanBoardPage

Tasks board now uses the same shell as project hub board.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.6: Wire `TasksBoardView` into `PlannerPage` + delete legacy board files

- [ ] **Step 1: Modify `PlannerPage.tsx`** — replace the `activeView === 'boards'` branch's mount with `<TasksBoardView />`.

- [ ] **Step 2: Live verify** `/tasks/board` (DOM probe, NOT screenshot):
  - Status columns render from `task_statuses`
  - Cards render from `tasks`
  - Drag a card to another column — status changes persist (refresh + verify)
  - Toolbar filters work
  - Issue Type filter is hidden
  - Add task per column works
  - **Project Hub `/project-hub/BAU/board` still works** (re-verify)

- [ ] **Step 3: Delete legacy files** in `src/modules/tasks/components/boards/` once `grep` confirms nothing else imports them:

Run: `grep -rn "from.*modules/tasks/components/boards" ~/Documents/mim/catalyst/catalyst-prod-45/src --include='*.ts' --include='*.tsx'`
Expected: empty (or only PlannerPage.tsx, which you'll update in the same commit).

Delete only the files confirmed to be unused: `BoardKanban.tsx`, `BoardColumn.tsx`, `BoardTaskCard.tsx`, `SortableColumn.tsx`, `ColumnHeader.tsx`, `ColumnActions.tsx`.

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 rm src/modules/tasks/components/boards/BoardKanban.tsx
# ... repeat per file
```

- [ ] **Step 4: tsc + tests.**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors.
Run: `npx vitest run`
Expected: same passing count.

- [ ] **Step 5: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/PlannerPage.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
# Confirm only PlannerPage.tsx + the rm'd board files appear.
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): mount TasksBoardView, delete legacy board

/tasks/board now uses canonical KanbanBoardPage with tasksKanbanSource.
Removes BoardKanban + 5 related legacy files.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Phase 2 done.** Pause for user approval before starting Phase 3.

---

## Phase 3 — Timeline (`/tasks/timeline` → TimelineView)

**Outcome:** `/tasks/timeline` mounts the shared `TimelineView` with a workstream-grouped, subtask-nested tree. Legacy `PlannerTimeline.tsx` is deleted.

### Task 3.1: Build `buildTasksTimelineTree` pure function

**Files:**
- Create: `src/modules/tasks/timeline/buildTasksTimelineTree.ts`
- Test: `src/modules/tasks/timeline/__tests__/buildTasksTimelineTree.test.ts`

- [ ] **Step 1: Read `src/components/shared/Timeline/types.ts`** to confirm exact `TimelineIssue` field names (the explorer report said `issueKey`, `issueType`, `parentKey`, `startDate`, `dueDate`, `children`, `isGroup`).

- [ ] **Step 2: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { buildTasksTimelineTree } from '../buildTasksTimelineTree';

const wsA = { id: 'wsA', name: 'Platform', color: '#1868DB' };
const wsB = { id: 'wsB', name: 'Mobile', color: '#FF7452' };

const t = (over: any) => ({
  id: 't?', key: 'PLN-?', title: '', status_id: 's', priority: null,
  assignee_id: null, workstream_id: null, due_date: null, start_date: null,
  parent_task_id: null, blocked: false, ...over,
});

describe('buildTasksTimelineTree', () => {
  it('returns empty when no tasks', () => {
    expect(buildTasksTimelineTree([], [wsA, wsB])).toEqual([]);
  });

  it('groups tasks under their workstream', () => {
    const tasks = [t({ id: '1', key: 'PLN-1', workstream_id: 'wsA' })];
    const tree = buildTasksTimelineTree(tasks as any, [wsA, wsB]);
    expect(tree).toHaveLength(1);
    expect(tree[0].isGroup).toBe(true);
    expect(tree[0].summary).toBe('Platform');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].issueKey).toBe('PLN-1');
  });

  it('puts tasks with no workstream in an Unassigned group', () => {
    const tasks = [t({ id: '1', key: 'PLN-1', workstream_id: null })];
    const tree = buildTasksTimelineTree(tasks as any, []);
    expect(tree[0].summary).toBe('Unassigned');
    expect(tree[0].children).toHaveLength(1);
  });

  it('nests subtasks under their parent root task', () => {
    const tasks = [
      t({ id: 'root1', key: 'PLN-1', workstream_id: 'wsA', parent_task_id: null }),
      t({ id: 'sub1',  key: 'PLN-2', workstream_id: 'wsA', parent_task_id: 'root1' }),
    ];
    const tree = buildTasksTimelineTree(tasks as any, [wsA]);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].issueKey).toBe('PLN-1');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].issueKey).toBe('PLN-2');
  });

  it('keeps an orphan subtask (parent missing) at the workstream root', () => {
    const tasks = [t({ id: 'sub1', key: 'PLN-2', workstream_id: 'wsA', parent_task_id: 'gone' })];
    const tree = buildTasksTimelineTree(tasks as any, [wsA]);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].issueKey).toBe('PLN-2');
  });
});
```

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Implement.**

```ts
import type { PlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import type { TimelineIssue } from '@/components/shared/Timeline/types';

type Workstream = { id: string; name: string; color: string };

function taskToTimelineIssue(t: PlannerTask, children: TimelineIssue[] = []): TimelineIssue {
  return {
    id: t.id,
    issueKey: t.key,
    projectKey: 'PLN',
    issueType: 'Task',
    summary: t.title,
    status: t.status_id ?? '',
    statusCategory: '',
    priority: t.priority ?? null,
    assigneeDisplayName: null,
    assigneeAvatarUrl: null,
    parentKey: t.parent_task_id ?? null,
    startDate: t.start_date ?? null,
    dueDate: t.due_date ?? null,
    epicColor: null,
    fixVersions: [],
    children,
  };
}

export function buildTasksTimelineTree(
  tasks: PlannerTask[],
  workstreams: Workstream[],
): TimelineIssue[] {
  if (tasks.length === 0) return [];

  // Group tasks by workstream_id
  const byWorkstream = new Map<string | null, PlannerTask[]>();
  for (const t of tasks) {
    const ws = t.workstream_id ?? null;
    if (!byWorkstream.has(ws)) byWorkstream.set(ws, []);
    byWorkstream.get(ws)!.push(t);
  }

  const result: TimelineIssue[] = [];
  const wsLookup = new Map(workstreams.map((w) => [w.id, w]));

  for (const [wsId, wsTasks] of byWorkstream) {
    const ws = wsId ? wsLookup.get(wsId) : null;
    const groupName = ws?.name ?? 'Unassigned';
    const groupColor = ws?.color ?? 'var(--ds-text-subtle)';

    // Partition into roots and children
    const byParent = new Map<string, PlannerTask[]>();
    const roots: PlannerTask[] = [];
    const taskIds = new Set(wsTasks.map((t) => t.id));
    for (const t of wsTasks) {
      if (t.parent_task_id && taskIds.has(t.parent_task_id)) {
        if (!byParent.has(t.parent_task_id)) byParent.set(t.parent_task_id, []);
        byParent.get(t.parent_task_id)!.push(t);
      } else {
        // Orphan subtasks (parent not in input) also become roots — silence beats a lie per CLAUDE.md
        roots.push(t);
      }
    }

    const rootIssues = roots.map((root) => {
      const childTasks = byParent.get(root.id) ?? [];
      const childIssues = childTasks.map((c) => taskToTimelineIssue(c, []));
      return taskToTimelineIssue(root, childIssues);
    });

    result.push({
      id: `ws-${wsId ?? 'unassigned'}`,
      issueKey: `ws-${wsId ?? 'unassigned'}`,
      projectKey: 'PLN',
      issueType: 'Epic', // workstream visually mirrors epic in the timeline
      summary: groupName,
      status: '',
      statusCategory: '',
      priority: null,
      assigneeDisplayName: null,
      assigneeAvatarUrl: null,
      parentKey: null,
      startDate: null,
      dueDate: null,
      epicColor: groupColor,
      fixVersions: [],
      isGroup: true,
      children: rootIssues,
    });
  }

  return result;
}
```

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/timeline/buildTasksTimelineTree.ts \
  src/modules/tasks/timeline/__tests__/buildTasksTimelineTree.test.ts
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): buildTasksTimelineTree groups tasks by workstream

Pure function — workstream group → root tasks → subtasks. Orphan subtasks
promoted to root (silence beats a lie per CLAUDE.md zero-assumption rule).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: Build `useTasksTimeline` hook

**Files:**
- Create: `src/modules/tasks/timeline/useTasksTimeline.ts`

- [ ] **Step 1: Implement.**

```ts
import { useMemo } from 'react';
import { useTaskItems } from '@/modules/tasks/hooks/useTaskItems';
import { useWorkstreams } from '@/modules/tasks/hooks/useWorkstreams';
import { buildTasksTimelineTree } from './buildTasksTimelineTree';

export function useTasksTimeline() {
  const { data: tasks = [], isLoading: tasksLoading } = useTaskItems();
  const { data: workstreams = [], isLoading: wsLoading } = useWorkstreams();
  const tree = useMemo(
    () => buildTasksTimelineTree(tasks, workstreams),
    [tasks, workstreams],
  );
  return { tree, isLoading: tasksLoading || wsLoading };
}
```

- [ ] **Step 2: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/modules/tasks/timeline/useTasksTimeline.ts
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): useTasksTimeline hook composes tasks + workstreams into tree

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.3: Build `TasksTimelineView` (mounts `TimelineView`)

**Files:**
- Create: `src/modules/tasks/views/TasksTimelineView.tsx`

- [ ] **Step 1: Read `src/pages/project-hub/timeline/ProjectHubTimelinePage.tsx`** to understand how it constructs the `mutations`, `filterOptions`, `resolveItemType`, `buildIssueDetailRoute` props passed to `TimelineView`. Mirror that pattern but with tasks-side hooks.

- [ ] **Step 2: Implement.**

```tsx
import TimelineView from '@/components/shared/Timeline/TimelineView';
import { useTasksTimeline } from '@/modules/tasks/timeline/useTasksTimeline';
import { useUpdatePlannerTask } from '@/modules/tasks/hooks/useTaskItems';

export default function TasksTimelineView() {
  const { tree, isLoading } = useTasksTimeline();
  const updateMutation = useUpdatePlannerTask();

  if (isLoading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <TimelineView
      items={tree}
      hubLabel="Tasks"
      hubKey="tasks"
      filterOptions={{}}
      buildIssueDetailRoute={(issueKey) => `/tasks/list/${issueKey}`}
      resolveItemType={() => 'Task'}
      detailRouteOwnerKey="tasks"
      menuVariant="jira"
      mutations={{
        onUpdateDates: async (issueKey, dates) => {
          // Map issueKey → task id via tree lookup
          // Call updateMutation.mutateAsync({ id, updates: { start_date, due_date } })
        },
        onRemoveDates: async (issueKey) => {
          // Same as above with null dates
        },
      }}
    />
  );
}
```

The exact `mutations` shape comes from `TimelineMutations` in `src/components/shared/Timeline/types.ts`. Read it and implement every callback that's relevant for tasks (e.g. status change, reparent if supported). Leave unimplemented callbacks undefined rather than throwing.

- [ ] **Step 3: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/modules/tasks/views/TasksTimelineView.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): TasksTimelineView mounts canonical TimelineView

menuVariant='jira' aligns with project hub + product hub timelines per
commit 98050d7d4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.4: Wire `TasksTimelineView` into `PlannerPage` + delete legacy

- [ ] **Step 1: Modify `PlannerPage.tsx`** — replace the `activeView === 'timeline'` branch's mount with `<TasksTimelineView />`.

- [ ] **Step 2: Live verify `/tasks/timeline`** in Chrome (DOM probe):
  - Workstream group rows render
  - Tasks render as bars
  - Subtasks render nested under root tasks (if any exist)
  - Drag a date — persists after refresh
  - Right-click row menu shows `menuVariant='jira'` items
  - **Project Hub `/project-hub/BAU/timeline` still works** (re-verify)

- [ ] **Step 3: Delete `PlannerTimeline.tsx`** once grep confirms no other imports:

Run: `grep -rn "PlannerTimeline" ~/Documents/mim/catalyst/catalyst-prod-45/src --include='*.ts' --include='*.tsx'`
Expected: only the file itself appears.

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 rm src/modules/tasks/components/PlannerTimeline.tsx
```

- [ ] **Step 4: tsc + test sweep.**

Run: `npx tsc --noEmit 2>&1 | head -20`
Run: `npx vitest run`

- [ ] **Step 5: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/modules/tasks/PlannerPage.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): mount TasksTimelineView, delete legacy PlannerTimeline

/tasks/timeline now uses canonical TimelineView shared component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Phase 3 done.** Pause for user approval before starting Phase 4.

---

## Phase 4 — Overview (`/tasks/overview` → DashboardWidgetGrid)

**Outcome:** `/tasks/overview` mounts the canonical `DashboardWidgetGrid` with 5 task-native widgets. Legacy `PlannerDashboard` (or equivalent) is deleted.

### Task 4.0: Read the canonicals

- [ ] **Step 1: Read:**
  - `src/components/project-hub/dashboard/DashboardWidgetGrid.tsx` — confirm its prop interface (does it take `registry`, or hardcode `WIDGET_REGISTRY`?).
  - `src/components/project-hub/dashboard/widget-types.ts` — `WidgetDefinition`, `WidgetProps` shapes.
  - `src/components/project-hub/dashboard/widget-registry.ts` — see the existing 10 widgets for reference.
  - One existing widget e.g. `OverdueWidget.tsx` — pattern to mirror.

- [ ] **Step 2:** If `DashboardWidgetGrid` hardcodes `WIDGET_REGISTRY` rather than taking it as a prop, refactor it to take `registry` as a prop (defaulting to `WIDGET_REGISTRY` for backward compatibility). Commit that refactor first as a no-op.

```bash
# If refactor is needed:
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/components/project-hub/dashboard/DashboardWidgetGrid.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
refactor(dashboard): DashboardWidgetGrid accepts registry prop

No-op for project hub (default = WIDGET_REGISTRY). Opens the seam for
tasks-side registry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4.1 — 4.5: One widget per task

For each of the 5 widgets, follow the same template:

**Task 4.1: `TasksByStatusWidget`**
**Files:**
- Create: `src/modules/tasks/widgets/TasksByStatusWidget.tsx`
- Test: `src/modules/tasks/widgets/__tests__/TasksByStatusWidget.test.tsx`

- [ ] **Step 1: Read** the existing `ItemsByStatusWidget.tsx` in `src/components/project-hub/dashboard/widgets/`. Note its visual structure (header, count, list, bar chart).
- [ ] **Step 2: Write a failing render test** — mount with mock task data, expect the 5 status bars and their counts.
- [ ] **Step 3: Run to fail.**
- [ ] **Step 4: Implement** — reuse `WidgetWrapper` chrome (or whatever wrapper `ItemsByStatusWidget` uses), feed it tasks data via `useTaskItems` + grouped counts. Use ADS tokens for every color.
- [ ] **Step 5: Run to pass.**
- [ ] **Step 6: Audit (`node design-governance/rules/audit.js src/modules/tasks/widgets/TasksByStatusWidget.tsx` — 0 violations).**
- [ ] **Step 7: Commit.**

**Task 4.2: `OverdueTasksWidget`**
- **Files:** Create `src/modules/tasks/widgets/OverdueTasksWidget.tsx` + `__tests__/OverdueTasksWidget.test.tsx`
- **Mirror:** `src/components/project-hub/dashboard/widgets/OverdueWidget.tsx`
- **Selector:** `tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && !t.status_is_done)`
- **Display:** count + list of overdue task titles with key + due date + assignee
- **TDD steps:** read mirror → failing render test (mount with 3 tasks: 1 overdue, 1 not overdue, 1 done → expect count=1, list shows only the overdue one) → run to fail → implement → run to pass → audit → commit.

**Task 4.3: `BlockedTasksWidget`**
- **Files:** Create `src/modules/tasks/widgets/BlockedTasksWidget.tsx` + `__tests__/BlockedTasksWidget.test.tsx`
- **Mirror:** `src/components/project-hub/dashboard/widgets/OnHoldWidget.tsx`
- **Selector:** `tasks.filter(t => t.blocked === true)`
- **Display:** count + list of blocked task titles with key + blocked_reason
- **TDD steps:** same shape as Task 4.2. Test fixture: 2 blocked + 1 not blocked → expect count=2.

**Task 4.4: `AssigneeWorkloadWidget`**
- **Files:** Create `src/modules/tasks/widgets/AssigneeWorkloadWidget.tsx` + `__tests__/AssigneeWorkloadWidget.test.tsx`
- **Mirror:** `src/components/project-hub/dashboard/widgets/TeamWorkloadWidget.tsx`
- **Selector:** Group `tasks` by `assignee_id`, filter `!status_is_done`, count per assignee. Resolve display names via the same `profiles` join `useTaskItems` uses.
- **Display:** list of assignees ordered by descending count, with avatar + count.
- **TDD steps:** test fixture: 3 tasks (2 assigned to user A, 1 to user B, 1 unassigned → unassigned excluded) → expect user A row first with count=2, user B row second with count=1.

**Task 4.5: `WorkstreamProgressWidget`**
- **Files:** Create `src/modules/tasks/widgets/WorkstreamProgressWidget.tsx` + `__tests__/WorkstreamProgressWidget.test.tsx`
- **Mirror:** `src/components/project-hub/dashboard/widgets/DemandFulfilmentGadget.tsx`
- **Selector:** Group tasks by `workstream_id`. For each workstream compute `done = tasks.filter(t => t.status_is_done).length`, `total = tasks.length`, `percent = total ? Math.round((done/total) * 100) : 0`. Skip groups with `total === 0`.
- **Display:** list of workstreams with name + color dot + progress bar + "N of M done (P%)".
- **TDD steps:** test fixture: workstream A with 3 tasks (2 done), workstream B with 2 tasks (0 done), workstream C with 0 tasks → expect 2 rows (A 67%, B 0%), C omitted.

For each widget commit:
```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add \
  src/modules/tasks/widgets/<WidgetName>.tsx \
  src/modules/tasks/widgets/__tests__/<WidgetName>.test.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "feat(tasks): <WidgetName> for tasks overview"
```

---

### Task 4.6: Build `tasks-widget-registry.ts`

**Files:**
- Create: `src/modules/tasks/widgets/tasks-widget-registry.ts`
- Test: `src/modules/tasks/widgets/__tests__/tasks-widget-registry.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { TASKS_WIDGET_REGISTRY } from '../tasks-widget-registry';

describe('TASKS_WIDGET_REGISTRY', () => {
  it('exports 5 widgets in expected order', () => {
    expect(TASKS_WIDGET_REGISTRY.map((w) => w.id)).toEqual([
      'tasks-by-status',
      'overdue-tasks',
      'blocked-tasks',
      'assignee-workload',
      'workstream-progress',
    ]);
  });

  it('every widget has the WidgetDefinition shape', () => {
    for (const w of TASKS_WIDGET_REGISTRY) {
      expect(w.id).toBeTypeOf('string');
      expect(w.title).toBeTypeOf('string');
      expect(w.component).toBeTypeOf('function');
      expect(w.defaultSpan).toBe(12);
      expect(w.minSpan).toBe(12);
    }
  });
});
```

- [ ] **Step 2: Implement.**

```ts
import type { WidgetDefinition } from '@/components/project-hub/dashboard/widget-types';
import TasksByStatusWidget from './TasksByStatusWidget';
import OverdueTasksWidget from './OverdueTasksWidget';
import BlockedTasksWidget from './BlockedTasksWidget';
import AssigneeWorkloadWidget from './AssigneeWorkloadWidget';
import WorkstreamProgressWidget from './WorkstreamProgressWidget';

export const TASKS_WIDGET_REGISTRY: WidgetDefinition[] = [
  { id: 'tasks-by-status', title: 'Tasks by status', group: 'delivery',
    defaultSpan: 12, minSpan: 12, defaultPosition: 0, component: TasksByStatusWidget },
  { id: 'overdue-tasks', title: 'Overdue tasks', group: 'delivery',
    defaultSpan: 12, minSpan: 12, defaultPosition: 1, component: OverdueTasksWidget },
  { id: 'blocked-tasks', title: 'Blocked tasks', group: 'delivery',
    defaultSpan: 12, minSpan: 12, defaultPosition: 2, component: BlockedTasksWidget },
  { id: 'assignee-workload', title: 'Assignee workload', group: 'team',
    defaultSpan: 12, minSpan: 12, defaultPosition: 3, component: AssigneeWorkloadWidget },
  { id: 'workstream-progress', title: 'Workstream progress', group: 'delivery',
    defaultSpan: 12, minSpan: 12, defaultPosition: 4, component: WorkstreamProgressWidget },
];
```

- [ ] **Step 3: Run test to pass.**
- [ ] **Step 4: Commit.**

---

### Task 4.7: Build `TasksOverviewView` (mounts `DashboardWidgetGrid`)

**Files:**
- Create: `src/modules/tasks/views/TasksOverviewView.tsx`

- [ ] **Step 1: Implement.**

```tsx
import DashboardWidgetGrid from '@/components/project-hub/dashboard/DashboardWidgetGrid';
import { TASKS_WIDGET_REGISTRY } from '@/modules/tasks/widgets/tasks-widget-registry';

export default function TasksOverviewView() {
  return (
    <DashboardWidgetGrid
      registry={TASKS_WIDGET_REGISTRY}
      // projectId/projectKey are project-hub-specific. Task widgets ignore them.
      projectId=""
      projectKey="tasks"
      mode="product" // or extend mode to 'tasks' if DashboardWidgetGrid behaviour differs by mode
    />
  );
}
```

If `mode='tasks'` is needed (because `mode='product'` triggers product-hub-specific behaviour like hiding certain widgets), add `'tasks'` to the `mode` enum on `WidgetProps`. Do this in a separate commit first.

- [ ] **Step 2: Commit.**

---

### Task 4.8: Wire `TasksOverviewView` into `PlannerPage` + delete legacy

- [ ] **Step 1: Modify `PlannerPage.tsx`** — replace the `activeView === 'dashboard'` branch's mount with `<TasksOverviewView />`.

- [ ] **Step 2: Live verify `/tasks/overview`** in Chrome (DOM probe):
  - 5 widgets render with `WidgetWrapper` chrome
  - Drag-to-reorder works
  - Edit mode toggle works
  - Each widget displays correct count for the current tasks data
  - **Project Hub `/project-hub/BAU/overview` still works** (re-verify)

- [ ] **Step 3: Delete legacy** `PlannerDashboard` / dashboard files in `src/modules/tasks/` once grep confirms no remaining imports.

```bash
grep -rn "PlannerDashboard\|TasksDashboard" ~/Documents/mim/catalyst/catalyst-prod-45/src --include='*.ts' --include='*.tsx'
```

Delete only the files confirmed unused.

- [ ] **Step 4: tsc + test sweep.**

Run: `npx tsc --noEmit 2>&1 | head -20`
Run: `npx vitest run`

- [ ] **Step 5: Commit.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 add src/modules/tasks/PlannerPage.tsx
git -C ~/Documents/mim/catalyst/catalyst-prod-45 status --short
git -C ~/Documents/mim/catalyst/catalyst-prod-45 commit -m "$(cat <<'EOF'
feat(tasks): mount TasksOverviewView, delete legacy dashboard

/tasks/overview now uses canonical DashboardWidgetGrid with 5 task-native widgets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Phase 4 done.**

---

## Final sweep

### Task 5.1: Full regression

- [ ] **Step 1: tsc.** `npx tsc --noEmit` — 0 errors.
- [ ] **Step 2: Tests.** `npx vitest run` — all green.
- [ ] **Step 3: Audit.** `node design-governance/rules/audit.js src/modules/tasks/` — verify count did not increase from baseline. New code must be 0-violation.
- [ ] **Step 4: Live verify all 4 Tasks tabs + 4 Project Hub equivalents.** No regressions in Project Hub.

### Task 5.2: Open PR

- [ ] **Step 1: Push branch.**

```bash
git -C ~/Documents/mim/catalyst/catalyst-prod-45 push -u origin tasks-hub-canonical-alignment
```

- [ ] **Step 2: Open PR via `gh pr create`** with title "feat(tasks): align Tasks Hub with canonical Project Hub components".

Use the spec file as the PR description's "Summary" and list the 4 phases in the "Changes" section.

---

## Notes for executing agents

1. **CLAUDE.md ZERO-ASSUMPTION rule** — Never write `|| 'Story'`-style fallbacks. Tasks have one type; the icon is always `JiraIssueTypeIcon type='Task'`, never a typed fallback elsewhere.
2. **CLAUDE.md `git add -A` ban** — Stage explicit paths only. Always `git status` before commit.
3. **CLAUDE.md TDD** — Every implementation step starts with a failing test, except for the data-source extraction (Task 2.2) which is a refactor — for that, run the existing test suite + live verify in lieu of a new failing test.
4. **CLAUDE.md REUSE FIRST** — If you find yourself writing >50 lines of new code outside the explicitly-listed adapter files, STOP and ask: is there a canonical I missed? Re-read the spec.
5. **Live verify uses DOM probe, NOT screenshot** — per CLAUDE.md 2026-06-01. Functional behaviour (drag persistence, picker open/close, mutation roundtrip) is verified by DOM/network inspection, not visual screenshots.
6. **Per-tab branch isolation** — Phase boundaries are pause points for user review. Do not start Phase N+1 without explicit user approval after Phase N is verified.
7. **If a canonical's prop name differs from this plan** — the plan documents intent. Adjust your call site to match the actual prop, never modify the canonical to match the plan.
