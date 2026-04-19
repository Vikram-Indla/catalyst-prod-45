/**
 * Planner BoardAdapter<KanbanTask> — Phase 8.
 *
 * Converts the legacy PlanHub Kanban (`/taskhub-kanban`) off its bespoke
 * `KanbanBoard` + `@dnd-kit` stack and onto the canonical KanbanBoardShell
 * + Pragmatic drag-drop stack.
 *
 * Design notes — how PlanHub maps to the canonical card:
 *
 *   Card surface
 *     - issueKey   ← task.key                   (e.g. "PLN-047")
 *     - summary    ← task.title
 *     - issueType  ← "Task" (fixed — PlanHub has no type taxonomy)
 *     - priority   ← task.priority → P1/P2/P3/P4 map
 *     - status     ← task.status?.name
 *     - assignee   ← task.assignee?.full_name
 *     - primary    ← task.workstream?.name       (muted Atlaskit lozenge)
 *     - metaText   ← "{progress}%" when >0, else null
 *     - isFlagged  ← task.is_starred
 *     - raw        ← full KanbanTask
 *
 *   Columns — derived dynamically from `planner_statuses`. Each row becomes
 *     one column with `id: status.id`. `is_completed_status` → category
 *     'done'; `slug === 'backlog'` (or `is_default`) → 'todo'; everything
 *     else → 'in_progress'.
 *
 *   Persistence — drag persists through `useMoveKanbanTask` (status_id +
 *     position). Status-change from overflow picks the column's default
 *     status.
 */
import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { KanbanTask, PlannerStatus, KanbanTaskPriority } from '@/modules/planner/types/kanban';
import type { KanbanColumnDef } from '../kanban-tokens';
import type { BoardIssue } from '../kanban-types';
import type {
  BoardAdapter,
  CanonicalBoardIssue,
  BoardPersistence,
  BoardInteractions,
  BoardLozenge,
} from './BoardAdapter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import type { GroupByOption } from '@/components/shared/GroupByPopover';

/* ═══════════════════════════════════════════════════════════════════════
   Priority map — PlanHub enums → canonical P1–P4.
   ═══════════════════════════════════════════════════════════════════════ */

const PRIORITY_MAP: Record<KanbanTaskPriority, string> = {
  critical: 'P1',
  high: 'P2',
  medium: 'P3',
  low: 'P4',
};

/* ═══════════════════════════════════════════════════════════════════════
   Column derivation — PlannerStatus[] → KanbanColumnDef[].
   ═══════════════════════════════════════════════════════════════════════ */

function statusToCategory(status: PlannerStatus): 'todo' | 'in_progress' | 'done' {
  if (status.is_completed_status) return 'done';
  if (status.is_default || status.slug === 'backlog' || status.slug === 'planned') return 'todo';
  return 'in_progress';
}

export function buildPlannerColumns(statuses: PlannerStatus[]): KanbanColumnDef[] {
  return [...statuses]
    .sort((a, b) => a.position - b.position)
    .map(s => ({
      id: s.id,
      name: (s.name || '').toUpperCase(),
      category: statusToCategory(s),
      statuses: [s.name],
    }));
}

/* ═══════════════════════════════════════════════════════════════════════
   KanbanTask → CanonicalBoardIssue.
   ═══════════════════════════════════════════════════════════════════════ */

export function plannerTaskToCanonicalIssue(task: KanbanTask): CanonicalBoardIssue {
  const primary: BoardLozenge | null = task.workstream?.name
    ? { label: task.workstream.name, appearance: 'default' }
    : null;
  const metaText = task.progress && task.progress > 0 ? `${task.progress}%` : null;

  const issue: CanonicalBoardIssue = {
    id: task.id,
    issueKey: task.key,
    summary: task.title,
    issueType: 'Task',
    priority: PRIORITY_MAP[task.priority] || 'P3',
    status: task.status?.name || '',
    statusCategory: task.status ? statusToCategory(task.status) : 'todo',
    assigneeName: task.assignee?.full_name ?? null,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: !!task.is_starred,
    updatedAt: task.updated_at,
    createdAt: task.created_at,
    primaryLozenge: primary,
    secondaryLozenge: null,
    metaText,
    raw: task,
  };
  return issue;
}

/* ═══════════════════════════════════════════════════════════════════════
   Icon resolver — PlanHub has no type taxonomy, so every card is a Task.
   Uses Atlaskit blue to match the "Task" canonical SVG palette.
   ═══════════════════════════════════════════════════════════════════════ */

const PLANNER_ICON_COLOR = '#4BADE8';

export function resolvePlannerIcon(_card: BoardIssue): ReactNode | null {
  return <CheckCircle2 size={14} strokeWidth={2} style={{ color: PLANNER_ICON_COLOR }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter category builders.
   ═══════════════════════════════════════════════════════════════════════ */

function uniquePriorities(tasks: KanbanTask[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const p = PRIORITY_MAP[t.priority] || 'P3';
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const ordered = ['P1', 'P2', 'P3', 'P4'].filter(p => counts.has(p));
  return {
    id: 'priority',
    label: 'Priority',
    options: ordered.map(id => ({ id, label: id, labelExtra: String(counts.get(id) ?? 0) })),
  };
}

function uniqueWorkstreams(tasks: KanbanTask[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const name = t.workstream?.name;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return {
    id: 'workstream',
    label: 'Workstream',
    searchPlaceholder: 'Search workstreams...',
    options: Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueAssignees(tasks: KanbanTask[], avatarsByName: Map<string, string>): FilterCategory {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const name = t.assignee?.full_name;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return {
    id: 'assignee',
    label: 'Assignee',
    searchPlaceholder: 'Search people...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        id: name,
        label: name,
        labelExtra: String(count),
        avatarUrl: avatarsByName.get(name.toLowerCase()),
        avatarType: 'photo' as const,
      })),
  };
}

export function buildPlannerFilterCategories(
  tasks: KanbanTask[],
  avatarsByName: Map<string, string>,
): FilterCategory[] {
  return [
    uniquePriorities(tasks),
    uniqueWorkstreams(tasks),
    uniqueAssignees(tasks, avatarsByName),
  ];
}

/* ═══ Group-by options. ═══ */
export const PLANNER_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',        label: 'None' },
  { key: 'priority',    label: 'Priority' },
  { key: 'workstream',  label: 'Workstream' },
  { key: 'assignee',    label: 'Assignee' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildPlannerBoardAdapterArgs {
  tasks: KanbanTask[];
  statuses: PlannerStatus[];
  avatarsByName: Map<string, string>;

  search: string;
  onSearchChange: (v: string) => void;
  selAssignees: Set<string>;
  onSelAssigneesChange: (next: Set<string>) => void;
  filterSelected: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
  onClearFilters: () => void;
  groupBy: string;
  onGroupByChange: (key: string) => void;

  onMove: (taskId: string, newStatusId: string, newPosition: number) => void | Promise<void>;
  onToggleFlag?: (taskId: string, next: boolean) => void | Promise<void>;

  onCardClick?: (taskId: string) => void;
  onCreate?: () => void;
}

export function buildPlannerBoardAdapter(
  args: BuildPlannerBoardAdapterArgs,
): BoardAdapter<KanbanTask> {
  const {
    tasks, statuses, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onMove, onToggleFlag,
    onCardClick, onCreate,
  } = args;

  const columns = buildPlannerColumns(statuses);
  const STATUS_ID_TO_COL = new Map<string, string>();
  for (const s of statuses) STATUS_ID_TO_COL.set(s.id, s.id);
  const NAME_TO_COL = new Map<string, string>();
  for (const s of statuses) NAME_TO_COL.set(s.name, s.id);

  const statusToColumnId = (status: string): string | null => {
    // `status` here is the canonical status name; look up by column statuses.
    return NAME_TO_COL.get(status) ?? null;
  };
  const columnIdToStatusName = (columnId: string): string | null => {
    const s = statuses.find(x => x.id === columnId);
    return s?.name ?? null;
  };

  /* Client-side filter (search, priority, workstream, assignee). */
  const filtered = tasks.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.key.toLowerCase().includes(q)) return false;
    }
    if (selAssignees.size > 0) {
      const name = t.assignee?.full_name;
      if (!name || !selAssignees.has(name)) return false;
    }
    const prios = filterSelected.priority ?? [];
    if (prios.length > 0 && !prios.includes(PRIORITY_MAP[t.priority] || 'P3')) return false;
    const wss = filterSelected.workstream ?? [];
    if (wss.length > 0 && (!t.workstream?.name || !wss.includes(t.workstream.name))) return false;
    const ass = filterSelected.assignee ?? [];
    if (ass.length > 0) {
      const name = t.assignee?.full_name;
      if (!name || !ass.includes(name)) return false;
    }
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map(plannerTaskToCanonicalIssue);

  const allAssignees = Array.from(
    tasks.reduce((map, t) => {
      const name = t.assignee?.full_name;
      if (!name) return map;
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  /* Compute target position (append to end of destination column). */
  const persistence: BoardPersistence = {
    onDrop: (event) => {
      const destStatusId = event.destColId; // column id === status id by construction
      // Use insertIndex directly; useMoveKanbanTask re-reads current state
      // and dispatches the right RPC for within-column vs cross-column.
      return onMove(event.cardId, destStatusId, event.insertIndex);
    },
    onStatusChange: (cardId, newStatus) => {
      const destId = NAME_TO_COL.get(newStatus);
      if (destId) return onMove(cardId, destId, 0);
    },
    onToggleFlag: onToggleFlag
      ? (cardId) => {
          const task = tasks.find(t => t.id === cardId);
          return onToggleFlag(cardId, !(task?.is_starred));
        }
      : undefined,
  };

  const interactions: BoardInteractions = { onCardClick };

  return {
    name: 'planner-board',
    contextKey: 'planner-board',

    cards,
    columns,
    statusToColumnId,
    columnIdToStatus: columnIdToStatusName,
    fromHubRow: plannerTaskToCanonicalIssue,

    filterCategories: buildPlannerFilterCategories(tasks, avatarsByName),
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: PLANNER_GROUP_OPTIONS,
    groupBy,
    onGroupByChange,
    groupByNoneKey: 'none',

    allAssignees,
    selAssignees,
    onSelAssigneesChange,
    avatarsByName,

    search,
    onSearchChange,

    persistence,
    interactions,

    resolveIcon: resolvePlannerIcon,
    createLabel: 'New task',
    onCreate,
  };
}
