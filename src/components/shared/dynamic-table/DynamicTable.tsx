/**
 * DynamicTable — canonical Catalyst dynamic-table molecule.
 *
 * Sandbox-buildable equivalent of Atlassian's @atlaskit/dynamic-table, built on:
 *   • @tanstack/react-table   — column model, sort, visibility, sizing
 *   • @tanstack/react-virtual — virtualized row body
 *   • Radix (shadcn/ui)       — checkbox, tooltip, dropdown
 *
 * This molecule is the single implementation standard for any table surface that
 * needs sort, column visibility, column resize, sticky header, virtualization,
 * row selection, hover affordances, tree expansion, grouped rows, and per-user
 * persistence. It matches Atlaskit DynamicTable's external semantics so call
 * sites can later be swapped to `@atlaskit/dynamic-table` with no prop churn
 * once the registry blocker is resolved.
 */
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnSizingState,
  type Header,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';
import type { DynamicTableColumn, DynamicTableProps, DynamicTableRowGroup } from './types';

const SELECTION_COL_ID = '__select__';
const EXPAND_COL_ID = '__expand__';

const DEFAULT_ROW_HEIGHT = 40;
const COMPACT_ROW_HEIGHT = 36;
const VIRTUALIZE_THRESHOLD = 60;
const HEADER_HEIGHT = 36;

/** Read per-header sort direction for aria-sort. */
function ariaSortFor<TData>(h: Header<TData, unknown>): 'ascending' | 'descending' | 'none' {
  const dir = h.column.getIsSorted();
  if (dir === 'asc') return 'ascending';
  if (dir === 'desc') return 'descending';
  return 'none';
}

/**
 * Flattens groups into a single row array with group-header pseudo-rows.
 * Maintains parity with Atlaskit's `rows` + section semantics.
 *
 * When `sortOrderById` is provided, rows WITHIN each group are re-ordered to
 * follow TanStack's sort state so column-header sort still works in grouped mode.
 */
type FlatRowItem<TData> =
  | { kind: 'group'; group: DynamicTableRowGroup<TData>; collapsed: boolean }
  | { kind: 'row'; data: TData };

function buildFlatRows<TData>(
  groups: DynamicTableRowGroup<TData>[] | undefined,
  data: TData[] | undefined,
  collapsedGroups: Record<string, boolean>,
  getRowId: (row: TData) => string,
  sortOrderById?: Map<string, number>
): FlatRowItem<TData>[] {
  if (groups) {
    const out: FlatRowItem<TData>[] = [];
    for (const g of groups) {
      const collapsed = !!collapsedGroups[g.id];
      out.push({ kind: 'group', group: g, collapsed });
      if (collapsed) continue;
      const ordered = sortOrderById
        ? [...g.rows].sort((a, b) => {
            const ai = sortOrderById.get(getRowId(a)) ?? Number.MAX_SAFE_INTEGER;
            const bi = sortOrderById.get(getRowId(b)) ?? Number.MAX_SAFE_INTEGER;
            return ai - bi;
          })
        : g.rows;
      for (const row of ordered) out.push({ kind: 'row', data: row });
    }
    return out;
  }
  return (data ?? []).map((d) => ({ kind: 'row' as const, data: d }));
}

export function DynamicTable<TData>(props: DynamicTableProps<TData>) {
  const {
    tableId,
    columns,
    data,
    groups,
    getRowId,
    onRowClick,
    renderRowActions,
    selectable,
    selection,
    onSelectionChange,
    expandable,
    isRowExpanded,
    onToggleExpand,
    hasChildren,
    sortable,
    sorting: sortingProp,
    onSortingChange,
    resizable,
    columnSizing: sizingProp,
    onColumnSizingChange,
    columnVisibility: visibilityProp,
    onColumnVisibilityChange,
    virtualize,
    rowHeight,
    density = 'default',
    isLoading,
    loadingSkeletonRows = 6,
    error,
    emptyState,
    minTableWidth,
    stickyHeader = true,
    className,
    ariaLabel,
  } = props;

  const effectiveRowHeight = rowHeight ?? (density === 'compact' ? COMPACT_ROW_HEIGHT : DEFAULT_ROW_HEIGHT);

  // ─── Internal uncontrolled fallback state ────────────────────────────────
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalSizing, setInternalSizing] = useState<ColumnSizingState>({});
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({});
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const sortingState = sortingProp ?? internalSorting;
  const sizingState = sizingProp ?? internalSizing;
  const visibilityState = visibilityProp ?? internalVisibility;
  const selectionState = selection ?? internalSelection;

  // ─── Compose columns with selection + expand pseudo-columns ──────────────
  const effectiveColumns = useMemo<DynamicTableColumn<TData>[]>(() => {
    const prepend: DynamicTableColumn<TData>[] = [];
    if (selectable) {
      prepend.push({
        id: SELECTION_COL_ID,
        alwaysVisible: true,
        disableResize: true,
        disableSort: true,
        size: 36,
        minSize: 36,
        maxSize: 36,
        align: 'center',
        header: ({ table }) => (
          <span className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              aria-label="Select all rows"
              checked={
                table.getIsAllRowsSelected()
                  ? true
                  : table.getIsSomeRowsSelected()
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            />
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="flex items-center justify-center opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity"
            data-selected={row.getIsSelected()}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              aria-label={`Select row ${row.id}`}
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
            />
          </span>
        ),
      });
    }
    if (expandable) {
      prepend.push({
        id: EXPAND_COL_ID,
        alwaysVisible: true,
        disableResize: true,
        disableSort: true,
        size: 28,
        minSize: 28,
        maxSize: 28,
        align: 'center',
        header: () => null,
        cell: ({ row }) => {
          const rowData = row.original;
          if (!hasChildren || !hasChildren(rowData)) return null;
          const open = isRowExpanded ? isRowExpanded(rowData) : false;
          return (
            <button
              type="button"
              aria-label={open ? 'Collapse row' : 'Expand row'}
              aria-expanded={open}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.(rowData);
              }}
            >
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          );
        },
      });
    }
    return [...prepend, ...columns];
  }, [columns, selectable, expandable, hasChildren, isRowExpanded, onToggleExpand]);

  // ─── TanStack table ─────────────────────────────────────────────────────
  const flatData = useMemo(() => {
    if (groups) return groups.flatMap((g) => g.rows);
    return data ?? [];
  }, [groups, data]);

  const table = useReactTable({
    data: flatData,
    columns: effectiveColumns,
    getRowId: (row) => getRowId(row),
    state: {
      sorting: sortingState,
      columnSizing: sizingState,
      columnVisibility: visibilityState,
      rowSelection: selectionState,
    },
    columnResizeMode: 'onChange',
    enableColumnResizing: !!resizable,
    enableSorting: !!sortable,
    enableRowSelection: !!selectable,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sortingState) : updater;
      onSortingChange ? onSortingChange(next) : setInternalSorting(next);
    },
    onColumnSizingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sizingState) : updater;
      onColumnSizingChange ? onColumnSizingChange(next) : setInternalSizing(next);
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(visibilityState) : updater;
      onColumnVisibilityChange ? onColumnVisibilityChange(next) : setInternalVisibility(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(selectionState) : updater;
      onSelectionChange ? onSelectionChange(next) : setInternalSelection(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
  });

  // ─── Flat item list (rows + group headers) ──────────────────────────────
  const sortedRows = table.getRowModel().rows;
  const sortedRowsById = useMemo(() => {
    const map = new Map<string, Row<TData>>();
    for (const r of sortedRows) map.set(getRowId(r.original), r);
    return map;
  }, [sortedRows, getRowId]);

  const sortOrderById = useMemo(() => {
    const m = new Map<string, number>();
    sortedRows.forEach((r, idx) => m.set(r.id, idx));
    return m;
  }, [sortedRows]);

  const flatItems = useMemo(
    () =>
      buildFlatRows<TData>(
        groups,
        sortedRows.map((r) => r.original),
        collapsedGroups,
        getRowId,
        sortOrderById
      ),
    [groups, sortedRows, collapsedGroups, getRowId, sortOrderById]
  );

  // ─── Virtualization ─────────────────────────────────────────────────────
  const virtualizeActive = virtualize ?? flatItems.length >= VIRTUALIZE_THRESHOLD;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => effectiveRowHeight,
    overscan: 8,
    enabled: virtualizeActive,
  });

  // ─── Group collapse toggle ──────────────────────────────────────────────
  const toggleGroup = useCallback(
    (id: string) => setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] })),
    []
  );

  // ─── Total width for horizontal scroll ──────────────────────────────────
  const headerGroups = table.getHeaderGroups();
  const totalWidth = useMemo(() => {
    return headerGroups[0]?.headers.reduce((sum, h) => sum + h.getSize(), 0) ?? 0;
  }, [headerGroups, sizingState, visibilityState]);
  const resolvedMinWidth = Math.max(minTableWidth ?? 0, totalWidth);

  // ─── Column-template for sticky header alignment ────────────────────────
  const gridColumnTemplate = useMemo(
    () =>
      headerGroups[0]?.headers.map((h) => `${h.getSize()}px`).join(' ') ?? '',
    [headerGroups, sizingState, visibilityState]
  );

  // ─── States: error / loading / empty ────────────────────────────────────
  if (error) {
    return (
      <div role="alert" className={cn('flex h-40 items-center justify-center text-sm text-destructive', className)}>
        Failed to load table: {error.message}
      </div>
    );
  }

  const hasRows = flatItems.some((item) => item.kind === 'row');

  const hasVisibilityMenu = onColumnVisibilityChange !== undefined || visibilityProp !== undefined;

  return (
    <div className={cn('relative h-full w-full', className)}>
      {hasVisibilityMenu && (
        <div className="absolute right-1 top-1 z-30 flex items-center">
          <ColumnVisibilityMenu table={table as unknown as Table<TData>} columns={columns} />
        </div>
      )}
      <div
        ref={scrollRef}
        className="relative h-full w-full overflow-auto"
        role="region"
        aria-label={ariaLabel}
      >
        <div style={{ minWidth: resolvedMinWidth || undefined }}>
        {/* ─── Header ───────────────────────────────────────────────── */}
        <div
          role="row"
          className={cn(
            'grid items-center border-b bg-muted/40',
            stickyHeader && 'sticky top-0 z-20'
          )}
          style={{
            gridTemplateColumns: gridColumnTemplate,
            height: HEADER_HEIGHT,
          }}
        >
          {headerGroups[0]?.headers.map((h) => {
            const col = effectiveColumns.find((c) => c.id === h.column.id);
            const canSort = sortable && !col?.disableSort && h.column.getCanSort();
            const dir = h.column.getIsSorted();
            const align = col?.align ?? 'left';
            return (
              <div
                key={h.id}
                role="columnheader"
                aria-sort={ariaSortFor(h)}
                className={cn(
                  'relative flex h-full items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground',
                  align === 'center' && 'justify-center',
                  align === 'right' && 'justify-end'
                )}
                style={{ minWidth: 0 }}
              >
                {canSort ? (
                  <button
                    type="button"
                    onClick={h.column.getToggleSortingHandler()}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 -mx-1 -my-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                  >
                    <span className="truncate">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </span>
                    {dir === 'asc' ? (
                      <ChevronUp className="h-3 w-3 shrink-0" />
                    ) : dir === 'desc' ? (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    ) : null}
                  </button>
                ) : (
                  <span className="truncate">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </span>
                )}

                {resizable && !col?.disableResize && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={h.getResizeHandler()}
                    onTouchStart={h.getResizeHandler()}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent transition-colors hover:bg-[#3b82f6]/40',
                      h.column.getIsResizing() && 'bg-[#3b82f6]'
                    )}
                  />
                )}
              </div>
            );
          })}

        </div>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <SkeletonBody rows={loadingSkeletonRows} height={effectiveRowHeight} template={gridColumnTemplate} />
        ) : !hasRows ? (
          <div className="flex min-h-[180px] items-center justify-center py-6">{emptyState}</div>
        ) : virtualizeActive ? (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((v) => {
              const item = flatItems[v.index];
              const style: CSSProperties = {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${v.start}px)`,
                height: effectiveRowHeight,
              };
              return renderItem({
                item,
                style,
                getRowKey: getRowId,
                sortedRowsById,
                gridColumnTemplate,
                effectiveRowHeight,
                onRowClick,
                renderRowActions,
                toggleGroup,
              });
            })}
          </div>
        ) : (
          <div>
            {flatItems.map((item, i) => {
              const style: CSSProperties = { height: effectiveRowHeight };
              return renderItem({
                item,
                key: i,
                style,
                getRowKey: getRowId,
                sortedRowsById,
                gridColumnTemplate,
                effectiveRowHeight,
                onRowClick,
                renderRowActions,
                toggleGroup,
              });
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Row renderer (shared between virtualized and non-virtualized modes)
// ────────────────────────────────────────────────────────────────────────
interface RenderItemArgs<TData> {
  item: FlatRowItem<TData>;
  key?: number;
  style: CSSProperties;
  getRowKey: (row: TData) => string;
  sortedRowsById: Map<string, Row<TData>>;
  gridColumnTemplate: string;
  effectiveRowHeight: number;
  onRowClick?: (row: TData) => void;
  renderRowActions?: (row: TData) => React.ReactNode;
  toggleGroup: (id: string) => void;
}

function renderItem<TData>(args: RenderItemArgs<TData>) {
  const {
    item,
    key,
    style,
    getRowKey,
    sortedRowsById,
    gridColumnTemplate,
    effectiveRowHeight,
    onRowClick,
    renderRowActions,
    toggleGroup,
  } = args;

  if (item.kind === 'group') {
    return (
      <GroupHeader
        key={key ?? `group:${item.group.id}`}
        id={item.group.id}
        label={item.group.label}
        count={item.group.rows.length}
        collapsed={item.collapsed}
        onToggle={toggleGroup}
        style={style}
      />
    );
  }
  const rowKey = getRowKey(item.data);
  const tableRow = sortedRowsById.get(rowKey);
  if (!tableRow) return null;
  return (
    <TableRowView
      key={key ?? `row:${rowKey}`}
      row={tableRow}
      style={style}
      gridColumnTemplate={gridColumnTemplate}
      onRowClick={onRowClick}
      renderRowActions={renderRowActions}
      height={effectiveRowHeight}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────
// GroupHeader — collapsible section header
// ────────────────────────────────────────────────────────────────────────
const GroupHeader = memo(function GroupHeader({
  id,
  label,
  count,
  collapsed,
  onToggle,
  style,
}: {
  id: string;
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: (id: string) => void;
  style: CSSProperties;
}) {
  return (
    <div
      role="row"
      aria-expanded={!collapsed}
      className="flex cursor-pointer select-none items-center gap-2 border-b bg-muted/30 px-3 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground hover:bg-muted/50 focus:outline-none"
      style={style}
      tabIndex={0}
      onClick={() => onToggle(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(id);
        }
      }}
    >
      {collapsed ? (
        <ChevronRight className="h-3.5 w-3.5" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
      <span className="ml-1 inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-foreground/80">
        {count}
      </span>
    </div>
  );
});

// ────────────────────────────────────────────────────────────────────────
// TableRowView — individual row
// ────────────────────────────────────────────────────────────────────────
interface TableRowViewProps<TData> {
  row: Row<TData>;
  style: CSSProperties;
  gridColumnTemplate: string;
  onRowClick?: (row: TData) => void;
  renderRowActions?: (row: TData) => React.ReactNode;
  height: number;
}

function TableRowView<TData>({
  row,
  style,
  gridColumnTemplate,
  onRowClick,
  renderRowActions,
  height,
}: TableRowViewProps<TData>) {
  const clickable = !!onRowClick;
  return (
    <div
      role="row"
      aria-selected={row.getIsSelected() || undefined}
      tabIndex={clickable ? 0 : -1}
      className={cn(
        'group relative grid items-center border-b border-border/40 transition-colors',
        clickable && 'cursor-pointer hover:bg-muted/40 focus:bg-muted/50 focus:outline-none'
      )}
      style={{ ...style, gridTemplateColumns: gridColumnTemplate, height }}
      onClick={() => onRowClick?.(row.original)}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          onRowClick?.(row.original);
        }
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const col = cell.column.columnDef as DynamicTableColumn<TData>;
        const align = col.align ?? 'left';
        return (
          <div
            key={cell.id}
            role="cell"
            className={cn(
              'flex h-full min-w-0 items-center gap-1.5 px-2 text-[13px]',
              align === 'center' && 'justify-center',
              align === 'right' && 'justify-end'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </div>
        );
      })}
      {renderRowActions && (
        <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 bg-background/95 pl-2 group-hover:flex group-focus:flex">
          <div className="pointer-events-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {renderRowActions(row.original)}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// SkeletonBody — loading state that preserves column alignment
// ────────────────────────────────────────────────────────────────────────
function SkeletonBody({ rows, height, template }: { rows: number; height: number; template: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid items-center border-b border-border/40"
          style={{ gridTemplateColumns: template, height }}
        >
          {template.split(' ').map((_, c) => (
            <div key={c} className="px-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
