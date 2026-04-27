/**
 * JiraTable -- canonical column / cell / editor types.
 *
 * Designed to be reused across ProjectHub, ReleaseHub, TestHub, IncidentHub
 * and any other surface that needs a Jira-style work-item list.
 */
import type { ReactNode } from 'react';

/** Sort direction in @atlaskit/dynamic-table's vocabulary. */
export type SortOrder = 'ASC' | 'DESC';

/** Density preset. "comfortable" is Catalyst's "one notch up from Jira". */
export type Density = 'comfortable' | 'compact';

/**
 * Props handed to a column's `cell` renderer for ONE row.
 * `value` is whatever the column extracts via its `accessor` function.
 */
export interface CellProps<TRow, TValue = unknown> {
  row: TRow;
  value: TValue;
  /** True when the row is currently focused (keyboard nav). */
  isFocused?: boolean;
  /** True when the row is currently selected (checkbox). */
  isSelected?: boolean;
  /** Submit a new value for this cell — calls onCellEdit on the parent. */
  commit: (next: TValue) => void;
}

/**
 * One column in a JiraTable.
 * `width` is fractional (Atlaskit DynamicTable convention), out of 100.
 */
export interface Column<TRow> {
  /** Stable key — also used as the cell key + sort key. */
  id: string;
  /** Header label. Empty string for icon-only columns (checkbox, type). */
  label: string;
  /** Width as a fraction (out of 100). */
  width?: number;
  /** Whether the column header is sortable. */
  sortable?: boolean;
  /** Cell content alignment. */
  align?: 'start' | 'center' | 'end';
  /** Always shown (cannot be hidden via column picker). */
  alwaysVisible?: boolean;
  /** Default visibility (column picker uses this to seed state). */
  defaultVisible?: boolean;
  /** Extract the sort/edit value from the row. Defaults to row[id]. */
  accessor?: (row: TRow) => unknown;
  /** Cell renderer — return any ReactNode. */
  cell: (props: CellProps<TRow>) => ReactNode;
}

/** Group definition for grouped rows. */
export interface RowGroup<TRow> {
  id: string;
  label: string;
  rows: TRow[];
  isCollapsed?: boolean;
  /**
   * Optional badge/metadata text shown next to the count in the group header
   * (e.g. a status lozenge or the assignee's name). Rendered as plain text.
   */
  meta?: string;
}

/** Public props for the canonical JiraTable. */
export interface JiraTableProps<TRow> {
  /** Schema. */
  columns: Column<TRow>[];
  /** Row data — when groups are not provided. */
  data?: TRow[];
  /** Grouped row data — takes precedence over `data` when present. */
  groups?: RowGroup<TRow>[];
  /** Stable id for each row. */
  getRowId: (row: TRow) => string;
  /** Click anywhere on a row that isn't an editor → opens detail. */
  onRowClick?: (row: TRow) => void;
  /**
   * Indent depth for hierarchy rendering. Returns the depth (0 = top-level,
   * 1 = first child, etc.). The first visible cell gets `depth * 16px` of
   * left padding so child rows visually nest under their parent — matches
   * Jira's hierarchy indent in the All Work / Backlog list view.
   */
  getRowDepth?: (row: TRow) => number;
  /** Called when a cell editor commits a new value. */
  onCellEdit?: (row: TRow, columnId: string, next: unknown) => void;
  /** Show selection checkboxes. */
  selectable?: boolean;
  selection?: ReadonlySet<string>;
  onSelectionChange?: (next: Set<string>) => void;
  /** Sort state (controlled). */
  sortKey?: string;
  sortOrder?: SortOrder;
  onSortChange?: (key: string, order: SortOrder) => void;
  /** Pagination. */
  rowsPerPage?: number;
  page?: number;
  onPageChange?: (next: number) => void;
  /** Currently-focused row key (keyboard nav). */
  focusedRowId?: string;
  /** Called when keyboard nav moves focus. Parent may persist or scroll. */
  onFocusedRowChange?: (rowId: string | null) => void;
  /** Esc inside the table fires this. Use it to close the side panel. */
  onEscape?: () => void;
  /** Density preset — "comfortable" is the Catalyst default. */
  density?: Density;
  /** Loading + empty UI. */
  isLoading?: boolean;
  emptyView?: ReactNode;
  /** ARIA label for the table region. */
  ariaLabel?: string;
  /**
   * Apr 27, 2026 (L70): bottom slot rendered INSIDE `.jira-table-viewport`
   * after the table body — eliminates the visual gap between the table's
   * last row and a "+ Create" row pinned underneath. Pass the inline
   * BottomCreateRow JSX here. Horizontal scrollbar (if any) appears
   * BELOW this slot, not between the table and the slot.
   */
  bottomSlot?: ReactNode;

  /**
   * Column visibility state. When provided alongside `onColumnVisibilityChange`,
   * JiraTable renders a trailing `+` header button that opens a column picker.
   * Columns flagged `alwaysVisible: true` in the schema are locked and cannot
   * be toggled off — required structural columns (checkbox, key, summary).
   * When either prop is omitted, the `+` button is hidden and all schema
   * columns render.
   */
  columnVisibility?: ReadonlySet<string>;
  onColumnVisibilityChange?: (next: Set<string>) => void;

  /**
   * Group collapse state. When provided, the group-header cell renders a
   * chevron (aria-expanded) that toggles via `onToggleGroup`. Collapsed
   * group ids in this Set hide their rows; the header row stays visible.
   */
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroup?: (groupId: string) => void;

  /**
   * Optional right-click context-menu actions. When provided, a right-click
   * on ANY data row opens a portal menu at the cursor with these items.
   * Pass the same action list the consumer uses for `makeRowActionsCell` so
   * behaviour is identical between the ⋯ hover menu and the context menu.
   */
  contextMenuActions?: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    danger?: boolean;
    hidden?: (row: TRow) => boolean;
    disabled?: (row: TRow) => boolean;
    onClick: (row: TRow) => void;
  }>;

  /**
   * Enable column reorder via drag-and-drop on header cells. When `true`,
   * non-structural columns (id NOT starting with `__`) gain a grab cursor on
   * their header and can be dragged to a new position. Order is held in
   * internal state by default; pass `columnOrder` + `onColumnOrderChange` for
   * controlled use (e.g. URL or workspace persistence).
   *
   * Default: false. Existing consumers see no behaviour change.
   */
  enableColumnReorder?: boolean;
  /** Controlled column order (array of column ids in render order). */
  columnOrder?: ReadonlyArray<string>;
  onColumnOrderChange?: (next: string[]) => void;

  /**
   * Enable row virtualization via @tanstack/react-virtual. Recommended for
   * data sets ≥500 rows. Auto-disabled when `groups` are provided (group
   * headers have variable heights that don't fit a single rowHeight).
   *
   * Default: false. Existing consumers render every row as before.
   */
  enableVirtualization?: boolean;
}
