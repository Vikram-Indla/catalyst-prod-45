/**
 * InitiativeTable — Data-dense enterprise table with TanStack Table
 * Catalyst V5 Design System
 */

import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type RowSelectionState,
  type ColumnResizeMode,
} from '@tanstack/react-table';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Star, GripVertical, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import {
  StatusCell, PriorityCell, ScoreCell, AssigneeCell,
  DateCell, ProgressCell, EACell, QuarterCell, IDCell,
} from './CellRenderers';

interface Props {
  data: Initiative[];
  loading?: boolean;
  density: Density;
  onRowClick: (initiative: Initiative) => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onSortChange: (sorting: { id: string; desc: boolean }[]) => void;
  onContextMenu?: (e: React.MouseEvent, initiative: Initiative) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

const col = createColumnHelper<Initiative>();

const DENSITY_ROW: Record<Density, string> = {
  compact: 'h-8',
  standard: 'h-10',
  comfortable: 'h-12',
};

function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => { e.stopPropagation(); onChange(e); }}
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
  data, loading = false, density, onRowClick, onStatusChange,
  onFavoriteToggle, onSelectionChange, onSortChange, onContextMenu, onReorder,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const rowH = DENSITY_ROW[density];

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    onReorder?.(result.source.index, result.destination.index);
  }, [onReorder]);

  const handleSortingChange = useCallback((updater: any) => {
    setSorting((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      onSortChange(next);
      return next;
    });
  }, [onSortChange]);

  const handleSelectionChange = useCallback((updater: any) => {
    setRowSelection((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      onSelectionChange(Object.keys(next).filter(k => next[k]));
      return next;
    });
  }, [onSelectionChange]);

  const columns = useMemo(() => [
    col.display({
      id: 'select', size: 40, minSize: 40, maxSize: 40, enableResizing: false,
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
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
    state: { sorting, rowSelection },
    onSortingChange: handleSortingChange,
    onRowSelectionChange: handleSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange' as ColumnResizeMode,
    enableColumnResizing: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-hidden border border-zinc-200 rounded-lg bg-white">
        <div className="overflow-x-auto h-full">
          <table className="w-full" style={{ tableLayout: 'fixed', minWidth: 1400 }}>
            <colgroup>
              {table.getAllColumns().map(column => (
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
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
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
              {(provided) => (
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {table.getRowModel().rows.map((row, idx) => {
                    const selected = row.getIsSelected();
                    const isCancelled = row.original.status === 'cancelled';
                    return (
                      <Draggable key={row.id} draggableId={row.id} index={idx}>
                        {(dragProvided, snapshot) => (
                          <tr
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`
                              group/row transition-colors cursor-pointer ${rowH}
                              ${selected ? 'bg-blue-50/60' : idx % 2 === 0 ? '' : 'bg-zinc-50/50'}
                              ${!selected ? 'hover:bg-blue-50/30' : ''}
                              ${isCancelled ? 'opacity-[0.55]' : ''}
                              ${snapshot.isDragging ? 'bg-white shadow-lg opacity-90' : ''}
                            `}
                            style={{ ...dragProvided.draggableProps.style, borderBottom: '1px solid #f4f4f5' }}
                            onClick={() => onRowClick(row.original)}
                            onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, row.original); }}
                          >
                            {row.getVisibleCells().map(cell => (
                              <td
                                key={cell.id}
                                className="px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ width: cell.column.getSize() }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          </table>
        </div>
      </div>
    </DragDropContext>
  );
}
