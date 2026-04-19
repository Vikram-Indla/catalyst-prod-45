/**
 * Portfolio BoardAdapter<EpicRow> — Phase 8.
 *
 * Migrates the legacy `/portfolio-kanban` (epics grouped by strategic
 * theme) off its bespoke `@hello-pangea/dnd` + custom flex-grid
 * implementation and onto the canonical KanbanBoardShell + Pragmatic
 * drag-drop stack.
 *
 * Portfolio board shape:
 *
 *   Columns    — fixed epic lifecycle:
 *                proposed → analyzing → approved → in_progress → done
 *                (cancelled is modelled but optional in the UI)
 *
 *   Swimlanes  — strategic themes. The canonical shell exposes these
 *                through the group-by popover instead of rendering them
 *                inline, but the grouping dimension is preserved.
 *
 *   Card       - issueKey   ← `EPIC-${numericId}` or epic.key if present
 *                - summary    ← epic.name
 *                - issueType  ← "Epic"
 *                - priority   ← "P3"  (epics have no native priority enum)
 *                - status     ← epic.status
 *                - primary    ← strategic_theme name (Atlaskit default lozenge)
 *                - metaText   ← epic.estimate (story-points string) when set
 *                - raw        ← full EpicRow
 */
import type { ReactNode } from 'react';
import { Zap } from 'lucide-react';
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
   Shape of an epic row as rendered by /portfolio-kanban.
   Matches the Supabase `epics` table joined with `strategic_themes(name)`.
   ═══════════════════════════════════════════════════════════════════════ */

export type EpicStatus =
  | 'proposed'
  | 'analyzing'
  | 'approved'
  | 'in_progress'
  | 'done'
  | 'cancelled';

export interface EpicRow {
  id: string;
  name: string;
  status: EpicStatus;
  theme_id: string | null;
  estimate?: string | number | null;
  health?: string | null;
  numeric_id?: number | null;
  strategic_themes?: { name: string } | null;
}

export interface ThemeRow {
  id: string;
  name: string;
}

/* ═══════════════════════════════════════════════════════════════════════
   Column definition — fixed epic lifecycle.
   ═══════════════════════════════════════════════════════════════════════ */

export const PORTFOLIO_COLUMNS: KanbanColumnDef[] = [
  { id: 'proposed',    name: 'PROPOSED',    category: 'todo',        statuses: ['proposed'] },
  { id: 'analyzing',   name: 'ANALYZING',   category: 'in_progress', statuses: ['analyzing'] },
  { id: 'approved',    name: 'APPROVED',    category: 'in_progress', statuses: ['approved'] },
  { id: 'in_progress', name: 'IN PROGRESS', category: 'in_progress', statuses: ['in_progress'] },
  { id: 'done',        name: 'DONE',        category: 'done',        statuses: ['done'] },
];

/* ═══════════════════════════════════════════════════════════════════════
   EpicRow → CanonicalBoardIssue.
   ═══════════════════════════════════════════════════════════════════════ */

export function epicToCanonicalIssue(
  epic: EpicRow,
  themesById: Map<string, string>,
): CanonicalBoardIssue {
  const themeName = epic.theme_id ? themesById.get(epic.theme_id) ?? null : null;
  const primary: BoardLozenge | null = themeName
    ? { label: themeName, appearance: 'default' }
    : null;
  const estimate =
    typeof epic.estimate === 'number'
      ? String(epic.estimate)
      : typeof epic.estimate === 'string' && epic.estimate.trim().length > 0
      ? epic.estimate
      : null;

  const issueKey = epic.numeric_id != null ? `EPIC-${epic.numeric_id}` : `EPIC-${epic.id.slice(0, 6)}`;
  const statusCategory: 'todo' | 'in_progress' | 'done' =
    epic.status === 'proposed'
      ? 'todo'
      : epic.status === 'done' || epic.status === 'cancelled'
      ? 'done'
      : 'in_progress';

  return {
    id: epic.id,
    issueKey,
    summary: epic.name,
    issueType: 'Epic',
    priority: 'P3',
    status: epic.status,
    statusCategory,
    assigneeName: null,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: false,
    updatedAt: null,
    createdAt: null,
    primaryLozenge: primary,
    secondaryLozenge: null,
    metaText: estimate,
    raw: epic,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Icon resolver — canonical Epic purple.
   ═══════════════════════════════════════════════════════════════════════ */

const EPIC_ICON_COLOR = '#904EE2';

export function resolvePortfolioIcon(_card: BoardIssue): ReactNode | null {
  return <Zap size={14} strokeWidth={2} style={{ color: EPIC_ICON_COLOR }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter / group-by schemas.
   ═══════════════════════════════════════════════════════════════════════ */

function uniqueThemes(epics: EpicRow[], themesById: Map<string, string>): FilterCategory {
  const counts = new Map<string, number>();
  for (const e of epics) {
    const name = e.theme_id ? themesById.get(e.theme_id) ?? null : null;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
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

function uniqueHealth(epics: EpicRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const e of epics) {
    const h = e.health;
    if (!h) continue;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return {
    id: 'health',
    label: 'Health',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

export const PORTFOLIO_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',   label: 'None' },
  { key: 'theme',  label: 'Theme' },
  { key: 'health', label: 'Health' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildPortfolioBoardAdapterArgs {
  epics: EpicRow[];
  themes: ThemeRow[];
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

  onStatusChange: (epicId: string, status: EpicStatus) => void | Promise<void>;

  onCardClick?: (epicId: string) => void;
  onCreate?: () => void;
}

export function buildPortfolioBoardAdapter(
  args: BuildPortfolioBoardAdapterArgs,
): BoardAdapter<EpicRow> {
  const {
    epics, themes, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onStatusChange,
    onCardClick, onCreate,
  } = args;

  const themesById = new Map<string, string>();
  for (const t of themes) themesById.set(t.id, t.name);

  /* Client-side filter. */
  const filtered = epics.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.name.toLowerCase().includes(q)) return false;
    }
    const sel = filterSelected.theme ?? [];
    if (sel.length > 0) {
      const name = e.theme_id ? themesById.get(e.theme_id) ?? null : null;
      if (!name || !sel.includes(name)) return false;
    }
    const selH = filterSelected.health ?? [];
    if (selH.length > 0 && (!e.health || !selH.includes(e.health))) return false;
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map((e) => epicToCanonicalIssue(e, themesById));

  const statusToColumnId = (status: string): string | null => {
    const col = PORTFOLIO_COLUMNS.find((c) => c.statuses.includes(status));
    return col?.id ?? null;
  };
  const columnIdToStatus = (columnId: string): string | null => {
    const col = PORTFOLIO_COLUMNS.find((c) => c.id === columnId);
    return col?.statuses[0] ?? null;
  };

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.sourceColId === event.destColId) return; // within-column reorder n/a
      const status = columnIdToStatus(event.destColId) as EpicStatus | null;
      if (status) return onStatusChange(event.cardId, status);
    },
    onStatusChange: (cardId, newStatus) => {
      return onStatusChange(cardId, newStatus as EpicStatus);
    },
  };

  const interactions: BoardInteractions = { onCardClick };

  return {
    name: 'portfolio-board',
    contextKey: 'portfolio-board',

    cards,
    columns: PORTFOLIO_COLUMNS,
    statusToColumnId,
    columnIdToStatus,
    fromHubRow: (row: EpicRow) => epicToCanonicalIssue(row, themesById),

    filterCategories: [
      uniqueThemes(epics, themesById),
      uniqueHealth(epics),
    ],
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: PORTFOLIO_GROUP_OPTIONS,
    groupBy,
    onGroupByChange,
    groupByNoneKey: 'none',

    allAssignees: [],
    selAssignees,
    onSelAssigneesChange,
    avatarsByName,

    search,
    onSearchChange,

    persistence,
    interactions,

    resolveIcon: resolvePortfolioIcon,
    createLabel: 'New epic',
    onCreate,
  };
}
