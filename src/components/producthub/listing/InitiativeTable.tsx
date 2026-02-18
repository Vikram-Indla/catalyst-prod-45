/**
 * InitiativeTable — Data-dense enterprise table with inline editing,
 * column management, hover actions, keyboard navigation
 * Catalyst V5 Design System
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type RowSelectionState,
  type ColumnResizeMode,
  type VisibilityState,
} from '@tanstack/react-table';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Check, ChevronUp, ChevronDown, Pencil, Star, MoreVertical } from 'lucide-react';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import type { GroupByField } from '@/components/producthub/listing/ListingToolbar';
import {
  StatusCell, PriorityCell, ScoreCell, AssigneeCell,
  DateCell, ProgressCell, EACell, QuarterCell, IDCell,
} from './CellRenderers';
import { InlineCellEditor, EDITABLE_COLUMNS, COLUMN_TO_FIELD } from './InlineCellEditor';
import type { ColumnConfig } from './ColumnManager';

interface Props {
  data: Initiative[];
  loading?: boolean;
  density: Density;
  columnConfigs: ColumnConfig[];
  groupBy?: GroupByField;
  onRowClick: (initiative: Initiative) => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onSortChange: (sorting: { id: string; desc: boolean }[]) => void;
  onContextMenu?: (e: React.MouseEvent, initiative: Initiative) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
  onInlineEdit?: (id: string, field: string, value: string | number | null) => void;
  focusedRowIndex?: number;
  onFocusedRowChange?: (index: number) => void;
}

function getGroupKey(item: Initiative, groupBy: GroupByField): string {
  switch (groupBy) {
    case 'status': return item.status;
    case 'priority': return getPriorityLevel(item.computed_score).level;
    case 'department': return item.department_name || 'Unassigned';
    case 'quarter': return item.target_quarter || 'No Quarter';
    case 'assignee': return item.assignee_name || 'Unassigned';
    default: return '';
  }
}

function getGroupLabel(groupBy: GroupByField, key: string): string {
  if (groupBy === 'status') {
    return STATUS_DISPLAY[key as InitiativeStatus]?.label ?? key;
  }
  return key;
}

const col = createColumnHelper<Initiative>();

const DENSITY_ROW: Record<Density, string> = {
  compact: 'h-8',
  standard: 'h-10',
  comfortable: 'h-12',
};

function Checkbox({ checked, indeterminate, onToggle }: { checked: boolean; indeterminate?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      style={{
        border: checked || indeterminate ? '1.5px solid #2563eb' : '1.5px solid #d4d4d8',
        background: checked || indeterminate ? '#2563eb' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {(checked || indeterminate) && <Check size={11} className="text-white" strokeWidth={3} />}
    </button>
  );
}

export function InitiativeTable({
  data, loading = false, density, columnConfigs, groupBy = 'none', onRowClick, onStatusChange,
  onFavoriteToggle, onSelectionChange, onSortChange, onContextMenu, onReorder,
  onInlineEdit, focusedRowIndex = -1, onFocusedRowChange,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string; rect: DOMRect } | null>(null);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const rowH = DENSITY_ROW[density];
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  // Single-click delay to differentiate from double-click
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    onReorder?.(result.source.index, result.destination.index);
  }, [onReorder]);

  const handleSortingChange = useCallback((updater: React.SetStateAction<SortingState>) => {
    setSorting((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      onSortChange(next as { id: string; desc: boolean }[]);
      return next;
    });
  }, [onSortChange]);

  const handleSelectionChange = useCallback((updater: React.SetStateAction<RowSelectionState>) => {
    setRowSelection((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      onSelectionChange(Object.keys(next).filter(k => next[k]));
      return next;
    });
  }, [onSelectionChange]);

  // Delayed single-click handler — cancelled if double-click fires
  const handleRowSingleClick = useCallback((initiative: Initiative) => {
    if (editingCell) return; // Don't open detail while editing
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onRowClick(initiative);
    }, 250);
  }, [onRowClick, editingCell]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, rowId: string, columnId: string) => {
    // Cancel pending single-click
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (!EDITABLE_COLUMNS[columnId]) return;
    e.stopPropagation();
    const td = (e.target as HTMLElement).closest('td');
    if (!td) return;
    setEditingCell({ rowId, columnId, rect: td.getBoundingClientRect() });
  }, []);

  const handleInlineSave = useCallback((value: string | number | null) => {
    if (!editingCell || !onInlineEdit) return;
    const field = COLUMN_TO_FIELD[editingCell.columnId];
    if (field) {
      onInlineEdit(editingCell.rowId, field, value);
      const flashKey = `${editingCell.rowId}-${editingCell.columnId}`;
      setFlashCell(flashKey);
      setTimeout(() => setFlashCell(null), 300);
    }
    setEditingCell(null);
  }, [editingCell, onInlineEdit]);

  const getEditValue = useCallback(() => {
    if (!editingCell) return null;
    const row = data.find(d => d.id === editingCell.rowId);
    if (!row) return null;
    const field = COLUMN_TO_FIELD[editingCell.columnId];
    if (!field) return null;
    return (row as unknown as Record<string, unknown>)[field] as string | number | null;
  }, [editingCell, data]);

  // Move DOM focus when focusedRowIndex changes via keyboard
  useEffect(() => {
    if (focusedRowIndex < 0 || !tbodyRef.current) return;
    const row = tbodyRef.current.querySelector(`[data-row-index="${focusedRowIndex}"]`) as HTMLElement | null;
    if (row && document.activeElement !== row) {
      row.focus({ preventScroll: false });
    }
  }, [focusedRowIndex]);

  // Column visibility from configs
  const columnVisibility = useMemo<VisibilityState>(() => {
    const vis: VisibilityState = {};
    columnConfigs.forEach(c => { vis[c.id] = c.visible; });
    return vis;
  }, [columnConfigs]);

  const columns = useMemo(() => [
    col.display({
      id: 'select', size: 40, minSize: 40, maxSize: 40, enableResizing: false,
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onToggle={() => table.toggleAllRowsSelected()} />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onToggle={() => row.toggleSelected()} />
      ),
    }),
    col.accessor('initiative_key', {
      id: 'initiative_key', size: 90, minSize: 72, header: 'ID',
      cell: ({ getValue }) => <IDCell value={getValue()} />,
    }),
    col.accessor('title', {
      id: 'title', size: 240, minSize: 200, header: 'Title',
      cell: ({ getValue, row }) => (
        <span className="text-[13px] font-medium truncate max-w-full block" style={{ color: '#18181b' }}>
          {row.original.is_favorited && <span className="text-amber-400 mr-1">★</span>}
          {getValue()}
        </span>
      ),
    }),
    col.accessor('status', {
      id: 'status', size: 140, minSize: 120, header: 'Status',
      cell: ({ getValue }) => <StatusCell status={getValue()} />,
    }),
    col.accessor('computed_score', {
      id: 'priority', size: 110, minSize: 90, header: 'Priority',
      cell: ({ getValue }) => <PriorityCell score={getValue()} />,
    }),
    col.accessor('computed_score', {
      id: 'score', size: 70, minSize: 60, header: 'Score',
      cell: ({ getValue }) => <ScoreCell score={getValue()} />,
    }),
    col.accessor('assignee_name', {
      id: 'assignee', size: 150, minSize: 120, header: 'Assignee',
      cell: ({ getValue }) => <AssigneeCell name={getValue()} />,
    }),
    col.accessor('department_name', {
      id: 'department', size: 150, minSize: 100, header: 'Department',
      cell: ({ getValue }) => <span className="text-[12px] truncate" style={{ color: '#52525b' }}>{getValue() || '—'}</span>,
    }),
    col.accessor('target_quarter', {
      id: 'quarter', size: 90, minSize: 80, header: 'Quarter',
      cell: ({ getValue }) => <QuarterCell value={getValue()} />,
    }),
    col.accessor('kickoff_date', {
      id: 'kickoff', size: 105, minSize: 90, header: 'Kickoff',
      cell: ({ getValue }) => <DateCell date={getValue()} />,
    }),
    col.accessor('target_complete', {
      id: 'target', size: 105, minSize: 90, header: 'Target',
      cell: ({ getValue, row }) => <DateCell date={getValue()} status={row.original.status} />,
    }),
    col.accessor('progress', {
      id: 'progress', size: 120, minSize: 100, header: 'Progress',
      cell: ({ getValue, row }) => <ProgressCell value={getValue()} status={row.original.status} />,
    }),
    col.display({
      id: 'ea_review', size: 90, minSize: 80, header: 'EA Review',
      cell: () => <EACell value={null} />,
    }),
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: handleSortingChange,
    onRowSelectionChange: handleSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange' as ColumnResizeMode,
    enableColumnResizing: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  // Cleanup click timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 flex items-center gap-4 px-4 border-b border-zinc-100">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-3 rounded bg-zinc-100 animate-pulse" style={{ width: `${60 + Math.random() * 80}px` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
        <h3 className="text-sm font-semibold" style={{ color: '#18181b' }}>No initiatives match your filters</h3>
        <p className="text-[13px]" style={{ color: '#71717a' }}>Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  // Get the total table width from TanStack (accounts for resize)
  const totalSize = table.getTotalSize();

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-hidden border border-zinc-200 rounded-lg bg-white">
        <div className="overflow-x-auto overflow-y-auto h-full" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4d4d8 transparent' }}>
          <table className="w-full" style={{ tableLayout: 'fixed', minWidth: Math.max(1400, totalSize) }}>
            <colgroup>
              {table.getVisibleFlatColumns().map(column => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>

            {/* Header */}
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="h-9 border-b-2 border-zinc-200 sticky top-0 z-10" style={{ background: '#fafafa' }}>
                  {hg.headers.map(header => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className="relative px-3 text-left text-[11px] uppercase font-semibold tracking-[0.05em] select-none whitespace-nowrap"
                        style={{ color: '#71717a', width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-1 ${canSort ? 'cursor-pointer' : ''}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && sorted && (
                              sorted === 'asc'
                                ? <ChevronUp size={12} className="text-blue-600" />
                                : <ChevronDown size={12} className="text-blue-600" />
                            )}
                          </div>
                        )}
                        {/* Resize handle */}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onDoubleClick={() => header.column.resetSize()}
                            className={`absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize select-none touch-none transition-colors ${
                              header.column.getIsResizing() ? 'bg-blue-600' : 'hover:bg-blue-400'
                            }`}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <Droppable droppableId="initiative-table" type="ROW">
              {(provided) => {
                const rows = table.getRowModel().rows;
                // Compute group boundaries
                const groupHeaders = new Map<number, { label: string; count: number }>();
                if (groupBy && groupBy !== 'none') {
                  let lastKey = '';
                  rows.forEach((row, idx) => {
                    const key = getGroupKey(row.original, groupBy);
                    if (key !== lastKey) {
                      // Count items in this group
                      let count = 0;
                      for (let j = idx; j < rows.length; j++) {
                        if (getGroupKey(rows[j].original, groupBy) === key) count++;
                        else break;
                      }
                      groupHeaders.set(idx, { label: getGroupLabel(groupBy, key), count });
                      lastKey = key;
                    }
                  });
                }
                const visibleColCount = table.getVisibleFlatColumns().length;

                return (
                <tbody ref={(el) => { provided.innerRef(el); (tbodyRef as React.MutableRefObject<HTMLTableSectionElement | null>).current = el; }} {...provided.droppableProps}>
                  {rows.map((row, idx) => {
                    const selected = row.getIsSelected();
                    const isCancelled = row.original.status === 'cancelled';
                    const isFocused = idx === focusedRowIndex;
                    const groupHeader = groupHeaders.get(idx);
                    return (
                      <Draggable key={row.id} draggableId={row.id} index={idx}>
                        {(dragProvided, snapshot) => (
                          <>
                            {groupHeader && (
                              <tr
                                className="h-8"
                                style={{ background: '#f0f4ff', borderBottom: '1px solid #dbeafe' }}
                              >
                                <td
                                  colSpan={visibleColCount}
                                  className="px-4 text-[12px] font-semibold uppercase tracking-wide"
                                  style={{ color: '#1e40af' }}
                                >
                                  {groupHeader.label}
                                  <span className="ml-2 text-[11px] font-normal" style={{ color: '#6b7280' }}>
                                    ({groupHeader.count})
                                  </span>
                                </td>
                              </tr>
                            )}
                            <tr
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              tabIndex={0}
                              data-row-index={idx}
                              className={`
                                group/row transition-colors duration-[80ms] cursor-pointer ${rowH} relative
                                ${selected ? 'bg-blue-50/60' : idx % 2 === 0 ? '' : 'bg-zinc-50/50'}
                                ${!selected ? 'hover:bg-blue-50/30' : ''}
                                ${isCancelled ? 'opacity-[0.55]' : ''}
                                ${snapshot.isDragging ? 'bg-white shadow-lg opacity-90' : ''}
                                ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}
                              `}
                              style={{ ...dragProvided.draggableProps.style, borderBottom: '1px solid #f4f4f5', outline: 'none' }}
                              onClick={() => handleRowSingleClick(row.original)}
                              onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, row.original); }}
                              onFocus={() => onFocusedRowChange?.(idx)}
                            >
                              {row.getVisibleCells().map(cell => {
                                const cellKey = `${row.id}-${cell.column.id}`;
                                const isFlashing = flashCell === cellKey;
                                return (
                                  <td
                                    key={cell.id}
                                    className={`px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200 ${isFlashing ? 'bg-green-50' : ''}`}
                                    style={{ width: cell.column.getSize() }}
                                    onDoubleClick={(e) => handleDoubleClick(e, row.id, cell.column.id)}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </td>
                                );
                              })}

                              {/* Hover Actions */}
                              <td className="absolute right-3 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-100 pointer-events-none group-hover/row:pointer-events-auto"
                                style={{ width: 'auto' }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } onRowClick(row.original); }}
                                  className="w-6 h-6 rounded-sm flex items-center justify-center hover:bg-zinc-200 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={13} className="text-zinc-500" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } onFavoriteToggle(row.original.id, row.original.is_favorited); }}
                                  className="w-6 h-6 rounded-sm flex items-center justify-center hover:bg-zinc-200 transition-colors"
                                  title="Star"
                                >
                                  <Star size={13} className={row.original.is_favorited ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } e.preventDefault(); onContextMenu?.(e, row.original); }}
                                  className="w-6 h-6 rounded-sm flex items-center justify-center hover:bg-zinc-200 transition-colors"
                                  title="More"
                                >
                                  <MoreVertical size={13} className="text-zinc-500" />
                                </button>
                              </td>
                            </tr>
                          </>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
                );
              }}
            </Droppable>
          </table>
        </div>
      </div>

      {/* Inline Editor Portal */}
      {editingCell && (
        <InlineCellEditor
          type={EDITABLE_COLUMNS[editingCell.columnId]}
          value={getEditValue()}
          cellRect={editingCell.rect}
          onSave={handleInlineSave}
          onCancel={() => setEditingCell(null)}
        />
      )}
    </DragDropContext>
  );
}