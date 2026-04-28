/**
 * ProductHub BoardAdapter<Initiative>.
 *
 * Produces the canonical BoardAdapter<Initiative> contract that
 * KanbanBoardShell consumes.
 *
 * ───────────────────────────────────────────────────────────────────
 * Phase 3 (2026-04-26): WORKFLOW-DRIVEN COLUMNS.
 *
 * The previous static `PRODUCTHUB_BOARD_COLUMNS` array has been retired.
 * Columns are now derived from `WorkflowStatus[]` provided by the page
 * (which calls `useCatalystWorkflow('Business Request')`). One column
 * per status, in workflow `position` order. Column header label =
 * `WorkflowStatus.name`. Column category = `WorkflowStatus.category`.
 *
 * Effect: renaming a status in /admin/workflows updates the kanban
 * column header on next refetch. Adding/removing a status in the admin
 * editor adds/removes a column. No code change required for either.
 * ───────────────────────────────────────────────────────────────────
 *
 * Contract highlights:
 *   - Cards are CanonicalBoardIssue (extends BoardIssue).
 *   - Filter categories use ProjectHub's shared FilterCategory shape so
 *     the canonical toolbar renders them directly.
 *   - Group-by options use ProjectHub's shared GroupByOption<K> shape.
 *   - An initiative-typed icon resolver ships through so cards render with
 *     the correct hub icon instead of falling back to the Jira "Task" icon.
 *
 * Persistence wiring is forwarded by the hosting page — the adapter builder
 * is a pure function. Side effects live in the page mutations.
 */
import type { ReactNode } from 'react';
import { CircleDashed } from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { BusinessRequestIcon } from '@/components/producthub/shared/BusinessRequestBadge';
import type { WorkflowStatus } from '@/hooks/useCatalystWorkflow';
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
   Workflow → columns.

   One column per workflow status, sorted by `position`. The column id
   format `col-${slug}` is preserved for compatibility with any persisted
   UI state (URL query params, localStorage column-collapse prefs).
   ═══════════════════════════════════════════════════════════════════════ */

export function buildColumnsFromWorkflowStatuses(
  statuses: WorkflowStatus[],
): KanbanColumnDef[] {
  return statuses
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((status) => ({
      id: `col-${status.slug}`,
      name: status.name.toUpperCase(),
      category: status.category,
      statuses: [status.slug],
      wipLimit: status.wip_limit ?? null,
    }));
}

function buildStatusToColumnId(
  columns: KanbanColumnDef[],
): (status: string) => string | null {
  const map = new Map<string, string>();
  columns.forEach((col) => col.statuses.forEach((s) => map.set(s, col.id)));
  return (status) => map.get(status) ?? null;
}

function buildColumnIdToStatus(
  columns: KanbanColumnDef[],
): (columnId: string) => InitiativeStatus | null {
  return (columnId) => {
    const col = columns.find((c) => c.id === columnId);
    return (col?.statuses[0] as InitiativeStatus) ?? null;
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Priority — initiative score band → Jira-flavored bucket.
   ═══════════════════════════════════════════════════════════════════════ */
function mapPriority(initiative: Initiative): string {
  const explicit = (initiative as { priority?: string | null }).priority;
  if (explicit) return explicit;
  const score = initiative.computed_score;
  if (score === null || score === undefined) return '';
  if (score >= 4.0) return 'High';
  if (score >= 3.0) return 'Medium';
  if (score >= 2.0) return 'Low';
  return 'Lowest';
}

/* ═══════════════════════════════════════════════════════════════════════
   Status-category bucket — workflow-driven, with a heuristic fallback
   for the brief render window before workflow data resolves.
   ═══════════════════════════════════════════════════════════════════════ */
function buildStatusCategoryResolver(
  statuses: WorkflowStatus[],
): (status: InitiativeStatus) => 'todo' | 'in_progress' | 'done' {
  const map = new Map<string, 'todo' | 'in_progress' | 'done'>();
  statuses.forEach((s) => map.set(s.slug, s.category));
  return (status) => {
    const found = map.get(status);
    if (found) return found;
    // Fallback heuristic — only reached if statuses haven't loaded yet.
    if (status === 'done' || status === 'cancelled') return 'done';
    if (status === 'new') return 'todo';
    return 'in_progress';
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Initiative → CanonicalBoardIssue adapter.
   ═══════════════════════════════════════════════════════════════════════ */
function makeInitiativeToCanonicalIssue(
  resolveCategory: (status: InitiativeStatus) => 'todo' | 'in_progress' | 'done',
): (initiative: Initiative) => CanonicalBoardIssue {
  return (initiative) => {
    const primary: BoardLozenge | null = initiative.department_name
      ? { label: initiative.department_name, appearance: 'default' }
      : null;
    const secondary: BoardLozenge | null = initiative.target_quarter
      ? { label: initiative.target_quarter, appearance: 'inprogress' }
      : null;
    const sourceTag: 'catalyst' | 'jira' = initiative.source === 'jira' ? 'jira' : 'catalyst';
    const issue: CanonicalBoardIssue = {
      id: initiative.id,
      issueKey: initiative.initiative_key,
      summary: initiative.title,
      issueType: 'Feature',
      priority: mapPriority(initiative),
      status: initiative.status,
      statusCategory: resolveCategory(initiative.status),
      assigneeName: initiative.assignee_name,
      labels: [],
      sprintName: null,
      storyPoints: null,
      parentKey: null,
      parentSummary: null,
      fixVersion: null,
      isFlagged: initiative.is_favorited,
      updatedAt: initiative.updated_at,
      createdAt: initiative.created_at,
      sourceTag,
      primaryLozenge: primary,
      secondaryLozenge: secondary,
      metaText: null,
      raw: initiative,
    };
    return issue;
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Initiative type icon — single Business Request icon (Atlaskit lightbulb).
   ═══════════════════════════════════════════════════════════════════════ */
export function resolveInitiativeIcon(_card: BoardIssue): ReactNode | null {
  return <BusinessRequestIcon size={14} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter + group-by schemas — shared FilterCategory / GroupByOption so
   KanbanToolbar (the canonical toolbar) renders them directly.
   ═══════════════════════════════════════════════════════════════════════ */

function uniqueDepartments(initiatives: Initiative[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of initiatives) {
    if (!i.department_name) continue;
    counts.set(i.department_name, (counts.get(i.department_name) ?? 0) + 1);
  }
  return {
    id: 'department',
    label: 'Department',
    searchPlaceholder: 'Search departments...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueQuarters(initiatives: Initiative[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of initiatives) {
    if (!i.target_quarter) continue;
    counts.set(i.target_quarter, (counts.get(i.target_quarter) ?? 0) + 1);
  }
  return {
    id: 'quarter',
    label: 'Quarter',
    searchPlaceholder: 'Search quarters...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([q, count]) => ({ id: q, label: q, labelExtra: String(count) })),
  };
}

function uniquePriorities(): FilterCategory {
  return {
    id: 'priority',
    label: 'Priority',
    options: [
      { id: 'High',   label: 'High' },
      { id: 'Medium', label: 'Medium' },
      { id: 'Low',    label: 'Low' },
      { id: 'Lowest', label: 'Rejected' },
    ],
  };
}

function uniqueAssignees(initiatives: Initiative[], avatarsByName: Map<string, string>): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of initiatives) {
    if (!i.assignee_name) continue;
    counts.set(i.assignee_name, (counts.get(i.assignee_name) ?? 0) + 1);
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

export function buildFilterCategories(
  initiatives: Initiative[],
  avatarsByName: Map<string, string>,
): FilterCategory[] {
  return [
    uniqueDepartments(initiatives),
    uniqueQuarters(initiatives),
    uniquePriorities(),
    uniqueAssignees(initiatives, avatarsByName),
  ];
}

/* ═══════════════════════════════════════════════════════════════════════
   Group-by options (match the ProductHub lineup from the legacy adapter).
   ═══════════════════════════════════════════════════════════════════════ */
export const PRODUCTHUB_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',       label: 'None' },
  { key: 'department', label: 'Department' },
  { key: 'quarter',    label: 'Quarter' },
  { key: 'assignee',   label: 'Assignee' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildProductHubAdapterArgs {
  /** Full, unfiltered initiative set from the hub's data hook. */
  initiatives: Initiative[];
  /** `displayName`.toLowerCase() → avatar URL. */
  avatarsByName: Map<string, string>;

  /**
   * Workflow statuses from useCatalystWorkflow('Business Request').
   * Drives column structure, header labels, categories, and order.
   * Pass an empty array while loading — the adapter renders zero columns
   * in that window; the page should gate adapter construction on
   * `!workflowLoading` to avoid the empty-board flash.
   */
  workflowStatuses: WorkflowStatus[];

  /* ── Filter state (page-owned so it drives TanStack Query keys) ── */
  search: string;
  onSearchChange: (v: string) => void;
  selAssignees: Set<string>;
  onSelAssigneesChange: (next: Set<string>) => void;
  filterSelected: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
  onClearFilters: () => void;
  groupBy: string;
  onGroupByChange: (key: string) => void;

  /* ── Persistence callbacks ── */
  onStatusChange: (initiativeId: string, newStatus: InitiativeStatus) => void | Promise<void>;
  onToggleFavorite?: (initiativeId: string) => void | Promise<void>;

  /* ── Interactions ── */
  onCardClick?: (initiativeId: string) => void;
}

export function buildProductHubBoardAdapter(
  args: BuildProductHubAdapterArgs,
): BoardAdapter<Initiative> {
  const {
    initiatives, avatarsByName, workflowStatuses,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onStatusChange, onToggleFavorite,
    onCardClick,
  } = args;

  /* ── Workflow-derived structures. ── */
  const columns = buildColumnsFromWorkflowStatuses(workflowStatuses);
  const statusToColumnId = buildStatusToColumnId(columns);
  const columnIdToStatus = buildColumnIdToStatus(columns);
  const resolveCategory = buildStatusCategoryResolver(workflowStatuses);
  const initiativeToCanonicalIssue = makeInitiativeToCanonicalIssue(resolveCategory);

  /* Filtered cards — mirrors the legacy adapter's filter order. */
  const filtered = initiatives.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.initiative_key.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selAssignees.size > 0) {
      if (!i.assignee_name || !selAssignees.has(i.assignee_name)) return false;
    }
    const deps = filterSelected.department ?? [];
    if (deps.length > 0 && (!i.department_name || !deps.includes(i.department_name))) return false;
    const quarters = filterSelected.quarter ?? [];
    if (quarters.length > 0 && (!i.target_quarter || !quarters.includes(i.target_quarter))) return false;
    const prios = filterSelected.priority ?? [];
    if (prios.length > 0 && !prios.includes(mapPriority(i))) return false;
    const assignees = filterSelected.assignee ?? [];
    if (assignees.length > 0 && (!i.assignee_name || !assignees.includes(i.assignee_name))) return false;
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map(initiativeToCanonicalIssue);

  const allAssignees = Array.from(
    initiatives.reduce((map, i) => {
      if (!i.assignee_name) return map;
      map.set(i.assignee_name, (map.get(i.assignee_name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.destColId !== event.sourceColId) {
        const newStatus = columnIdToStatus(event.destColId);
        if (newStatus) return onStatusChange(event.cardId, newStatus);
      }
    },
    onToggleFlag: onToggleFavorite,
    onStatusChange: (cardId, status) => onStatusChange(cardId, status as InitiativeStatus),
  };

  const interactions: BoardInteractions = {
    onCardClick,
  };

  return {
    name: 'producthub',
    contextKey: 'producthub',

    cards,
    columns,
    statusToColumnId,
    columnIdToStatus,
    fromHubRow: initiativeToCanonicalIssue,

    filterCategories: buildFilterCategories(initiatives, avatarsByName),
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: PRODUCTHUB_GROUP_OPTIONS,
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

    resolveIcon: resolveInitiativeIcon,
    createLabel: 'New business request',
  };
}
