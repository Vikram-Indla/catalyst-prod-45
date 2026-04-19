/**
 * CatalystKanban — Hub-agnostic type contract.
 *
 * This is the single shape every Hub adapts into. It intentionally drops
 * Jira-specific field names (issueKey → key, summary → title) so Product,
 * Incident, Team, Program etc. can surface through the same primitive
 * without pretending to be ProjectHub issues.
 *
 * The primitive treats everything here as display-only. Hub-specific
 * fields (initiative_type, health, severity, target_quarter) travel in
 * `raw` and surface via renderCardFooter / renderLozenges slots.
 */
import type { ReactNode } from 'react';
import type { KanbanColumnDef } from './kanban-tokens';

/* ═════ Card shape — one row per draggable card on the board. ═════ */
export interface KanbanCardData {
  /** Unique row id (UUID). Mutations dispatch on this. */
  id: string;
  /** Display key — `PROJ-123`, `INI-0042`, `INC-88`. JetBrains Mono footer. */
  key: string;
  /** Card title / summary. */
  title: string;
  /** Canonical work item type: bug, story, task, epic, initiative, incident… */
  type: string;
  /** Priority bucket — Highest|High|Medium|Low|Lowest|null (null renders no bars). */
  priority: string | null;
  /** Raw status value (hub-specific enum, mapped to column via statusToColumnId). */
  status: string;
  /** Column category — drives the header dot color + ordering semantics. */
  statusCategory: 'todo' | 'in_progress' | 'done';
  /** Display name for the assignee. Null = unassigned. */
  assigneeName: string | null;
  /** Flag icon (Jira parity). */
  flagged: boolean;
  /** Primary lozenge — epic, parent, department, roadmap. Rendered dark gray. */
  primaryLozenge: KanbanLozenge | null;
  /** Secondary lozenge — fix version, sprint, target quarter. Bordered. */
  secondaryLozenge: KanbanLozenge | null;
  /** Optional right-side footer meta line (e.g. age, target date). */
  metaText?: string | null;
  /** Timestamps used for sort / "recently updated" filter. */
  updatedAt: string | null;
  createdAt: string | null;
  /**
   * Hub passthrough — opaque to CatalystKanban but carried to host
   * callbacks (onCardClick, onStatusChange, renderCardFooter).
   */
  raw?: unknown;
}

export interface KanbanLozenge {
  label: string;
  /** Atlaskit lozenge appearance — default|inprogress|success|moved|new|removed */
  appearance?: 'default' | 'inprogress' | 'success' | 'moved' | 'new' | 'removed';
}

/* ═════ Filter schema — each Hub declares which fields appear. ═════ */
export interface KanbanFilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface KanbanFilterFieldDef {
  /** Stable id — `type`, `priority`, `parent`, `department`. */
  id: string;
  /** Button label on the filter bar. */
  label: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Width hint for the Atlaskit Select popover (px). */
  width?: number;
  /**
   * Supplier — either sync (static enum) or async (derived from card set).
   * Called with the current cards so options auto-derive from data.
   */
  getOptions: (cards: KanbanCardData[]) => KanbanFilterOption[];
  /** Given a card and the selected values, return true if the card matches. */
  matches: (card: KanbanCardData, selected: string[]) => boolean;
}

/* ═════ Group-by — swimlane configuration. ═════ */
export interface KanbanGroupByOption {
  id: string;
  label: string;
  /** Stable bucket key — used for collapse state, insertion order. */
  getKey: (card: KanbanCardData) => string;
  /** Human label for the swimlane header. */
  getLabel: (card: KanbanCardData) => string;
  /** Sort order among buckets ("No X" buckets tend to fall to the bottom). */
  compareBuckets?: (a: { key: string; label: string; size: number }, b: { key: string; label: string; size: number }) => number;
}

/* ═════ Sort — column ordering within a swimlane / column body. ═════ */
export interface KanbanSortOption {
  id: string;
  label: string;
  compare: (a: KanbanCardData, b: KanbanCardData) => number;
}

/* ═════ Top-level CatalystKanban props. ═════ */
export interface CatalystKanbanProps {
  /** The cards to render. Adapted from hub data via `*ToKanbanCard`. */
  cards: KanbanCardData[];
  /** Column definitions. Hubs supply their own lifecycle. */
  columns: KanbanColumnDef[];
  /** Map a raw status string to a column id. Hubs supply this. */
  statusToColumnId: (status: string) => string | null;
  /** Reverse lookup — primary status for a column (used when dropping cross-column). */
  columnIdToStatus: (columnId: string) => string | null;

  /** Filter schema — order determines filter bar order. */
  filterFields?: KanbanFilterFieldDef[];
  /** Group-by options. First entry is rendered as "None" by default. */
  groupByOptions?: KanbanGroupByOption[];
  /** Sort options. First entry = default. */
  sortOptions?: KanbanSortOption[];

  /** User clicked a card — host opens a detail drawer. */
  onCardClick?: (card: KanbanCardData) => void;
  /**
   * User dropped a card into a new column. Host persists the status change.
   * Return a rejected promise to roll back the optimistic move.
   */
  onStatusChange?: (card: KanbanCardData, newStatus: string, newColumnId: string) => void | Promise<void>;
  /** User reordered a card within the same column. Optional. */
  onReorder?: (card: KanbanCardData, columnId: string, newIndex: number) => void | Promise<void>;

  /** Optional footer slot — rendered at the bottom of the card. */
  renderCardFooter?: (card: KanbanCardData) => ReactNode;
  /** Primary CTA ("+ New initiative" / "+ Create" / "+ Report incident"). */
  onCreate?: () => void;
  createLabel?: string;

  /** Page title / subtitle — fed into CatalystPageHeader. */
  title?: string;
  subtitle?: string;

  /** Keys used to persist density + filter state. Hub-scoped. */
  storageKey?: string;
}
