/**
 * tasksListColumns — canonical JiraTable column schema for the Tasks Hub list.
 *
 * Mirrors Project Hub backlog (`BacklogPage.atlaskit.tsx`) column registry per
 * CLAUDE.md "CANONICAL TABLE — JiraTable" + "REUSE FIRST" rules (P0). The Work
 * column composes makeKeyCell + makeSummaryInlineEditCell in a SINGLE flex cell
 * — same pattern as Project Hub. NO standalone Key / Summary, NO __drag column,
 * NO placeholder created_at/updated_at columns.
 *
 * Column order + default visibility (matches Project Hub backlog 2026-05-17+):
 *
 *   Order:    key · workstream · status · assignee · priority · due_date · __actions
 *   Default:  key · workstream · status · assignee  (4 columns, parity with backlog)
 *   Hidden:   priority · due_date  (toggle via column picker)
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
import type { Column, CellProps } from '@/components/shared/JiraTable/types';
import { makeKeyCell } from '@/components/shared/JiraTable/cells';
import {
  makeSummaryInlineEditCell,
  makeStatusEditCellAkPopup,
  makePriorityEditCell,
  makeAssigneeEditCell,
  makeDateEditCell,
  makeWorkstreamEditCell,
  makeRowActionsCell,
  type StatusOption,
  type AssigneeChoice,
  type WorkstreamChoice,
  type RowAction,
} from '@/components/shared/JiraTable/editors';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { PlannerTask } from '@/modules/tasks/types';

// ─── Default visibility set ─────────────────────────────────────────────────
// Per CLAUDE.md 2026-05-07: this array MUST equal the columns flagged
// `defaultVisible: true` in the output of `buildTasksListColumns`. The test
// enforces this. Mirrors Project Hub backlog DEFAULT_VISIBLE_COLUMNS:
//   ['key', 'status', 'parent', 'assignee']  (project)
//   ['key', 'workstream', 'status', 'assignee']  (tasks — workstream is the
//   Tasks analog of parent)
export const DEFAULT_VISIBLE_COLUMNS = [
  'key',
  'workstream',
  'status',
  'assignee',
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
  /**
   * Row actions for the ⋯ menu. The view owns the full array (so it has
   * access to navigate/queryClient/supabase). The 'open' action is filtered
   * out at the actions-cell site — row-click already opens the detail.
   *
   * Mirrors Project Hub backlog (BacklogPage.atlaskit.tsx:2064). See Task 1.5c
   * commit message for the per-action wiring rationale.
   */
  rowActions: RowAction<PlannerTask>[];
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
    rowActions,
  } = args;

  return [
    // 1. Work — combined cell: [Task icon] [KEY] [summary text]. Single flex
    //    column matching Project Hub backlog (BacklogPage.atlaskit.tsx:2274).
    {
      id: 'key',
      label: 'Work',
      flex: true,
      sortable: true,
      alwaysVisible: true,
      defaultVisible: true,
      accessor: (r) => r.key || '',
      cell: (() => {
        const keyCellRenderer = makeKeyCell(
          (r: PlannerTask) => r.key,
          (r: PlannerTask) => onOpen(r),
          (r: PlannerTask) => getHref(r),
          () => TASK_TYPE_ICON,
        );
        const summaryCellRenderer = makeSummaryInlineEditCell<PlannerTask>({
          getSummary: (r) => r.title,
          onChange: (row, next) => {
            void onCellEdit(row.id, { title: next });
          },
          onOpenWorkItem: (row) => onOpen(row),
        });
        return function WorkCell(props: CellProps<PlannerTask>) {
          return React.createElement(
            'span',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                minWidth: 0,
              },
            },
            keyCellRenderer(props),
            React.createElement(
              'span',
              { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' } },
              summaryCellRenderer(props),
            ),
          );
        };
      })(),
    },
    // 2. Workstream — Tasks analog of Project Hub's "Parent" column. Popup
    //    picker via makeWorkstreamEditCell.
    {
      id: 'workstream',
      label: 'Workstream',
      width: 11,
      sortable: true,
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
    // 3. Status — Atlaskit popup edit cell.
    {
      id: 'status',
      label: 'Status',
      width: 15,
      sortable: true,
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
          }
          // Exhaustiveness check (CLAUDE.md 2026-06-11 zero-assumption code):
          // if `PlannerTask['status']` gains a new value, TypeScript will flag
          // this line — surface the missing case rather than silently grey it.
          const _exhaustive: never = status;
          return _exhaustive;
        },
        options: statusOptions,
        onChange: (row, next) => {
          void onCellEdit(row.id, { status: next as PlannerTask['status'] });
        },
      }),
    },
    // 4. Assignee — popup assignee picker.
    {
      id: 'assignee',
      label: 'Assignee',
      width: 11,
      sortable: true,
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
    // 5. Priority — popup priority edit cell. Hidden by default (matches
    //    Project Hub default visible set).
    {
      id: 'priority',
      label: 'Priority',
      width: 6,
      sortable: true,
      defaultVisible: false,
      cell: makePriorityEditCell<PlannerTask>({
        getPriority: (row) => row.priority,
        onChange: (row, next) => {
          void onCellEdit(row.id, { priority: next as PlannerTask['priority'] });
        },
      }),
    },
    // 6. Due date — date edit cell. Hidden by default.
    {
      id: 'due_date',
      label: 'Due date',
      width: 8,
      sortable: true,
      defaultVisible: false,
      cell: makeDateEditCell<PlannerTask>({
        getDate: (row) => row.dueDate ?? null,
        onChange: (row, next) => {
          void onCellEdit(row.id, { dueDate: next ?? undefined });
        },
      }),
    },
    // 7. Row actions (⋯ menu) — structural, always visible. Mirrors Project
    //    Hub's __actions column. Width 5 ≈ 60px to host the 28×28 button
    //    without clipping (BacklogPage 2026-06-09 fix).
    {
      id: '__actions',
      label: '',
      width: 5,
      align: 'center',
      alwaysVisible: true,
      cell: (props) =>
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' } },
          makeRowActionsCell<PlannerTask>({
            // Filter out 'open' — row-click already opens the detail.
            actions: rowActions.filter((a) => a.id !== 'open'),
          })(props),
        ),
    },
  ];
}
