/**
 * tasksListColumns — canonical JiraTable column schema for the Tasks Hub list.
 *
 * Built per CLAUDE.md "CANONICAL TABLE — JiraTable" rule (P0): every column
 * uses an existing factory from `cells.tsx` / `editors.tsx`. No bespoke cell
 * renderers. The 9 default-visible columns match Project Hub's list parity:
 *
 *   __drag · key · summary · status · priority · assignee · workstream · due_date · __menu
 *
 * Hidden-by-default columns (available via the column picker) are placeholders
 * that render empty until later tasks wire them up:
 *
 *   created_at · updated_at · start_date · progress · blocked · description
 *
 * DEFAULT_VISIBLE_COLUMNS is the single source of truth for default visibility
 * and MUST equal the set of columns flagged `defaultVisible: true`
 * (CLAUDE.md 2026-05-07 rule).
 *
 * Task type icon: a Task IS always a Task — `<JiraIssueTypeIcon type="Task" />`
 * is hardcoded, never derived from data. Zero-assumption code (CLAUDE.md
 * 2026-06-11) does NOT apply here because the type is structurally known.
 */
import React from 'react';
import type { Column } from '@/components/shared/JiraTable/types';
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
  type StatusOption,
  type AssigneeChoice,
  type WorkstreamChoice,
} from '@/components/shared/JiraTable/editors';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { PlannerTask } from '@/modules/tasks/types';

// ─── Default visibility set ─────────────────────────────────────────────────
// Per CLAUDE.md 2026-05-07: this array MUST equal the columns flagged
// `defaultVisible: true` in TASKS_LIST_COLUMNS. The test enforces this.
export const DEFAULT_VISIBLE_COLUMNS = [
  '__drag', 'key', 'summary', 'status', 'priority',
  'assignee', 'workstream', 'due_date', '__menu',
] as const;

// ─── Runtime wiring args ────────────────────────────────────────────────────
export type TasksListColumnArgs = {
  /** Open the task in the detail view. */
  onOpen: (row: PlannerTask) => void;
  /** URL for the key cell <a href>. */
  getHref: (row: PlannerTask) => string;
  /** Status options for the status edit popup. */
  statusOptions: StatusOption[];
  /** Assignee options for the assignee edit popup. */
  assigneeOptions: AssigneeChoice[];
  /** Workstream options for the workstream edit popup. */
  workstreamOptions: WorkstreamChoice[];
  /** Commit a cell edit — receives row id + partial patch. */
  onCellEdit: (id: string, patch: Partial<PlannerTask>) => Promise<void>;
  /** Delete a row from the row-menu. */
  onRowDelete: (id: string) => Promise<void>;
};

// ─── Helpers (zero-assumption: return null when data is absent) ─────────────
function toAssigneeChoice(row: PlannerTask): AssigneeChoice | null {
  if (!row.assigneeId || !row.assigneeName) return null;
  return { id: row.assigneeId, name: row.assigneeName };
}

function toWorkstreamChoice(row: PlannerTask): WorkstreamChoice | null {
  if (!row.teamId || !row.teamName) return null;
  return { id: row.teamId, name: row.teamName, color: row.teamColor ?? null };
}

// Task is structurally a Task — this is NOT a typed-domain fallback, the row
// type is invariant for this surface.
const TASK_TYPE_ICON = React.createElement(JiraIssueTypeIcon, { type: 'Task', size: 16 });

// ─── Column builder ─────────────────────────────────────────────────────────
export function buildTasksListColumns(args: TasksListColumnArgs): Column<PlannerTask>[] {
  const {
    onOpen,
    getHref,
    statusOptions,
    assigneeOptions,
    workstreamOptions,
    onCellEdit,
    onRowDelete,
  } = args;

  return [
    // 1. Drag handle — structural, always-visible, narrow.
    {
      id: '__drag',
      label: '',
      width: 2,
      defaultVisible: true,
      alwaysVisible: true,
      cell: makeDragHandleCell(() => true),
    },
    // 2. Key — leading task-type icon + clickable key.
    {
      id: 'key',
      label: 'Key',
      width: 8,
      defaultVisible: true,
      cell: makeKeyCell(
        (row) => row.key,
        onOpen,
        getHref,
        () => TASK_TYPE_ICON,
      ),
    },
    // 3. Summary — inline-edit title; flex-grow column.
    {
      id: 'summary',
      label: 'Summary',
      flex: true,
      defaultVisible: true,
      cell: makeSummaryInlineEditCell<PlannerTask>({
        getSummary: (row) => row.title,
        onChange: (row, next) => {
          void onCellEdit(row.id, { title: next });
        },
        onOpenWorkItem: onOpen,
      }),
    },
    // 4. Status — Atlaskit popup edit cell.
    {
      id: 'status',
      label: 'Status',
      width: 10,
      defaultVisible: true,
      cell: makeStatusEditCellAkPopup<PlannerTask>({
        getStatus: (row) => row.status,
        appearanceFor: (status) => {
          switch (status) {
            case 'done': return 'success';
            case 'in-progress': return 'inprogress';
            case 'review': return 'moved';
            case 'planned': return 'new';
            case 'backlog': return 'default';
            default: return 'default';
          }
        },
        options: statusOptions,
        onChange: (row, next) => {
          void onCellEdit(row.id, { status: next as PlannerTask['status'] });
        },
      }),
    },
    // 5. Priority — popup priority edit cell.
    {
      id: 'priority',
      label: 'Priority',
      width: 7,
      defaultVisible: true,
      cell: makePriorityEditCell<PlannerTask>({
        getPriority: (row) => row.priority,
        onChange: (row, next) => {
          void onCellEdit(row.id, { priority: next as PlannerTask['priority'] });
        },
      }),
    },
    // 6. Assignee — popup assignee picker.
    {
      id: 'assignee',
      label: 'Assignee',
      width: 11,
      defaultVisible: true,
      cell: makeAssigneeEditCell<PlannerTask>({
        getAssignee: toAssigneeChoice,
        options: assigneeOptions,
        onChange: (row, next) => {
          void onCellEdit(row.id, {
            assigneeId: next?.id ?? undefined,
            assigneeName: next?.name ?? undefined,
          });
        },
      }),
    },
    // 7. Workstream — popup workstream picker.
    {
      id: 'workstream',
      label: 'Workstream',
      width: 10,
      defaultVisible: true,
      cell: makeWorkstreamEditCell<PlannerTask>({
        getValue: toWorkstreamChoice,
        options: workstreamOptions,
        onChange: (row, next) => {
          void onCellEdit(row.id, {
            teamId: next?.id ?? undefined,
            teamName: next?.name ?? undefined,
            teamColor: next?.color ?? undefined,
          });
        },
      }),
    },
    // 8. Due date — date edit cell.
    {
      id: 'due_date',
      label: 'Due date',
      width: 8,
      defaultVisible: true,
      cell: makeDateEditCell<PlannerTask>({
        getDate: (row) => row.dueDate ?? null,
        onChange: (row, next) => {
          void onCellEdit(row.id, { dueDate: next ?? undefined });
        },
      }),
    },
    // 9. Created at — hidden placeholder (wired in later task).
    {
      id: 'created_at',
      label: 'Created',
      width: 8,
      defaultVisible: false,
      cell: () => null,
    },
    // 10. Updated at — hidden placeholder.
    {
      id: 'updated_at',
      label: 'Updated',
      width: 8,
      defaultVisible: false,
      cell: () => null,
    },
    // 11. Start date — hidden placeholder.
    {
      id: 'start_date',
      label: 'Start date',
      width: 8,
      defaultVisible: false,
      cell: () => null,
    },
    // 12. Progress — hidden placeholder.
    {
      id: 'progress',
      label: 'Progress',
      width: 7,
      defaultVisible: false,
      cell: () => null,
    },
    // 13. Blocked — hidden placeholder.
    {
      id: 'blocked',
      label: 'Blocked',
      width: 6,
      defaultVisible: false,
      cell: () => null,
    },
    // 14. Description — hidden placeholder.
    {
      id: 'description',
      label: 'Description',
      width: 12,
      defaultVisible: false,
      cell: () => null,
    },
    // 15. Row menu — structural, always-visible.
    {
      id: '__menu',
      label: '',
      width: 3,
      defaultVisible: true,
      alwaysVisible: true,
      cell: makeRowMenuCell({
        onOpen,
        onDelete: (row) => {
          void onRowDelete(row.id);
        },
      }),
    },
  ];
}

// ─── No-op default column set ───────────────────────────────────────────────
// `TASKS_LIST_COLUMNS` is `buildTasksListColumns()` called with no-op runtime
// args so the schema can be inspected (tests, column picker config) without
// runtime wiring. Consumers should call `buildTasksListColumns(args)` directly.
export const TASKS_LIST_COLUMNS: Column<PlannerTask>[] = buildTasksListColumns({
  onOpen: () => {},
  getHref: () => '#',
  statusOptions: [],
  assigneeOptions: [],
  workstreamOptions: [],
  onCellEdit: async () => {},
  onRowDelete: async () => {},
});
