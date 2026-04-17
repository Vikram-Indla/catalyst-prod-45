/**
 * DynamicTable — shared type surface.
 *
 * Designed against the Atlaskit DynamicTable / Jira grid contract:
 *   https://atlassian.design/components/dynamic-table
 *
 * This is the Catalyst sandbox-buildable equivalent: TanStack Table + react-virtual
 * + Radix primitives. It mirrors Atlaskit's column/row/selection/sort/visibility
 * semantics so the surface can later be swapped to @atlaskit/dynamic-table with
 * zero call-site churn once that package is installable.
 */
import type { ColumnDef, ColumnSizingState, RowSelectionState, SortingState, VisibilityState } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export type DynamicTableColumnId = string;

/**
 * DynamicTableColumn extends a TanStack ColumnDef with the two extras Atlaskit
 * DynamicTable needs but TanStack does not express: a stable `id` (used as the
 * localStorage key for visibility/width persistence), and a human `label` used
 * by the column-visibility menu.
 */
export type DynamicTableColumn<TData> = ColumnDef<TData, unknown> & {
  id: DynamicTableColumnId;
  /** Plain-text label used by the column-visibility menu. Falls back to `header` if absent. */
  label?: string;
  /** Fixed minimum width in px. Defaults to 60. */
  minSize?: number;
  /** Default width in px. Defaults to 160. */
  size?: number;
  /** Fixed maximum width in px. Undefined = no cap. */
  maxSize?: number;
  /** Freeze column out of the visibility toggle (e.g. Key / Summary). */
  alwaysVisible?: boolean;
  /** Disable user resize for this column. */
  disableResize?: boolean;
  /** Disable user sort for this column. */
  disableSort?: boolean;
  /** Align cell content. */
  align?: 'left' | 'center' | 'right';
};

export interface DynamicTableRowGroup<TData> {
  /** Stable group key used for collapse/expand persistence. */
  id: string;
  /** Uppercase label shown in the group row (e.g. "IN PROGRESS"). */
  label: string;
  /** Rows belonging to this group, in display order. */
  rows: TData[];
}

/** Emit this when the user changes a column's width. Caller persists. */
export type DynamicTableSizingChange = (next: ColumnSizingState) => void;

/** Emit this when the user toggles a column. Caller persists. */
export type DynamicTableVisibilityChange = (next: VisibilityState) => void;

/** Emit this when the user toggles row selection. */
export type DynamicTableSelectionChange = (next: RowSelectionState) => void;

/** Emit this when the user sorts. */
export type DynamicTableSortingChange = (next: SortingState) => void;

export interface DynamicTableProps<TData> {
  /** Stable table id used for column sizing/visibility localStorage persistence. */
  tableId: string;

  columns: DynamicTableColumn<TData>[];

  /**
   * Flat data. When `groups` is provided the component renders grouped rows
   * with collapsible group headers instead of `data`.
   */
  data?: TData[];

  /** Pre-grouped data. Overrides `data` when provided. */
  groups?: DynamicTableRowGroup<TData>[];

  /** Stable id extractor — must be unique per row. */
  getRowId: (row: TData) => string;

  /** Opens the drawer / detail view for a row. */
  onRowClick?: (row: TData) => void;

  /** Shown when a row is hovered. Receives the row. */
  renderRowActions?: (row: TData) => ReactNode;

  /** Opt-in: render a selection checkbox column at the start of every row. */
  selectable?: boolean;
  selection?: RowSelectionState;
  onSelectionChange?: DynamicTableSelectionChange;

  /** Opt-in: show a tree chevron column (only renders when the row reports `hasChildren`). */
  expandable?: boolean;
  isRowExpanded?: (row: TData) => boolean;
  onToggleExpand?: (row: TData) => void;
  hasChildren?: (row: TData) => boolean;

  /** Opt-in: header sort. */
  sortable?: boolean;
  sorting?: SortingState;
  onSortingChange?: DynamicTableSortingChange;

  /** Opt-in: user column resize via drag-to-resize column borders. */
  resizable?: boolean;
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: DynamicTableSizingChange;

  /** Opt-in: the "+" header button that opens the column-visibility menu. */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: DynamicTableVisibilityChange;

  /** Opt-in: virtualize the row body when the list is long. Defaults to true when data length >= 60. */
  virtualize?: boolean;
  /** Row height in px. Must be stable for virtualization. Defaults to 40. */
  rowHeight?: number;

  /** Density preset. */
  density?: 'compact' | 'default';

  /** Loading / empty / error swap-in slots. */
  isLoading?: boolean;
  loadingSkeletonRows?: number;
  error?: Error | null;
  emptyState?: ReactNode;

  /** Minimum total pixel width of the table (header + body). Enables horizontal scroll. */
  minTableWidth?: number;

  /** Sticky header under horizontal scroll. Defaults to true. */
  stickyHeader?: boolean;

  /** Additional className on the outer scroll container. */
  className?: string;

  /** aria-label for the table. */
  ariaLabel?: string;
}
