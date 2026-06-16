/**
 * useTasksTableData — adapter hook that wires Tasks data + mutations to the
 * canonical JiraTable contract.
 *
 * Composes:
 *   useTaskItems         → rows (PlannerTask[])
 *   useTaskStatuses      → status popup options
 *   useTaskWorkstreams   → workstream popup options
 *   useTaskUsers         → assignee popup options (full team directory)
 *   useUpdatePlannerTask → cell-edit mutations
 *   buildTasksListColumns (Task 1.2) → final Column<PlannerTask>[]
 *
 * Row actions for the ⋯ menu are OWNED BY THE VIEW (Task 1.5c, 2026-06-16) —
 * they require access to `navigate` / `queryClient` / `supabase` / `flag`
 * (toasts), which belong at the page level. The view passes the full
 * `RowAction<PlannerTask>[]` in via the `rowActions` arg. Mirrors Project Hub
 * backlog (`BacklogPage.atlaskit.tsx:2064`).
 *
 * MUTATION COVERAGE:
 *   `useUpdatePlannerTask` (src/modules/tasks/hooks/useTaskItems.ts) writes
 *   status (via `status_id` resolved from the slug) and workstream (via
 *   `workstream_id`) alongside priority/blocked/blockedReason/progress/
 *   assigneeId/dueDate/startDate/title/description. Closed in Task 1.3a
 *   (commit 47a241f3c) — column-registry onCellEdit patches for status and
 *   teamId now persist through to the DB.
 *
 * 2026-06-16 (Task 1.5b): assigneeOptions switched from derived-from-tasks
 *   to the full team directory via `useTaskUsers` — mirrors Project Hub
 *   backlog (which uses a full assignee list, not derived). Also exposes
 *   `users` from the hook so the toolbar can render the AvatarGroup.
 *
 * Zero-assumption code (CLAUDE.md 2026-06-11): all options are derived from
 * real data — when a query returns empty, we return an empty option list, not
 * a typed-domain fallback.
 */
import { useCallback, useMemo } from 'react';
import {
  useTaskItems,
  useUpdatePlannerTask,
} from './useTaskItems';
import { useTaskStatuses } from './useTaskStatuses';
import { useTaskWorkstreams } from './useTaskWorkstreams';
import { useTaskUsers } from './useTaskUsers';
import {
  buildTasksListColumns,
  type TasksListColumnArgs,
} from '@/modules/tasks/columns/tasksListColumns';
import type { Column } from '@/components/shared/JiraTable/types';
import type {
  StatusOption,
  AssigneeChoice,
  WorkstreamChoice,
  RowAction,
} from '@/components/shared/JiraTable/editors';
import type { LozengeAppearance } from '@/components/shared/JiraTable/cells';
import type { PlannerTask, PlannerUser, TaskStatus } from '@/modules/tasks/types';

/**
 * Passthrough row mapper. JiraTable consumes PlannerTask directly because the
 * column registry (Task 1.2) reads fields by camelCase name. The mapper exists
 * as an explicit seam so any future schema drift between the data hook and the
 * column registry is caught by the test in `__tests__/useTasksTableData.test.ts`.
 */
export function mapTasksToRows(tasks: PlannerTask[]): PlannerTask[] {
  return tasks;
}

/**
 * Maps a `PlannerStatus` slug/name to the `LozengeAppearance` token used by
 * the status popup options. The column registry's `appearanceFor` lookup is
 * the source of truth for runtime rendering; this mirror keeps the options
 * list visually consistent in the dropdown.
 */
function statusSlugToAppearance(slug: string): LozengeAppearance {
  switch (slug) {
    case 'done':
      return 'success';
    case 'in-progress':
      return 'inprogress';
    case 'review':
      return 'moved';
    case 'planned':
      return 'new';
    case 'backlog':
      return 'default';
    default:
      // Unknown slug → neutral default. Not a typed-domain fallback: we are
      // intentionally widening to "no opinion" rather than asserting a status.
      return 'default';
  }
}

export type TasksTableDataReturn = {
  rows: PlannerTask[];
  columns: Column<PlannerTask>[];
  isLoading: boolean;
  error: unknown;
  /** Full team directory — exposed for the toolbar AvatarGroup. */
  users: PlannerUser[];
};

export function useTasksTableData(args: {
  onOpen: (row: PlannerTask) => void;
  getHref: (row: PlannerTask) => string;
  /**
   * Full row-action array. Owned by the view so action handlers have access
   * to navigate / queryClient / supabase / flag toasts. Mirrors Project Hub
   * backlog where `rowActions` is built in `BacklogPage.atlaskit.tsx:2064`.
   */
  rowActions: RowAction<PlannerTask>[];
}): TasksTableDataReturn {
  const tasksQuery = useTaskItems();
  const statusesQuery = useTaskStatuses();
  const workstreamsQuery = useTaskWorkstreams();
  const usersQuery = useTaskUsers();
  const updateMutation = useUpdatePlannerTask();

  const onCellEdit = useCallback(
    async (id: string, patch: Partial<PlannerTask>) => {
      // KNOWN GAP (see file header): `status`, `teamId`, `teamName`, `teamColor`
      // are silently ignored by useUpdatePlannerTask today. Forwarded as-is per
      // task spec; do not invent a mutation path.
      await updateMutation.mutateAsync({ id, updates: patch });
    },
    [updateMutation],
  );

  // Status options: use the PlannerStatus slug as the value so the column
  // registry's `appearanceFor(row.status)` and `value` field align (both are
  // the camelCase slug union like 'in-progress', 'done', etc.).
  const statusOptions: StatusOption[] = useMemo(
    () =>
      (statusesQuery.data ?? []).map((s) => ({
        value: s.slug,
        label: s.name,
        appearance: statusSlugToAppearance(s.slug),
      })),
    [statusesQuery.data],
  );

  // Workstream options: drop archived workstreams (already filtered by the
  // hook by default). Map directly to the canonical WorkstreamChoice shape.
  const workstreamOptions: WorkstreamChoice[] = useMemo(
    () =>
      (workstreamsQuery.data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        color: w.color ?? null,
      })),
    [workstreamsQuery.data],
  );

  // Assignee options: full team directory via useTaskUsers (same source the
  // Kanban + Create modal pickers use). Mirrors Project Hub backlog which
  // shows the full assignee list, not a derived-from-rows subset.
  const assigneeOptions: AssigneeChoice[] = useMemo(
    () =>
      (usersQuery.data ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl ?? null,
      })),
    [usersQuery.data],
  );

  const columnArgs: TasksListColumnArgs = useMemo(
    () => ({
      onOpen: args.onOpen,
      getHref: args.getHref,
      statusOptions,
      assigneeOptions,
      workstreamOptions,
      onCellEdit,
      rowActions: args.rowActions,
    }),
    [
      args.onOpen,
      args.getHref,
      statusOptions,
      assigneeOptions,
      workstreamOptions,
      onCellEdit,
      args.rowActions,
    ],
  );

  const columns = useMemo(() => buildTasksListColumns(columnArgs), [columnArgs]);

  return {
    rows: mapTasksToRows(tasksQuery.data ?? []),
    columns,
    isLoading:
      tasksQuery.isLoading || statusesQuery.isLoading || workstreamsQuery.isLoading,
    error: tasksQuery.error ?? statusesQuery.error ?? workstreamsQuery.error,
    users: usersQuery.data ?? [],
  };
}

// Re-export for downstream consumers that need to type a status edit payload
// without importing from types.ts directly.
export type { TaskStatus };
