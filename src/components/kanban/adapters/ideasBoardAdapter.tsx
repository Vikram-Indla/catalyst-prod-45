/**
 * Ideas BoardAdapter<IdeaRow> — Phase 4.
 *
 * Converts the legacy Ideas Board surface (static 5-column grid, custom
 * BoardCard, no drag-drop) into the canonical BoardAdapter<IdeaRow> that
 * KanbanBoardShell consumes. This is the second hub to move onto the
 * canonical Kanban primitive after ProductHub (Phase 3).
 *
 * Design notes — how Ideas maps to the canonical card:
 *
 *   Card surface
 *     - issueKey   ← idea.idea_key                    (e.g. "IDH-001")
 *     - summary    ← idea.title
 *     - issueType  ← idea.idea_type                   (drives resolveIcon)
 *     - priority   ← idea.priority                    (P1–P4)
 *     - status     ← idea.status                      (canonical status enum)
 *     - assignee   ← idea.assigned_to_name
 *     - primary    ← idea.idea_type                   (muted Atlaskit lozenge)
 *     - secondary  ← idea.roadmap_quarter             (active/inprogress lozenge)
 *     - metaText   ← `IMPACT: ${impact_total}`        (right-aligned footer)
 *     - raw        ← full IdeaRow (for adapter callbacks)
 *
 *   Columns — 5-stage lifecycle preserved from the legacy page.
 *     Submitted → Under Review → Approved → Converted to Request → Rejected.
 *     Drafts are filtered out up-front so the board never surfaces them
 *     (parity with the old IdeasBoardPage which filtered on `is_deleted`
 *     only and relied on draft ideas being invisible).
 *
 *   Persistence — drag between columns now persists via `onStatusChange`.
 *     The legacy page was static (click-only); the canonical shell promotes
 *     the board to drag-and-drop capable. Dropping into "Converted to
 *     Request" is treated as a plain status change; the full convert
 *     flow (with IdeaDrawer → CreateRequestDrawer) is still owned by
 *     the page and triggered via `onCardClick`.
 *
 *   Filter categories — idea_type / priority / theme / roadmap_quarter /
 *     assignee (assigned_to_name). Counts derived from the unfiltered set.
 *
 *   Group-by — none / status / theme / priority / quarter / assignee.
 *
 *   Icons — idea_type drives a lucide icon via resolveIdeaIcon. Colour
 *     stays in the muted Atlaskit palette because ideas don't have a
 *     type-colour system (unlike initiatives).
 */
import type { ReactNode } from 'react';
import {
  Lightbulb, Zap, Wrench, CheckCircle2, AlertCircle, Bug, Sparkles, CircleDashed,
} from 'lucide-react';
import type { IdeaRow } from '@/hooks/useIdeasHub';
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
   Column lifecycle — identical to the 5 visible columns on the legacy
   /product/ideas/board page. Draft is intentionally excluded from the
   board surface (same behaviour as IdeasBoardPage before migration).
   ═══════════════════════════════════════════════════════════════════════ */

export const IDEAS_BOARD_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-submitted', name: 'SUBMITTED',     category: 'todo',        statuses: ['Submitted'] },
  { id: 'col-review',    name: 'UNDER REVIEW',  category: 'in_progress', statuses: ['Under Review'] },
  { id: 'col-approved',  name: 'APPROVED',      category: 'in_progress', statuses: ['Approved'] },
  { id: 'col-converted', name: 'CONVERTED',     category: 'done',        statuses: ['Converted to Request'] },
  { id: 'col-rejected',  name: 'REJECTED',      category: 'done',        statuses: ['Rejected'] },
];

const STATUS_TO_COL = new Map<string, string>();
IDEAS_BOARD_COLUMNS.forEach(col => col.statuses.forEach(s => STATUS_TO_COL.set(s, col.id)));

export function ideasStatusToColumnId(status: string): string | null {
  return STATUS_TO_COL.get(status) ?? null;
}

export function ideasColumnIdToStatus(columnId: string): string | null {
  const col = IDEAS_BOARD_COLUMNS.find(c => c.id === columnId);
  return col?.statuses[0] ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Status-category bucket used by PragmaticBoard (matches KanbanColumnDef).
   ═══════════════════════════════════════════════════════════════════════ */

function statusCategory(status: string): 'todo' | 'in_progress' | 'done' {
  if (status === 'Converted to Request' || status === 'Rejected') return 'done';
  if (status === 'Submitted') return 'todo';
  return 'in_progress';
}

/* ═══════════════════════════════════════════════════════════════════════
   IdeaRow → CanonicalBoardIssue.
   ═══════════════════════════════════════════════════════════════════════ */

export function ideaToCanonicalIssue(idea: IdeaRow): CanonicalBoardIssue {
  const primary: BoardLozenge | null = idea.idea_type
    ? { label: idea.idea_type, appearance: 'default' }
    : null;
  const secondary: BoardLozenge | null = idea.roadmap_quarter
    ? { label: idea.roadmap_quarter, appearance: 'inprogress' }
    : null;
  const impactText = Number.isFinite(idea.impact_total)
    ? `IMPACT: ${idea.impact_total.toFixed(2)}`
    : null;
  const issue: CanonicalBoardIssue = {
    id: idea.id,
    issueKey: idea.idea_key,
    summary: idea.title,
    issueType: idea.idea_type ?? 'Idea',
    priority: idea.priority || 'P3',
    status: idea.status,
    statusCategory: statusCategory(idea.status),
    assigneeName: idea.assigned_to_name,
    labels: idea.theme ? [idea.theme] : [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: idea.roadmap_quarter,
    isFlagged: idea.is_committed,
    updatedAt: idea.updated_at,
    createdAt: idea.created_at,
    primaryLozenge: primary,
    secondaryLozenge: secondary,
    metaText: impactText,
    raw: idea,
  };
  return issue;
}

/* ═══════════════════════════════════════════════════════════════════════
   Icon resolver — idea_type → lucide icon.
   ═══════════════════════════════════════════════════════════════════════ */

const IDEA_TYPE_ICON_COLOR = 'var(--ds-text-subtlest, #64748B)'; // neutral slate; Ideas doesn't carry a type-colour system.

export function resolveIdeaIcon(card: BoardIssue): ReactNode | null {
  const raw = (card as CanonicalBoardIssue).raw as IdeaRow | undefined;
  const t = (raw?.idea_type ?? '').toLowerCase();
  const Icon = (() => {
    if (t.includes('feature')) return Sparkles;
    if (t.includes('enhancement')) return Zap;
    if (t.includes('improvement')) return Wrench;
    if (t.includes('bug')) return Bug;
    if (t.includes('opportunity')) return Lightbulb;
    if (t.includes('solution')) return CheckCircle2;
    if (t.includes('problem')) return AlertCircle;
    return CircleDashed;
  })();
  return <Icon size={14} strokeWidth={2} style={{ color: IDEA_TYPE_ICON_COLOR }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter + group-by schemas — shared FilterCategory / GroupByOption so
   KanbanToolbar renders them directly (no hub-specific toolbar code).
   ═══════════════════════════════════════════════════════════════════════ */

function uniqueTypes(ideas: IdeaRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of ideas) {
    if (!i.idea_type) continue;
    counts.set(i.idea_type, (counts.get(i.idea_type) ?? 0) + 1);
  }
  return {
    id: 'idea_type',
    label: 'Type',
    searchPlaceholder: 'Search types...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniquePriorities(ideas: IdeaRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of ideas) {
    if (!i.priority) continue;
    counts.set(i.priority, (counts.get(i.priority) ?? 0) + 1);
  }
  // Keep canonical P1 → P4 order.
  const preferred = ['P1', 'P2', 'P3', 'P4'];
  const ordered = [
    ...preferred.filter(p => counts.has(p)),
    ...Array.from(counts.keys()).filter(p => !preferred.includes(p)).sort(),
  ];
  return {
    id: 'priority',
    label: 'Priority',
    options: ordered.map(id => ({ id, label: id, labelExtra: String(counts.get(id) ?? 0) })),
  };
}

function uniqueThemes(ideas: IdeaRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of ideas) {
    if (!i.theme) continue;
    counts.set(i.theme, (counts.get(i.theme) ?? 0) + 1);
  }
  return {
    id: 'theme',
    label: 'Theme',
    searchPlaceholder: 'Search themes...',
    options: Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueQuarters(ideas: IdeaRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of ideas) {
    if (!i.roadmap_quarter) continue;
    counts.set(i.roadmap_quarter, (counts.get(i.roadmap_quarter) ?? 0) + 1);
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

function uniqueAssignees(ideas: IdeaRow[], avatarsByName: Map<string, string>): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of ideas) {
    if (!i.assigned_to_name) continue;
    counts.set(i.assigned_to_name, (counts.get(i.assigned_to_name) ?? 0) + 1);
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

export function buildIdeasFilterCategories(
  ideas: IdeaRow[],
  avatarsByName: Map<string, string>,
): FilterCategory[] {
  return [
    uniqueTypes(ideas),
    uniquePriorities(ideas),
    uniqueThemes(ideas),
    uniqueQuarters(ideas),
    uniqueAssignees(ideas, avatarsByName),
  ];
}

/* ═══ Group-by options — 5 facets natural to Ideas. ═══ */
export const IDEAS_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',     label: 'None' },
  { key: 'theme',    label: 'Theme' },
  { key: 'priority', label: 'Priority' },
  { key: 'quarter',  label: 'Quarter' },
  { key: 'assignee', label: 'Assignee' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildIdeasBoardAdapterArgs {
  /** Full, unfiltered ideas set from useIdeasHub. Draft rows excluded up-front. */
  ideas: IdeaRow[];
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
  onStatusChange: (ideaId: string, newStatus: string) => void | Promise<void>;

  /* ── Interactions ── */
  onCardClick?: (ideaId: string) => void;

  /* ── Optional primary CTA (new idea). ── */
  onCreate?: () => void;
}

export function buildIdeasBoardAdapter(
  args: BuildIdeasBoardAdapterArgs,
): BoardAdapter<IdeaRow> {
  const {
    ideas, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onStatusChange,
    onCardClick,
    onCreate,
  } = args;

  // Exclude drafts from the board surface. Board only shows
  // submitted / review / approved / converted / rejected.
  const visibleIdeas = ideas.filter(i => i.status !== 'Draft' && !i.is_deleted);

  /* Filtered cards — search is handled server-side by useIdeasHub, but
     apply here too so optimistic filtering stays instant when the query
     cache is warm. */
  const filtered = visibleIdeas.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.idea_key.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selAssignees.size > 0) {
      if (!i.assigned_to_name || !selAssignees.has(i.assigned_to_name)) return false;
    }
    const types = filterSelected.idea_type ?? [];
    if (types.length > 0 && (!i.idea_type || !types.includes(i.idea_type))) return false;
    const prios = filterSelected.priority ?? [];
    if (prios.length > 0 && !prios.includes(i.priority)) return false;
    const themes = filterSelected.theme ?? [];
    if (themes.length > 0 && (!i.theme || !themes.includes(i.theme))) return false;
    const quarters = filterSelected.quarter ?? [];
    if (quarters.length > 0 && (!i.roadmap_quarter || !quarters.includes(i.roadmap_quarter))) return false;
    const assignees = filterSelected.assignee ?? [];
    if (assignees.length > 0 && (!i.assigned_to_name || !assignees.includes(i.assigned_to_name))) return false;
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map(ideaToCanonicalIssue);

  const allAssignees = Array.from(
    visibleIdeas.reduce((map, i) => {
      if (!i.assigned_to_name) return map;
      map.set(i.assigned_to_name, (map.get(i.assigned_to_name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.destColId !== event.sourceColId) {
        const newStatus = ideasColumnIdToStatus(event.destColId);
        if (newStatus) return onStatusChange(event.cardId, newStatus);
      }
    },
    onStatusChange: (cardId, status) => onStatusChange(cardId, status),
  };

  const interactions: BoardInteractions = {
    onCardClick,
  };

  return {
    name: 'ideas-board',
    contextKey: 'ideas-board',

    cards,
    columns: IDEAS_BOARD_COLUMNS,
    statusToColumnId: ideasStatusToColumnId,
    columnIdToStatus: ideasColumnIdToStatus,
    fromHubRow: ideaToCanonicalIssue,

    filterCategories: buildIdeasFilterCategories(visibleIdeas, avatarsByName),
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: IDEAS_GROUP_OPTIONS,
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

    resolveIcon: resolveIdeaIcon,
    createLabel: 'New idea',
    onCreate,
  };
}
