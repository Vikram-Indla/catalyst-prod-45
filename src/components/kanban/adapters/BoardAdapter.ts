/**
 * BoardAdapter<T> — Canonical Kanban adapter contract (Phase 2).
 *
 * The canonical Catalyst Kanban primitive (ProjectHub's PragmaticBoard +
 * the extracted KanbanToolbar) is reached through this adapter interface.
 * Every Hub that renders a board supplies one BoardAdapter<T> and hands it
 * to <KanbanBoardShell/>; the shell is fully generic and hub-agnostic.
 *
 *   Hub data (T) ──▶ BoardAdapter<T> ──▶ BoardIssue[] ──▶ PragmaticBoard
 *                                     ──▶ FilterCategory[] ──▶ KanbanToolbar
 *                                     ──▶ GroupByOption[]   ──▶ KanbanToolbar
 *                                     ──▶ persistence callbacks
 *
 * Design rules that govern this contract:
 *
 *   1. The canonical card shape is `BoardIssue` (from kanban-types.ts).
 *      Hub adapters map hub-native rows → BoardIssue. Fields with Jira
 *      provenance (`issueKey`, `summary`, `issueType`) are used as the
 *      generic "identifier / title / type" slots; a non-Jira hub just
 *      fills them with whatever makes sense (`INI-0042` / `IDEA-17`).
 *
 *   2. The canonical column shape is `KanbanColumnDef`. Each hub declares
 *      its own lifecycle (Initiatives, Incidents, Issues, Ideas…) with
 *      stable `id`s so column reordering persists.
 *
 *   3. Filter + group-by + sort schemas are hub-defined. The shell is
 *      declarative: the toolbar renders whatever categories/groupings the
 *      adapter supplies. ProjectHub's `FilterCategory` / `GroupByOption`
 *      shapes are reused so no hub has to invent new filter primitives.
 *
 *   4. Persistence is always adapter-owned. The shell never calls Supabase
 *      directly. Drop/status/reorder/flag/summary/assignee callbacks all
 *      return Promise<void>; a rejection is signalled via a toast and
 *      triggers the optimistic rollback.
 *
 *   5. Hub-specific extras (primaryLozenge / secondaryLozenge / metaText)
 *      travel on BoardIssue as optional fields so non-Jira hubs can enrich
 *      the card without subclassing.
 *
 * Phase plan:
 *   Phase 2 (this file)  — define the contract, nothing else.
 *   Phase 3 — port ProductHub (initiatives) off CatalystKanban onto a
 *             BoardAdapter<Initiative> wired to KanbanBoardShell.
 *   Phase 4 — Product Ideas.
 *   Phase 5 — IncidentHub.
 *   Phase 6 — Team + Program boards.
 *   Phase 7 — delete CatalystKanban, CatalystKanbanBoard, catalyst-types
 *             (KanbanCardData et al), and the old producthub/kanban
 *             component tree once every hub is on the canonical path.
 */
import type { ReactNode } from 'react';
import type { BoardIssue } from '../kanban-types';
import type { KanbanColumnDef } from '../kanban-tokens';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import type { GroupByOption } from '@/components/shared/GroupByPopover';

/* ═══════════════════════════════════════════════════════════════════════
   BoardIssue extensions — non-Jira hubs populate these optional slots.
   The canonical shape stays BoardIssue; these are purely additive so the
   existing ProjectHub renderer never has to care.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Lozenge rendered on a card (Atlaskit Lozenge parity).
 *
 * PrimaryLozenge is typically the "container" relationship (epic, parent,
 * department). SecondaryLozenge is typically the "release" relationship
 * (fix version, sprint, target quarter).
 */
export interface BoardLozenge {
  label: string;
  /** Atlaskit Lozenge appearance. `default` is the muted neutral lozenge. */
  appearance?: 'default' | 'inprogress' | 'success' | 'moved' | 'new' | 'removed';
}

/**
 * Extended BoardIssue with hub-agnostic optional fields.
 *
 * The canonical renderer reads `primaryLozenge` / `secondaryLozenge` /
 * `metaText` if present. ProjectHub issues don't set them and render
 * exactly as they do today. ProductHub initiatives, Ideas, Incidents all
 * use them to surface hub-specific relationships without changing the
 * renderer.
 */
export interface CanonicalBoardIssue extends BoardIssue {
  /** Primary lozenge — epic / parent / department / roadmap (muted). */
  primaryLozenge?: BoardLozenge | null;
  /** Secondary lozenge — fix version / sprint / target quarter (bordered). */
  secondaryLozenge?: BoardLozenge | null;
  /** Right-aligned footer meta (e.g. "updated 3d ago", "due Apr 30"). */
  metaText?: string | null;
  /** Opaque passthrough — the original hub row, for adapter callbacks. */
  raw?: unknown;
}

/* ═══════════════════════════════════════════════════════════════════════
   Sort — optional; hubs that want a sort menu in the toolbar provide
   compare functions.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BoardSortOption {
  /** Stable id — `updated`, `priority`, `created`. */
  id: string;
  /** Human label in the sort popover. */
  label: string;
  /** Standard Array.sort comparator. */
  compare: (a: CanonicalBoardIssue, b: CanonicalBoardIssue) => number;
}

/* ═══════════════════════════════════════════════════════════════════════
   Persistence contract — adapter owns every mutation. Rejections surface
   to the shell as optimistic-rollback + toast.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Drop event fired by the shell when a card moves.
 *
 * `insertIndex` is the target position in the destination column's
 * `issuesById` ordering.
 */
export interface BoardDropEvent {
  cardId: string;
  sourceColId: string;
  destColId: string;
  insertIndex: number;
}

export interface BoardPersistence {
  /**
   * Card dropped on a new column or reordered within the same column.
   * The shell has already applied the optimistic reorder; the adapter's
   * job is to persist. Rejection triggers a rollback toast.
   */
  onDrop: (event: BoardDropEvent) => void | Promise<void>;

  /** Status change from the column's status picker on a card. */
  onStatusChange?: (cardId: string, newStatus: string) => void | Promise<void>;

  /** Inline summary rename. */
  onSaveSummary?: (cardId: string, summary: string) => void | Promise<void>;

  /** Flag/unflag toggle. */
  onToggleFlag?: (cardId: string) => void | Promise<void>;

  /** Assignee change from the avatar picker. */
  onChangeAssignee?: (cardId: string, assigneeName: string | null) => void | Promise<void>;

  /** Labels updated from the label editor popover. */
  onLabelsUpdated?: (cardId: string, labels: string[]) => void | Promise<void>;

  /** Parent re-link. */
  onParentChange?: (cardId: string, parentKey: string | null) => void | Promise<void>;

  /** Soft archive. */
  onArchive?: (cardId: string) => void | Promise<void>;

  /** Hard delete (with confirmation dialog in the overflow menu). */
  onDelete?: (cardId: string) => void | Promise<void>;

  /** Card moved to another project/board. */
  onMoved?: (cardId: string, destination: { projectKey: string; boardId?: string }) => void | Promise<void>;

  /** Link created to another work item. */
  onLinked?: (cardId: string, targetKey: string, linkType: string) => void | Promise<void>;
}

/* ═══════════════════════════════════════════════════════════════════════
   Card actions / UI hooks — optional callbacks the shell forwards.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BoardInteractions {
  /** User clicked the card body — host opens a detail drawer. */
  onCardClick?: (cardId: string) => void;
  /** Copy short link (⋯ menu). */
  onCopyLink?: (cardId: string) => void;
  /** Copy issue key to clipboard (⋯ menu). */
  onCopyKey?: (cardId: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════════
   The canonical adapter contract.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BoardAdapter<THubRow = unknown> {
  /* ───── Identity ───── */
  /** Stable adapter name — used for storageKey suffixes + debug logs. */
  name: string;
  /**
   * Hub context — projectKey, teamId, programId, etc. Forwarded through
   * to the toolbar's ProjectKey + persistence callbacks.
   */
  contextKey: string;

  /* ───── Data ───── */
  /** Cards to render. Adapted from hub-native rows via `fromHubRow`. */
  cards: CanonicalBoardIssue[];
  /** Column lifecycle. */
  columns: KanbanColumnDef[];
  /** Map a raw hub status → canonical column id. */
  statusToColumnId: (status: string) => string | null;
  /** Reverse lookup — primary status for a column id. */
  columnIdToStatus: (columnId: string) => string | null;

  /* ───── Row adapter (used by the shell's optimistic handlers) ───── */
  /**
   * Optional: take a hub-native row and return a CanonicalBoardIssue.
   * Used by the shell when it re-fetches after a mutation so it can
   * rehydrate the optimistic state from a single row.
   */
  fromHubRow?: (row: THubRow) => CanonicalBoardIssue;

  /* ───── Declarative UI schemas ───── */
  /** Filter categories rendered in the toolbar's basic filter popover. */
  filterCategories: FilterCategory[];
  /** Selected filter values keyed by category id. */
  filterSelected: Record<string, string[]>;
  /** Called when the user toggles a filter option. */
  onFilterChange: (categoryId: string, values: string[]) => void;
  /** Clear all filters back to empty. */
  onClearFilters: () => void;

  /** Group-by swimlane options. First entry should be the `none` key. */
  groupByOptions: GroupByOption<string>[];
  /** Current group-by key. */
  groupBy: string;
  /** Change group-by key. */
  onGroupByChange: (key: string) => void;
  /** The key that represents "no grouping" (usually `"none"`). */
  groupByNoneKey: string;

  /** Sort options (optional). */
  sortOptions?: BoardSortOption[];

  /* ───── Assignee avatar context ───── */
  /** All candidate assignees with their card counts, for the avatar stack. */
  allAssignees: { name: string; count: number }[];
  /** Currently selected assignees (filter). */
  selAssignees: Set<string>;
  /** Update the assignee filter. */
  onSelAssigneesChange: (next: Set<string>) => void;
  /** `displayName` (lowercased) → avatar URL. */
  avatarsByName: Map<string, string>;

  /* ───── Search ───── */
  search: string;
  onSearchChange: (v: string) => void;

  /* ───── Behavior contracts ───── */
  persistence: BoardPersistence;
  interactions?: BoardInteractions;

  /* ───── Optional: map-statuses admin page path (hub-configurable). ───── */
  mapStatusesPath?: string;

  /* ───── Optional: primary CTA on the empty state or toolbar. ───── */
  onCreate?: () => void;
  createLabel?: string;

  /* ───── Optional: card slots for hub-specific UI. ───── */
  renderCardFooter?: (card: CanonicalBoardIssue) => ReactNode;

  /**
   * Optional per-adapter icon resolver. When supplied, the canonical card's
   * footer type-icon slot renders whatever this returns. Falls back to the
   * default Jira issue-type icon if the function returns null or is absent.
   * Hubs whose type taxonomy is not Jira-native (initiatives, ideas,
   * incidents) should populate this so the card looks hub-native.
   */
  resolveIcon?: (card: CanonicalBoardIssue) => ReactNode | null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Helper: derive `ColMap` (column id → ordered BoardIssue ids) from an
   adapter's cards + column definitions. The canonical shell uses this to
   hydrate PragmaticBoard's `colMap` prop.
   ═══════════════════════════════════════════════════════════════════════ */

export function buildColMapFromAdapter<T>(adapter: BoardAdapter<T>): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const col of adapter.columns) map[col.id] = [];
  for (const card of adapter.cards) {
    const colId = adapter.statusToColumnId(card.status);
    if (colId && map[colId]) map[colId].push(card.id);
  }
  return map;
}

/* ═══════════════════════════════════════════════════════════════════════
   Helper: derive `issuesById` (BoardIssue lookup) from an adapter's cards.
   ═══════════════════════════════════════════════════════════════════════ */

export function buildIssuesByIdFromAdapter<T>(adapter: BoardAdapter<T>): Map<string, CanonicalBoardIssue> {
  const map = new Map<string, CanonicalBoardIssue>();
  for (const c of adapter.cards) map.set(c.id, c);
  return map;
}
