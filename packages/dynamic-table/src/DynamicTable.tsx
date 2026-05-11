import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type {
  CellContext,
  ColumnDef,
  ColumnSizingState,
  ExpandedState,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Icon } from "@catylast/icons";
import {
  Checkbox,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
  Pagination,
} from "@catylast/primitives";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import * as styles from "./DynamicTable.css";
import { cx } from "./utils";

export type DynamicTableDensity = "compact" | "standard" | "comfortable";

/**
 * Pagination configuration. Three shapes:
 *
 * - **Omitted (default)** — pagination is on with `pageSize: 20`. The
 *   pagination chrome auto-hides when the table has only one page.
 * - **`false`** — fully disabled. Every row renders, no chrome.
 * - **Object** — override defaults. Pass `pageSize` to change the page
 *   size; pass `page` + `onPageChange` for controlled mode (useful for
 *   URL-synced pagination).
 */
export type DynamicTablePaginationPosition = "start" | "center" | "end";

export type DynamicTablePagination =
  | false
  | {
      /** Rows per page. @default 20 */
      pageSize?: number;
      /** Controlled current page (1-indexed). Pair with `onPageChange`. */
      page?: number;
      /** Called when the user picks a different page. */
      onPageChange?: (page: number) => void;
      /**
       * Hide the chrome when there's only one page. @default true — most
       * surfaces don't want to show `1` chrome under a 5-row table.
       */
      hideOnSinglePage?: boolean;
      /**
       * Horizontal placement inside the footer bar. The footer itself
       * always sits outside the scrolling region so users never have to
       * scroll to find the page controls.
       * @default "center"
       */
      position?: DynamicTablePaginationPosition;
    };

export type DynamicTableProps<TData> = {
  /** Column definitions. Wrap in `useMemo` for a stable reference. */
  columns: ColumnDef<TData>[];
  /** Row data. */
  data: TData[];
  /** Column IDs to pin to the left. Pinned columns stay visible during horizontal scroll. */
  pinnedColumns?: string[];
  /** Density preset. Affects row height and cell padding. */
  density?: DynamicTableDensity;
  /** Allow per-column sort. Click a header to toggle. */
  enableSorting?: boolean;
  /** Allow per-column resize. Drag the right edge of a header. */
  enableColumnResizing?: boolean;
  /** Add a leading checkbox column for multi-row selection. */
  enableSelection?: boolean;
  /** Enable hierarchical row expansion. Requires `getRowChildren`. */
  enableExpansion?: boolean;
  /**
   * Controlled expansion state. Pair with `onExpandedChange`. Omit both for
   * uncontrolled mode where the table tracks expansion internally.
   */
  expanded?: ExpandedState;
  /** Called when expansion changes. Required for controlled mode. */
  onExpandedChange?: OnChangeFn<ExpandedState>;
  /**
   * Render a small toolbar above the table with a "Configure columns"
   * button. Users can toggle individual column visibility from the menu.
   */
  enableColumnVisibility?: boolean;
  /**
   * Initial visibility state. Map of column ID → boolean (false = hidden).
   * Columns not listed default to visible.
   */
  defaultColumnVisibility?: VisibilityState;
  /**
   * Custom slot rendered inside the toolbar (left side). Use it for search
   * inputs, filter chips, export buttons, etc. Triggers the toolbar to
   * render even if `enableColumnVisibility` is off.
   */
  toolbarLeft?: ReactNode;
  /**
   * Custom slot rendered inside the toolbar (right side, before the
   * "Configure columns" button). Triggers the toolbar to render even if
   * `enableColumnVisibility` is off.
   */
  toolbarRight?: ReactNode;
  /** Returns the children of a row when `enableExpansion` is on. */
  getRowChildren?: (row: TData) => TData[] | undefined;
  /** Stable row id getter. Strongly recommended for selection/expansion to survive data changes. */
  getRowId?: (row: TData) => string;
  /** Slot rendered when there are no rows and `loading` is `false`. */
  empty?: ReactNode;
  /** Show a loading state instead of rows. */
  loading?: boolean;
  /** Slot rendered while loading. Defaults to a centered "Loading…" message. */
  loadingContent?: ReactNode;
  /** Called whenever the row selection changes. */
  onSelectionChange?: (rows: TData[]) => void;
  /** Called when a row is clicked (excluding clicks on the checkbox or expand toggle). */
  onRowClick?: (row: TData) => void;
  /**
   * Inline action buttons rendered in the first column of each row, visible
   * on hover. Use it for per-row actions like "+ Add child" or a kebab menu.
   * Clicks inside the actions slot do NOT trigger `onRowClick`.
   */
  renderRowActions?: (row: TData) => ReactNode;
  /**
   * Label for the inline creator button rendered as a footer row at the
   * bottom of the table body. Pair with `onCreate`. Use `renderCreator` for
   * full custom content.
   */
  createLabel?: string;
  /** Click handler for the default creator button. Pair with `createLabel`. */
  onCreate?: () => void;
  /**
   * Custom render for the creator footer row. Overrides `createLabel` /
   * `onCreate`. The returned node is rendered inside a single full-width
   * footer cell.
   */
  renderCreator?: () => ReactNode;
  /**
   * Pagination. Omit for default behaviour (`pageSize: 20`, auto-hide
   * chrome when there's only one page), pass `false` to render every
   * row, or pass an object to customize / control. See
   * `DynamicTablePagination` for the full shape.
   */
  pagination?: DynamicTablePagination;
  className?: string;
  style?: CSSProperties;
};

const SELECTION_COL_ID = "_select";

export function DynamicTable<TData>(props: DynamicTableProps<TData>) {
  const {
    columns,
    data,
    pinnedColumns,
    density = "standard",
    enableSorting = true,
    enableColumnResizing = true,
    enableSelection = false,
    enableExpansion = false,
    expanded: expandedProp,
    onExpandedChange: onExpandedChangeProp,
    enableColumnVisibility = false,
    defaultColumnVisibility,
    toolbarLeft,
    toolbarRight,
    getRowChildren,
    getRowId,
    empty,
    loading = false,
    loadingContent,
    onSelectionChange,
    onRowClick,
    renderRowActions,
    createLabel,
    onCreate,
    renderCreator,
    pagination,
    className,
    style,
  } = props;

  // Pagination normalization.
  // - `pagination === false` → disabled entirely (no row windowing).
  // - object → `pageSize` (default 20), optional controlled `page` +
  //   `onPageChange`, `hideOnSinglePage` (default true).
  // - omitted → defaults: enabled, pageSize 20, hide-on-single-page.
  const paginationEnabled = pagination !== false;
  const paginationConfig = paginationEnabled
    ? typeof pagination === "object" && pagination !== null
      ? pagination
      : {}
    : null;
  const paginationPageSize = paginationConfig?.pageSize ?? 20;
  const paginationControlled = paginationConfig?.page !== undefined;
  const paginationHideOnSingle = paginationConfig?.hideOnSinglePage ?? true;
  const paginationPosition: DynamicTablePaginationPosition =
    paginationConfig?.position ?? "center";
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: paginationPageSize,
  });
  // Keep the internal pageSize aligned with the prop's pageSize on
  // change without resetting the user's current page index.
  useEffect(() => {
    setInternalPagination((prev) =>
      prev.pageSize === paginationPageSize
        ? prev
        : { ...prev, pageSize: paginationPageSize },
    );
  }, [paginationPageSize]);
  const paginationState: PaginationState = paginationControlled
    ? {
        pageIndex: (paginationConfig?.page ?? 1) - 1,
        pageSize: paginationPageSize,
      }
    : internalPagination;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const expandedState = expandedProp ?? internalExpanded;
  const handleExpandedChange = onExpandedChangeProp ?? setInternalExpanded;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    defaultColumnVisibility ?? {},
  );

  const finalColumns = useMemo<ColumnDef<TData>[]>(() => {
    let cols = [...columns];

    // Wrap the first column whenever expansion or row actions are enabled.
    if (enableExpansion || renderRowActions) {
      const original = cols[0];
      if (original) {
        const originalCell = original.cell;
        cols[0] = {
          ...original,
          cell: (ctx: CellContext<TData, unknown>) => (
            <FirstColumnCell
              ctx={ctx}
              originalCell={originalCell}
              enableExpansion={enableExpansion}
              renderRowActions={renderRowActions}
            />
          ),
        } as ColumnDef<TData>;
      }
    }

    if (enableSelection) {
      const selectionCol: ColumnDef<TData> = {
        id: SELECTION_COL_ID,
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
        enableSorting: false,
        header: ({ table }) => {
          const all = table.getIsAllRowsSelected();
          const some = table.getIsSomeRowsSelected();
          const checked: boolean | "indeterminate" = all
            ? true
            : some
              ? "indeterminate"
              : false;
          return (
            <div
              className={styles.selectionCellWrapper}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                size="sm"
                checked={checked}
                onCheckedChange={(value) =>
                  table.toggleAllRowsSelected(value === true)
                }
              />
            </div>
          );
        },
        cell: ({ row }) => (
          <div
            className={styles.selectionCellWrapper}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              size="sm"
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(value === true)}
            />
          </div>
        ),
      };
      cols = [selectionCol, ...cols];
    }

    return cols;
  }, [columns, enableExpansion, enableSelection, renderRowActions]);

  const table = useReactTable<TData>({
    data,
    columns: finalColumns,
    state: {
      sorting,
      expanded: expandedState,
      rowSelection,
      columnSizing,
      columnVisibility,
      columnPinning: pinnedColumns ? { left: pinnedColumns } : {},
      ...(paginationEnabled && { pagination: paginationState }),
    },
    enableRowSelection: enableSelection,
    enableExpanding: enableExpansion,
    enableSorting,
    enableColumnResizing,
    enableHiding: enableColumnVisibility,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onExpandedChange: handleExpandedChange,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    ...(paginationEnabled &&
      !paginationControlled && {
        onPaginationChange: setInternalPagination,
      }),
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    ...(enableExpansion && { getExpandedRowModel: getExpandedRowModel() }),
    ...(paginationEnabled && {
      getPaginationRowModel: getPaginationRowModel(),
    }),
    ...(getRowChildren && { getSubRows: getRowChildren }),
    ...(getRowId && { getRowId: (row: TData) => getRowId(row) }),
  });

  useEffect(() => {
    if (!onSelectionChange) return;
    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
    onSelectionChange(selected);
    // Re-run only when the selection state object changes.
  }, [rowSelection, onSelectionChange, table]);

  const rows = table.getRowModel().rows;
  const totalCols = table.getVisibleFlatColumns().length;
  const showCreator = Boolean(
    renderCreator || (createLabel && (onCreate || createLabel)),
  );
  const showEmpty = !loading && rows.length === 0 && !showCreator;
  const showToolbar = Boolean(
    enableColumnVisibility || toolbarLeft || toolbarRight,
  );

  const toggleableColumns = enableColumnVisibility
    ? table
        .getAllLeafColumns()
        .filter((col) => col.id !== SELECTION_COL_ID && col.getCanHide())
    : [];

  return (
    <div
      className={cx(styles.container, styles.density[density], className)}
      style={style}
    >
      {showToolbar && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarSide}>{toolbarLeft}</div>
          <div className={styles.toolbarSide}>
            {toolbarRight}
            {enableColumnVisibility && toggleableColumns.length > 0 && (
              <Menu>
                <MenuTrigger asChild>
                  <IconButton
                    icon="settings"
                    label="Configure columns"
                    size="sm"
                  />
                </MenuTrigger>
                <MenuContent align="end">
                  <MenuLabel>Columns</MenuLabel>
                  {toggleableColumns.map((col) => {
                    const headerDef = col.columnDef.header;
                    const label =
                      typeof headerDef === "string" && headerDef
                        ? headerDef
                        : col.id;
                    const visible = col.getIsVisible();
                    return (
                      <MenuItem
                        key={col.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          col.toggleVisibility();
                        }}
                      >
                        <span className={styles.columnToggleCheck}>
                          {visible && <Icon name="check" size={14} />}
                        </span>
                        {label}
                      </MenuItem>
                    );
                  })}
                </MenuContent>
              </Menu>
            )}
          </div>
        </div>
      )}
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const column = header.column;
                  const isPinned = column.getIsPinned() === "left";
                  const isLastPinned =
                    isPinned && column.getIsLastColumn("left");
                  const canSort = enableSorting && column.getCanSort();
                  const sorted = column.getIsSorted();
                  const canResize = column.getCanResize();
                  const isResizing = column.getIsResizing();

                  const headerStyle: CSSProperties = {
                    width: header.getSize(),
                  };
                  if (isPinned) {
                    headerStyle.left = column.getStart("left");
                  }

                  return (
                    <th
                      key={header.id}
                      style={headerStyle}
                      className={cx(
                        styles.headerCell,
                        canSort && styles.headerCellSortable,
                        isPinned && styles.cellPinned,
                        isPinned && styles.headerCellPinned,
                        isLastPinned && styles.pinnedDivider,
                      )}
                      onClick={
                        canSort ? column.getToggleSortingHandler() : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <span className={styles.headerInner}>
                          {flexRender(
                            column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && (
                            <span
                              className={cx(
                                styles.sortIndicator,
                                !sorted && styles.sortIndicatorHidden,
                              )}
                            >
                              <Icon
                                name={
                                  sorted === "desc"
                                    ? "chevron-down"
                                    : "chevron-up"
                                }
                                size={12}
                              />
                            </span>
                          )}
                        </span>
                      )}
                      {canResize && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cx(
                            styles.resizeHandle,
                            isResizing && styles.resizeHandleActive,
                          )}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = row.getIsSelected();
              return (
                <tr
                  key={row.id}
                  className={cx(
                    styles.bodyRow,
                    isSelected && styles.bodyRowSelected,
                    onRowClick && styles.bodyRowClickable,
                  )}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const column = cell.column;
                    const isPinned = column.getIsPinned() === "left";
                    const isLastPinned =
                      isPinned && column.getIsLastColumn("left");

                    const cellStyle: CSSProperties = {
                      width: column.getSize(),
                    };
                    if (isPinned) {
                      cellStyle.left = column.getStart("left");
                    }

                    return (
                      <td
                        key={cell.id}
                        style={cellStyle}
                        className={cx(
                          styles.bodyCell,
                          isPinned && styles.cellPinned,
                          isLastPinned && styles.pinnedDivider,
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {showCreator && (
              <tr className={styles.creatorRow}>
                <td colSpan={totalCols} className={styles.creatorCell}>
                  {renderCreator ? (
                    renderCreator()
                  ) : (
                    <CreatorButton
                      label={createLabel ?? "Create"}
                      onClick={onCreate}
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className={styles.stateOverlay}>
            {loadingContent ?? "Loading…"}
          </div>
        )}
        {showEmpty && (
          <div className={styles.stateOverlay}>{empty ?? "No rows"}</div>
        )}
      </div>
      {paginationEnabled &&
        (() => {
          const pageCount = table.getPageCount();
          if (paginationHideOnSingle && pageCount <= 1) return null;
          return (
            <div
              className={cx(
                styles.paginationBar,
                styles.paginationBarPosition[paginationPosition],
              )}
            >
              <Pagination
                pageCount={pageCount}
                page={paginationState.pageIndex + 1}
                onPageChange={(nextPage) => {
                  const next = { ...paginationState, pageIndex: nextPage - 1 };
                  if (paginationControlled) {
                    paginationConfig?.onPageChange?.(nextPage);
                  } else {
                    setInternalPagination(next);
                  }
                }}
              />
            </div>
          );
        })()}
    </div>
  );
}

function FirstColumnCell<TData>({
  ctx,
  originalCell,
  enableExpansion,
  renderRowActions,
}: {
  ctx: CellContext<TData, unknown>;
  originalCell: ColumnDef<TData>["cell"];
  enableExpansion: boolean;
  renderRowActions: ((row: TData) => ReactNode) | undefined;
}) {
  const row = ctx.row;
  const canExpand = enableExpansion && row.getCanExpand();
  const indent = enableExpansion ? row.depth * 24 : 0;

  return (
    <div
      className={styles.expandableCell}
      style={{ paddingLeft: `${indent}px` }}
    >
      {enableExpansion &&
        (canExpand ? (
          <button
            type="button"
            aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
            className={styles.expandToggle}
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
          >
            <Icon
              name={row.getIsExpanded() ? "chevron-down" : "chevron-right"}
              size={14}
            />
          </button>
        ) : (
          <span className={styles.expandSpacer} />
        ))}
      <span className={styles.expandableCellContent}>
        {originalCell !== undefined
          ? flexRender(originalCell, ctx)
          : (ctx.getValue() as ReactNode)}
      </span>
      {renderRowActions && (
        <span
          className={styles.rowActions}
          onClick={(e) => e.stopPropagation()}
        >
          {renderRowActions(row.original)}
        </span>
      )}
    </div>
  );
}

function CreatorButton({
  label,
  onClick,
}: {
  label: string;
  onClick: (() => void) | undefined;
}) {
  return (
    <button type="button" className={styles.creatorButton} onClick={onClick}>
      <Icon name="plus" size={14} />
      <span>{label}</span>
    </button>
  );
}
