/**
 * ProductHub BoardAdapter<Initiative>.
 *
 * Produces the canonical BoardAdapter<Initiative> contract that
 * KanbanBoardShell consumes.
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
import {
  FolderKanban, Zap, Wrench, Lightbulb, Link as LinkIcon, CircleDashed,
} from 'lucide-react';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import {
  INITIATIVE_TYPE_COLORS,
  type InitiativeTypeKey,
} from '@/types/initiative-enhancements';
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

/* ═══ Column lifecycle — identical to the legacy adapter. ═══ */
export const PRODUCTHUB_BOARD_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-new',          name: 'NEW',                  category: 'todo',        statuses: ['new'] },
  { id: 'col-portfolio',    name: 'PORTFOLIO REVIEW',     category: 'in_progress', statuses: ['portfolio_review'] },
  { id: 'col-technical',    name: 'TECHNICAL VALIDATION', category: 'in_progress', statuses: ['technical_validation', 'analysis'] },
  { id: 'col-estimate',     name: 'ESTIMATE',             category: 'in_progress', statuses: ['estimate'] },
  { id: 'col-approved',     name: 'DEMAND APPROVED',      category: 'in_progress', statuses: ['demand_approved', 'ready_for_development'] },
  { id: 'col-implementing', name: 'IN IMPLEMENTATION',    category: 'in_progress', statuses: ['under_implementation', 'implementation_review', 'in_support'] },
  { id: 'col-done',         name: 'DONE',                 category: 'done',        statuses: ['done', 'cancelled', 'on_hold'] },
];

const STATUS_TO_COL = new Map<string, string>();
PRODUCTHUB_BOARD_COLUMNS.forEach(col => col.statuses.forEach(s => STATUS_TO_COL.set(s, col.id)));

export function productHubStatusToColumnId(status: string): string | null {
  return STATUS_TO_COL.get(status) ?? null;
}

export function productHubColumnIdToStatus(columnId: string): InitiativeStatus | null {
  const col = PRODUCTHUB_BOARD_COLUMNS.find(c => c.id === columnId);
  return (col?.statuses[0] as InitiativeStatus) ?? null;
}

/* ═══ Priority — initiative score band → Jira-flavored bucket. ═══ */
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

/* ═══ Status-category bucket used by PragmaticBoard. ═══ */
function statusCategory(status: InitiativeStatus): 'todo' | 'in_progress' | 'done' {
  if (status === 'done' || status === 'cancelled') return 'done';
  if (status === 'new') return 'todo';
  return 'in_progress';
}

/* ═══ Initiative → CanonicalBoardIssue adapter. ═══ */
export function initiativeToCanonicalIssue(initiative: Initiative): CanonicalBoardIssue {
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
    issueType: initiative.initiative_type_key ?? 'initiative',
    priority: mapPriority(initiative),
    status: initiative.status,
    statusCategory: statusCategory(initiative.status),
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
}

/* ═══ Initiative type icon — the reason this adapter exists. ═══ */
export function resolveInitiativeIcon(card: BoardIssue): ReactNode | null {
  const raw = (card as CanonicalBoardIssue).raw as Initiative | undefined;
  const typeKey = raw?.initiative_type_key ?? null;
  const color = (typeKey && INITIATIVE_TYPE_COLORS[typeKey as InitiativeTypeKey]?.hex) ?? INITIATIVE_TYPE_COLORS.project.hex;
  const Icon = (() => {
    switch (typeKey) {
      case 'project': return FolderKanban;
      case 'enhancement': return Zap;
      case 'improvement': return Wrench;
      case 'business_request': return Lightbulb;
      case 'entity_integration': return LinkIcon;
      default: return CircleDashed;
    }
  })();
  return <Icon size={14} strokeWidth={2} style={{ color }} />;
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

/* ═══ Group-by options (match the ProductHub lineup from the legacy adapter). ═══ */
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
    initiatives, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onStatusChange, onToggleFavorite,
    onCardClick,
  } = args;

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
        const newStatus = productHubColumnIdToStatus(event.destColId);
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
    columns: PRODUCTHUB_BOARD_COLUMNS,
    statusToColumnId: productHubStatusToColumnId,
    columnIdToStatus: productHubColumnIdToStatus,
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
    createLabel: 'New initiative',
  };
}
