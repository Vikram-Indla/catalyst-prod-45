/**
 * useTasksTableData — adapter hook that wires Tasks data + mutations to the
 * canonical JiraTable contract.
 *
 * Composes:
 *   useTaskItems         → rows (PlannerTask[])
 *   useTaskStatuses      → status popup options
 *   useTaskWorkstreams   → workstream popup options
 *   useUpdatePlannerTask → cell-edit mutations
 *   useDeletePlannerTask → row-delete mutation
 *   buildTasksListColumns (Task 1.2) → final Column<PlannerTask>[]
 *
 * KNOWN GAPS (surfaced as concerns to Task 1.3, NOT silently masked):
 *   1. `useUpdatePlannerTask` (src/modules/tasks/hooks/useTaskItems.ts:107) does
 *      NOT currently handle `status` or `teamId/teamName/teamColor` patches —
 *      its dbUpdates mapper only covers priority/blocked/blockedReason/progress/
 *      assigneeId/dueDate/startDate/title/description. The column registry
 *      (Task 1.2) emits onCellEdit({ status, teamId, teamName, teamColor }) for
 *      the status + workstream popups, so those edits are SILENTLY DROPPED
 *      today. Per the task spec ("do NOT invent a status-mutation path") this
 *      adapter forwards the patch as-is — extending useUpdatePlannerTask is a
 *      follow-up task.
 *
 *   2. assigneeOptions are derived from the loaded tasks set (de-duplicated
 *      assignees). A proper full-directory picker (read from `profiles` or
 *      `resource_inventory`) is a follow-up.
 *
 * Zero-assumption code (CLAUDE.md 2026-06-11): all options are derived from
 * real data — when a query returns empty, we return an empty option list, not
 * a typed-domain fallback.
 */
import { useCallback, useMemo } from 'react';
import {
  useTaskItems,
  useUpdatePlannerTask,
  useDeletePlannerTask,
} from './useTaskItems';
import { useTaskStatuses } from './useTaskStatuses';
import { useTaskWorkstreams } from './useTaskWorkstreams';
import {
  buildTasksListColumns,
  type TasksListColumnArgs,
} from '@/modules/tasks/columns/tasksListColumns';
import type { Column } from '@/components/shared/JiraTable/types';
import type {
  StatusOption,
  AssigneeChoice,
  WorkstreamChoice,
} from '@/components/shared/JiraTable/editors';
import type { LozengeAppearance } from '@/components/shared/JiraTable/cells';
import type { PlannerTask, TaskStatus } from '@/modules/tasks/types';

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
};

export function useTasksTableData(args: {
  onOpen: (row: PlannerTask) => void;
  getHref: (row: PlannerTask) => string;
}): TasksTableDataReturn {
  const tasksQuery = useTaskItems();
  const statusesQuery = useTaskStatuses();
  const workstreamsQuery = useTaskWorkstreams();
  const updateMutation = useUpdatePlannerTask();
  const deleteMutation = useDeletePlannerTask();

  const onCellEdit = useCallback(
    async (id: string, patch: Partial<PlannerTask>) => {
      // KNOWN GAP (see file header): `status`, `teamId`, `teamName`, `teamColor`
      // are silently ignored by useUpdatePlannerTask today. Forwarded as-is per
      // task spec; do not invent a mutation path.
      await updateMutation.mutateAsync({ id, updates: patch });
    },
    [updateMutation],
  );

  const onRowDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
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

  // Assignee options: derived from the loaded tasks. De-duplicate by id.
  // KNOWN GAP (see file header): a full-directory picker is a follow-up task.
  const assigneeOptions: AssigneeChoice[] = useMemo(() => {
    const seen = new Set<string>();
    const out: AssigneeChoice[] = [];
    for (const t of tasksQuery.data ?? []) {
      if (!t.assigneeId || seen.has(t.assigneeId)) continue;
      // Zero-assumption: if a row has assigneeId but no assigneeName, skip it
      // rather than render a placeholder. The column popup will still show
      // every assignee that has at least one row with a real name.
      if (!t.assigneeName) continue;
      seen.add(t.assigneeId);
      out.push({ id: t.assigneeId, name: t.assigneeName });
    }
    return out;
  }, [tasksQuery.data]);

  const columnArgs: TasksListColumnArgs = useMemo(
    () => ({
      onOpen: args.onOpen,
      getHref: args.getHref,
      statusOptions,
      assigneeOptions,
      workstreamOptions,
      onCellEdit,
      onRowDelete,
    }),
    [
      args.onOpen,
      args.getHref,
      statusOptions,
      assigneeOptions,
      workstreamOptions,
      onCellEdit,
      onRowDelete,
    ],
  );

  const columns = useMemo(() => buildTasksListColumns(columnArgs), [columnArgs]);

  return {
    rows: mapTasksToRows(tasksQuery.data ?? []),
    columns,
    isLoading:
      tasksQuery.isLoading || statusesQuery.isLoading || workstreamsQuery.isLoading,
    error: tasksQuery.error ?? statusesQuery.error ?? workstreamsQuery.error,
  };
}

// Re-export for downstream consumers that need to type a status edit payload
// without importing from types.ts directly.
export type { TaskStatus };
