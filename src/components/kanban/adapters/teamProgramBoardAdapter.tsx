/**
 * Team + Program Board Adapter — Phase 6.
 *
 * Migrates the Jira-Align style "boards" surface (routes below) onto the
 * canonical BoardAdapter contract consumed by KanbanBoardShell:
 *
 *   /team/:teamId/kanban-boards/:boardId
 *   /programs/:programId/kanban-boards/:boardId
 *   /kanban-boards/:boardId
 *
 * Architectural twist vs. Phases 3–5
 * ──────────────────────────────────
 * Every prior hub adapter (initiatives, ideas, incidents) declares a
 * *fixed* lifecycle: a hard-coded `KanbanColumnDef[]` constant with known
 * status enum strings per column. Team / Program boards don't work that
 * way — each board's columns are persisted in Supabase (`kanban_columns`)
 * with their own name, WIP limit, state_mappings, and sort_order. Two
 * boards for the same team can have completely different column models.
 *
 * Therefore this adapter is a *builder*: the page owns the column/card
 * fetches (via `useKanbanColumns(boardId)` + `useKanbanCards(boardId)`)
 * and passes them in. The adapter then derives `KanbanColumnDef[]`
 * dynamically from the DB rows, keyed by `kanban_columns.id`.
 *
 * Canonical mapping
 *   `CanonicalBoardIssue.status`          ← `card.column_id`
 *                                          (no string enum — the column
 *                                           id IS the status here)
 *   `statusToColumnId(status)`            = identity
 *   `columnIdToStatus(columnId)`          = identity
 *
 * This keeps the canonical shell agnostic — it still dispatches on
 * `card.status` to compute the column membership, but the "status" value
 * is just the destination column id instead of a human-readable string.
 *
 * Drag-drop persistence
 *   The page wires `onStatusChange(cardId, newColumnId)` through to
 *   `useMoveCard.mutate({ card_id, to_column_id })`. WIP override reasons
 *   are not handled here — for WIP violations the shell will optimistically
 *   drop and the mutation will either succeed (board allows overloading)
 *   or surface a toast on the page. WIP-limit UX is a Phase 9 polish item.
 *
 * Swim lanes
 *   KanbanBoardShell's declarative model doesn't yet support swim lanes.
 *   This adapter treats the board as a flat column grid. Swim lanes stay
 *   viewable on the legacy path until a follow-up phase promotes them
 *   into the canonical shell (tracked under Phase 9 / pixel parity).
 */
import type { ReactNode } from 'react';
import { Bookmark, Bug, CheckSquare, Link2, ShieldAlert, Zap, Layers, CircleDashed } from 'lucide-react';
import type { KanbanBoard, KanbanCard, KanbanColumn, CardType } from '@/types/kanban.types';
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
   Column ColumnType → canonical category.
   ═══════════════════════════════════════════════════════════════════════ */

function columnCategory(columnType: string): 'todo' | 'in_progress' | 'done' {
  switch (columnType) {
    case 'Not Started': return 'todo';
    case 'In Progress': return 'in_progress';
    case 'Completed':
    case 'Accepted':
      return 'done';
    default:
      return 'in_progress';
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   Derive KanbanColumnDef[] from DB rows.
   Each KanbanColumnDef's `id` is the kanban_columns.id (UUID) so the
   canonical shell can use it verbatim as both column id AND the card's
   `status` value. Column `statuses` array holds only the id (self) —
   ensures STATUS_TO_COL map is identity.
   ═══════════════════════════════════════════════════════════════════════ */

export function deriveColumnDefsFromRows(columns: KanbanColumn[]): KanbanColumnDef[] {
  return [...columns]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      name: c.name.toUpperCase(),
      category: columnCategory(c.column_type),
      // `statuses` stays as [column_id] so statusToColumnId is identity.
      statuses: [c.id],
    }));
}

/* ═══════════════════════════════════════════════════════════════════════
   Card → CanonicalBoardIssue.
   ═══════════════════════════════════════════════════════════════════════ */

interface CardContext {
  card: KanbanCard;
  columnName?: string;
}

function cardToCanonicalIssue({ card, columnName }: CardContext): CanonicalBoardIssue {
  const workItem = card.work_item;
  const summary = workItem?.title ?? card.work_item_id;
  const assignee = workItem?.owner_name ?? null;
  const storyPoints = workItem?.points ?? workItem?.estimate_points ?? null;
  const labels = Array.isArray(workItem?.tags) ? (workItem?.tags ?? []) : [];

  const primary: BoardLozenge | null = card.work_item_type
    ? { label: card.work_item_type, appearance: 'default' }
    : null;

  // Block state surfaces as a secondary lozenge so it's legible without
  // depending on any hub-specific renderer.
  const secondary: BoardLozenge | null = card.is_blocked
    ? { label: 'BLOCKED', appearance: 'removed' }
    : null;

  const health = workItem?.health;
  const metaText = health && health !== 'on-track'
    ? (health === 'off-track' ? 'OFF TRACK' : 'AT RISK')
    : null;

  return {
    id: card.id,
    issueKey: workItem?.external_id ?? card.work_item_id,
    summary,
    issueType: card.work_item_type,
    priority: 'P3',
    // status === column_id so shell's statusToColumnId is identity.
    status: card.column_id,
    statusCategory: columnName ? columnName.toLowerCase() : 'unknown',
    assigneeName: assignee,
    labels,
    sprintName: null,
    storyPoints,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: card.is_blocked,
    updatedAt: card.added_at,
    createdAt: card.added_at,
    primaryLozenge: primary,
    secondaryLozenge: secondary,
    metaText,
    raw: card,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Icon resolver — work_item_type → lucide glyph. Colours mirror the
   Catalyst work-item taxonomy in CLAUDE.md §11.
   ═══════════════════════════════════════════════════════════════════════ */

const CARD_TYPE_ICON: Record<CardType, { Icon: typeof Bookmark; color: string }> = {
  Epic:       { Icon: Zap,         color: '#904EE2' },
  Feature:    { Icon: Layers,      color: '#63BA3C' },
  Story:      { Icon: Bookmark,    color: '#63BA3C' },
  Task:       { Icon: CheckSquare, color: '#4BADE8' },
  Defect:     { Icon: Bug,         color: '#E5493A' },
  Dependency: { Icon: Link2,       color: '#4BADE8' },
  Risk:       { Icon: ShieldAlert, color: '#E5493A' },
};

export function resolveTeamProgramIcon(card: BoardIssue): ReactNode | null {
  const raw = (card as CanonicalBoardIssue).raw as KanbanCard | undefined;
  const type = raw?.work_item_type;
  const entry = (type && CARD_TYPE_ICON[type]) || { Icon: CircleDashed, color: 'var(--ds-text-subtlest, #64748B)' };
  const { Icon, color } = entry;
  return <Icon size={14} strokeWidth={2} style={{ color }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter category builders — filter categories derive from whatever's
   actually present in the current card set. Categories: Type, Assignee,
   Blocked status. (No priority field in kanban_cards; health is optional
   so we expose it as a filter only when present.)
   ═══════════════════════════════════════════════════════════════════════ */

function uniqueWorkItemTypes(cards: KanbanCard[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const c of cards) {
    counts.set(c.work_item_type, (counts.get(c.work_item_type) ?? 0) + 1);
  }
  return {
    id: 'work_item_type',
    label: 'Type',
    searchPlaceholder: 'Search types...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueBlockedStates(cards: KanbanCard[]): FilterCategory {
  const blockedCount = cards.filter(c => c.is_blocked).length;
  const openCount = cards.length - blockedCount;
  return {
    id: 'blocked',
    label: 'Flow state',
    options: [
      { id: 'blocked', label: 'Blocked', labelExtra: String(blockedCount) },
      { id: 'open', label: 'Open', labelExtra: String(openCount) },
    ],
  };
}

function uniqueAssignees(
  cards: KanbanCard[],
  avatarsByName: Map<string, string>,
): FilterCategory {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const name = c.work_item?.owner_name;
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

function uniqueHealth(cards: KanbanCard[]): FilterCategory | null {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const h = c.work_item?.health;
    if (!h) continue;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const prettyLabel: Record<string, string> = {
    'on-track': 'On track',
    'at-risk': 'At risk',
    'off-track': 'Off track',
  };
  return {
    id: 'health',
    label: 'Health',
    options: Array.from(counts.entries()).map(([id, count]) => ({
      id,
      label: prettyLabel[id] ?? id,
      labelExtra: String(count),
    })),
  };
}

export function buildTeamProgramFilterCategories(
  cards: KanbanCard[],
  avatarsByName: Map<string, string>,
): FilterCategory[] {
  const cats: FilterCategory[] = [
    uniqueWorkItemTypes(cards),
    uniqueBlockedStates(cards),
    uniqueAssignees(cards, avatarsByName),
  ];
  const health = uniqueHealth(cards);
  if (health) cats.push(health);
  return cats;
}

/* ═══ Group-by options — natural facets for team/program boards. ═══ */
export const TEAM_PROGRAM_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',           label: 'None' },
  { key: 'work_item_type', label: 'Type' },
  { key: 'assignee',       label: 'Assignee' },
  { key: 'blocked',        label: 'Flow state' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildTeamProgramBoardAdapterArgs {
  /** The board record (used for contextKey + title). */
  board: KanbanBoard;
  /** DB-defined columns (already sorted or not — adapter sorts by sort_order). */
  columns: KanbanColumn[];
  /** DB-defined cards. */
  cards: KanbanCard[];
  /** `displayName`.toLowerCase() → avatar URL. */
  avatarsByName: Map<string, string>;

  /* ── Filter state (page-owned so it drives the toolbar). ── */
  search: string;
  onSearchChange: (v: string) => void;
  selAssignees: Set<string>;
  onSelAssigneesChange: (next: Set<string>) => void;
  filterSelected: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
  onClearFilters: () => void;
  groupBy: string;
  onGroupByChange: (key: string) => void;

  /* ── Persistence (delegates to useMoveCard). ── */
  onMoveCard: (cardId: string, toColumnId: string) => void | Promise<void>;

  /* ── Interactions. ── */
  onCardClick?: (cardId: string) => void;

  /* ── Primary CTA on toolbar (add card). ── */
  onCreate?: () => void;
  createLabel?: string;
}

export function buildTeamProgramBoardAdapter(
  args: BuildTeamProgramBoardAdapterArgs,
): BoardAdapter<KanbanCard> {
  const {
    board, columns, cards, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onMoveCard,
    onCardClick,
    onCreate,
    createLabel,
  } = args;

  /* ── Derive column defs dynamically from DB rows. ── */
  const columnDefs = deriveColumnDefsFromRows(columns);
  const columnById = new Map(columns.map(c => [c.id, c] as const));

  /* ── statusToColumnId / columnIdToStatus are identity for this hub,
        but still defensive-guard against stray/stale column ids. ── */
  const validColIds = new Set(columnDefs.map(c => c.id));
  const statusToColumnId = (status: string): string | null =>
    validColIds.has(status) ? status : null;
  const columnIdToStatus = (columnId: string): string | null =>
    validColIds.has(columnId) ? columnId : null;

  /* ── Apply page-owned filters. ── */
  const filtered = cards.filter((card) => {
    if (search) {
      const q = search.toLowerCase();
      const title = card.work_item?.title?.toLowerCase() ?? '';
      const wid = card.work_item_id.toLowerCase();
      const ext = card.work_item?.external_id?.toLowerCase() ?? '';
      if (!title.includes(q) && !wid.includes(q) && !ext.includes(q)) return false;
    }
    if (selAssignees.size > 0) {
      const owner = card.work_item?.owner_name;
      if (!owner || !selAssignees.has(owner)) return false;
    }
    const types = filterSelected.work_item_type ?? [];
    if (types.length > 0 && !types.includes(card.work_item_type)) return false;
    const blocked = filterSelected.blocked ?? [];
    if (blocked.length > 0) {
      const state = card.is_blocked ? 'blocked' : 'open';
      if (!blocked.includes(state)) return false;
    }
    const assignees = filterSelected.assignee ?? [];
    if (assignees.length > 0) {
      const owner = card.work_item?.owner_name;
      if (!owner || !assignees.includes(owner)) return false;
    }
    const healths = filterSelected.health ?? [];
    if (healths.length > 0) {
      const h = card.work_item?.health ?? null;
      if (!h || !healths.includes(h)) return false;
    }
    return true;
  });

  /* ── Sort cards by the DB's sort_order so the shell renders in the
        same order the user sees in the legacy implementation. ── */
  const sorted = [...filtered].sort((a, b) => a.sort_order - b.sort_order);

  const canonicalCards: CanonicalBoardIssue[] = sorted.map(card => cardToCanonicalIssue({
    card,
    columnName: columnById.get(card.column_id)?.name,
  }));

  /* ── Assignee avatar roll-up (unfiltered count). ── */
  const allAssignees = Array.from(
    cards.reduce((map, c) => {
      const name = c.work_item?.owner_name;
      if (!name) return map;
      map.set(name, (map.get(name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  /* ── Persistence: drop → onMoveCard(cardId, to_column_id). ── */
  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.destColId === event.sourceColId) return;
      if (!validColIds.has(event.destColId)) return;
      return onMoveCard(event.cardId, event.destColId);
    },
    onStatusChange: (cardId, newStatus) => {
      if (!validColIds.has(newStatus)) return;
      return onMoveCard(cardId, newStatus);
    },
  };

  const interactions: BoardInteractions = {
    onCardClick,
  };

  return {
    name: 'team-program-board',
    contextKey: board.id,

    cards: canonicalCards,
    columns: columnDefs,
    statusToColumnId,
    columnIdToStatus,
    fromHubRow: (row) => cardToCanonicalIssue({
      card: row,
      columnName: columnById.get(row.column_id)?.name,
    }),

    filterCategories: buildTeamProgramFilterCategories(cards, avatarsByName),
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: TEAM_PROGRAM_GROUP_OPTIONS,
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

    resolveIcon: resolveTeamProgramIcon,

    createLabel: createLabel ?? 'Add card',
    onCreate,
  };
}
