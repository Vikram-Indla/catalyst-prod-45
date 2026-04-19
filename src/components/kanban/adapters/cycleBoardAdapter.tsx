/**
 * Cycle (Test Execution) BoardAdapter<CycleExecutionItem> — Phase 8.
 *
 * Migrates the Test Cycle Kanban (`CycleKanbanView` inside the
 * CycleCommandCenter) off its bespoke @dnd-kit implementation and onto
 * the canonical KanbanBoardShell + Pragmatic drag-drop stack.
 *
 *   Columns — fixed test-execution lifecycle:
 *     NOT STARTED · IN PROGRESS · PASSED · FAILED · BLOCKED
 *
 *   Card:
 *     - issueKey   ← item.caseKey            (e.g. "TC-0847")
 *     - summary    ← item.title
 *     - issueType  ← "Test"
 *     - priority   ← item.priority (uppercased — the cycle hub already
 *                    uses P1–P5 conventions via ExecutionPriority)
 *     - status     ← item.status (UIStatus)
 *     - assignee   ← item.assignee?.full_name
 *     - primary    ← item.module (if any)         — Atlaskit default lozenge
 *     - secondary  ← item.linkedDefectKey (if any) — Atlaskit removed (red)
 *     - raw        ← full CycleExecutionItem
 */
import type { ReactNode } from 'react';
import { Beaker } from 'lucide-react';
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
import type {
  CycleExecutionItem,
  UIStatus,
} from '@/hooks/test-cycles/useCycleExecutionItems';

/* ═══════════════════════════════════════════════════════════════════════
   Column definition — fixed test-execution lifecycle.
   ═══════════════════════════════════════════════════════════════════════ */

export const CYCLE_COLUMNS: KanbanColumnDef[] = [
  { id: 'not_started', name: 'NOT STARTED', category: 'todo',        statuses: ['not_started'] },
  { id: 'in_progress', name: 'IN PROGRESS', category: 'in_progress', statuses: ['in_progress'] },
  { id: 'passed',      name: 'PASSED',      category: 'done',        statuses: ['passed'] },
  { id: 'failed',      name: 'FAILED',      category: 'done',        statuses: ['failed'] },
  { id: 'blocked',     name: 'BLOCKED',     category: 'in_progress', statuses: ['blocked'] },
];

const TERMINAL_STATUSES: UIStatus[] = ['passed', 'failed', 'blocked', 'skipped'];

/* ═══════════════════════════════════════════════════════════════════════
   CycleExecutionItem → CanonicalBoardIssue.
   ═══════════════════════════════════════════════════════════════════════ */

export function cycleItemToCanonicalIssue(item: CycleExecutionItem): CanonicalBoardIssue {
  const primary: BoardLozenge | null = item.module
    ? { label: item.module, appearance: 'default' }
    : null;
  const secondary: BoardLozenge | null = item.linkedDefectKey
    ? { label: item.linkedDefectKey, appearance: 'removed' }
    : null;

  const statusCategory: 'todo' | 'in_progress' | 'done' =
    item.status === 'not_started'
      ? 'todo'
      : item.status === 'passed' || item.status === 'failed' || item.status === 'skipped'
      ? 'done'
      : 'in_progress';

  return {
    id: item.id,
    issueKey: item.caseKey,
    summary: item.title,
    issueType: 'Test',
    priority: String(item.priority ?? 'P3').toUpperCase(),
    status: item.status,
    statusCategory,
    assigneeName: item.assignee?.full_name ?? null,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: item.status === 'blocked',
    updatedAt: item.executedAt,
    createdAt: item.addedAt,
    primaryLozenge: primary,
    secondaryLozenge: secondary,
    metaText: null,
    raw: item,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Icon resolver — test tube (Beaker).
   ═══════════════════════════════════════════════════════════════════════ */

const CYCLE_ICON_COLOR = '#4BADE8';

export function resolveCycleIcon(_card: BoardIssue): ReactNode | null {
  return <Beaker size={14} strokeWidth={2} style={{ color: CYCLE_ICON_COLOR }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter / group-by schemas.
   ═══════════════════════════════════════════════════════════════════════ */

function uniquePriorities(items: CycleExecutionItem[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of items) {
    const p = String(i.priority ?? 'P3').toUpperCase();
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return {
    id: 'priority',
    label: 'Priority',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueModules(items: CycleExecutionItem[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of items) {
    if (!i.module) continue;
    counts.set(i.module, (counts.get(i.module) ?? 0) + 1);
  }
  return {
    id: 'module',
    label: 'Module',
    searchPlaceholder: 'Search modules...',
    options: Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueAssignees(
  items: CycleExecutionItem[],
  avatarsByName: Map<string, string>,
): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of items) {
    const name = i.assignee?.full_name;
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

export const CYCLE_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',     label: 'None' },
  { key: 'priority', label: 'Priority' },
  { key: 'module',   label: 'Module' },
  { key: 'assignee', label: 'Assignee' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildCycleBoardAdapterArgs {
  items: CycleExecutionItem[];
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

  onStatusChange: (scopeId: string, newStatus: UIStatus) => void | Promise<void>;

  onCardClick?: (scopeId: string) => void;
  onCreate?: () => void;
}

export function buildCycleBoardAdapter(
  args: BuildCycleBoardAdapterArgs,
): BoardAdapter<CycleExecutionItem> {
  const {
    items, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onStatusChange,
    onCardClick, onCreate,
  } = args;

  /* Client-side filter. */
  const filtered = items.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.caseKey.toLowerCase().includes(q)) return false;
    }
    if (selAssignees.size > 0) {
      const name = i.assignee?.full_name;
      if (!name || !selAssignees.has(name)) return false;
    }
    const ps = filterSelected.priority ?? [];
    if (ps.length > 0 && !ps.includes(String(i.priority ?? 'P3').toUpperCase())) return false;
    const ms = filterSelected.module ?? [];
    if (ms.length > 0 && (!i.module || !ms.includes(i.module))) return false;
    const as = filterSelected.assignee ?? [];
    if (as.length > 0) {
      const name = i.assignee?.full_name;
      if (!name || !as.includes(name)) return false;
    }
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map(cycleItemToCanonicalIssue);

  const statusToColumnId = (status: string): string | null => {
    if (status === 'skipped') return 'passed'; // fold skipped into passed column
    const col = CYCLE_COLUMNS.find((c) => c.statuses.includes(status));
    return col?.id ?? null;
  };
  const columnIdToStatus = (columnId: string): string | null => {
    const col = CYCLE_COLUMNS.find((c) => c.id === columnId);
    return col?.statuses[0] ?? null;
  };

  const allAssignees = Array.from(
    items.reduce((map, i) => {
      const name = i.assignee?.full_name;
      if (!name) return map;
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.sourceColId === event.destColId) return;
      const status = columnIdToStatus(event.destColId) as UIStatus | null;
      if (status) return onStatusChange(event.cardId, status);
    },
    onStatusChange: (cardId, newStatus) => {
      return onStatusChange(cardId, newStatus as UIStatus);
    },
  };

  const interactions: BoardInteractions = { onCardClick };

  return {
    name: 'cycle-execution-board',
    contextKey: 'cycle-execution-board',

    cards,
    columns: CYCLE_COLUMNS,
    statusToColumnId,
    columnIdToStatus,
    fromHubRow: cycleItemToCanonicalIssue,

    filterCategories: [
      uniquePriorities(items),
      uniqueModules(items),
      uniqueAssignees(items, avatarsByName),
    ],
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: CYCLE_GROUP_OPTIONS,
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

    resolveIcon: resolveCycleIcon,
    createLabel: 'Add test',
    onCreate,
  };
}

export { TERMINAL_STATUSES };
