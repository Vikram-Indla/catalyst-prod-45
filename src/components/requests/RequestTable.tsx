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
import { format } from 'date-fns';
import { Star, GripVertical, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { Request, RequestStatus, Density } from '@/types/request';
import { getPriorityLevel } from '@/types/request';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';
import { ProgressBar } from './ProgressBar';
import { RelativeDate } from './RelativeDate';

interface InitiativeTableProps {
  data: Request[];
  loading?: boolean;
  density: Density;
  onRowClick: (request: Request) => void;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onAssigneeChange: (id: string, assigneeId: string) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onSortChange: (sorting: { id: string; desc: boolean }[]) => void;
  onContextMenu?: (e: React.MouseEvent, request: Request) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

const col = createColumnHelper<Request>();

const DENSITY_CONFIG: Record<Density, { rowH: string; text: string; avatarSize: 20 | 24 | 28 }> = {
  compact:     { rowH: 'h-8',  text: 'text-xs',         avatarSize: 20 },
  standard:    { rowH: 'h-10', text: 'text-table-base',  avatarSize: 24 },
  comfortable: { rowH: 'h-12', text: 'text-sm',         avatarSize: 28 },
};

/* Custom checkbox — Fix 16 */
function CustomCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: (e: any) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => { e.stopPropagation(); onChange(e); }}
      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-100"
      style={{
        border: checked || indeterminate ? '1.5px solid var(--cp-blue)' : '1.5px solid #d4d4d8',
        background: checked || indeterminate ? 'var(--cp-blue)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {(checked || indeterminate) && <Check size={11} className="text-white" strokeWidth={3} />}
    </button>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-400">—</span>;
  const p = getPriorityLevel(score);
  return <span className="font-medium" style={{ color: p.text }}>{score.toFixed(1)}</span>;
}

function isOverdue(dateStr: string | null, status: RequestStatus): boolean {
  if (!dateStr) return false;
  if (['delivered', 'closed', 'cancelled'].includes(status)) return false;
  return new Date(dateStr) < new Date();
}

export function RequestTable({
  data,
  loading = false,
  density,
  onRowClick,
  onStatusChange,
  onAssigneeChange,
  onFavoriteToggle,
  onSelectionChange,
  onSortChange,
  onContextMenu,
  onReorder,
}: InitiativeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const dc = DENSITY_CONFIG[density];

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    onReorder?.(result.source.index, result.destination.index);
  }, [onReorder]);

  const handleSortingChange = useCallback(
    (updater: any) => {
      setSorting((old) => {
        const next = typeof updater === 'function' ? updater(old) : updater;
        onSortChange(next);
        return next;
      });
    },
    [onSortChange]
  );

  const handleSelectionChange = useCallback(
    (updater: any) => {
      setRowSelection((old) => {
        const next = typeof updater === 'function' ? updater(old) : updater;
        const ids = Object.keys(next).filter((k) => next[k]);
        onSelectionChange(ids);
        return next;
      });
    },
    [onSelectionChange]
  );

  const columns = useMemo(
    () => [
      /* Checkbox — Fix 16 */
      col.display({
        id: 'select',
        size: 44,
        minSize: 44,
        maxSize: 44,
        enableResizing: false,
        header: ({ table }) => (
          <CustomCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <CustomCheckbox
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      /* Drag handle — Fix 5 */
      col.display({
        id: 'drag',
        size: 28,
        minSize: 28,
        maxSize: 28,
        enableResizing: false,
        header: () => null,
        cell: () => (
          <GripVertical size={14} className="text-zinc-400 opacity-0 group-hover/row:opacity-100 cursor-grab transition-opacity" />
        ),
      }),
      /* Star — Fix 10 */
      col.accessor('is_favorited', {
        id: 'favorite',
        size: 36,
        minSize: 36,
        maxSize: 36,
        enableResizing: false,
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => {
          const fav = row.original.is_favorited;
          return (
            <button
              type="button"
              className="flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(row.original.id, fav);
              }}
            >
              <Star
                size={14}
                className={fav ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 hover:text-amber-300'}
              />
            </button>
          );
        },
      }),
      col.accessor('initiative_key', {
        id: 'initiative_key',
        size: 90,
        minSize: 72,
        header: 'ID',
        cell: ({ getValue, row }) => (
          <button
            type="button"
            className="font-mono text-[12px] font-medium text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original);
            }}
          >
            {getValue()}
          </button>
        ),
      }),
      col.accessor('title', {
        id: 'title',
        size: 320,
        minSize: 240,
        header: 'Title',
        cell: ({ getValue, row }) => (
          <button
            type="button"
            className="text-left font-medium text-zinc-900 truncate max-w-full hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original);
            }}
          >
            {getValue()}
          </button>
        ),
      }),
      col.accessor('status', {
        id: 'status',
        size: 148,
        minSize: 120,
        header: 'Status',
        cell: ({ getValue, row }) => (
          <StatusBadge
            status={getValue()}
            editable
            onChange={(s) => onStatusChange(row.original.id, s)}
          />
        ),
      }),
      col.accessor('computed_score', {
        id: 'priority',
        size: 118,
        minSize: 100,
        header: 'Priority',
        cell: ({ row }) => <PriorityBadge score={row.original.computed_score} />,
      }),
      col.accessor('assignee_name', {
        id: 'assignee_name',
        size: 160,
        minSize: 120,
        header: 'Assignee',
        cell: ({ getValue }) => (
          <UserAvatar name={getValue()} size={24} showName />
        ),
      }),
      col.accessor('department_name', {
        id: 'department_name',
        size: 146,
        minSize: 100,
        header: 'Department',
        cell: ({ getValue }) => (
          <span className="text-zinc-600 truncate">{getValue() || '—'}</span>
        ),
      }),
      col.accessor('target_quarter', {
        id: 'target_quarter',
        size: 96,
        minSize: 80,
        header: 'Quarter',
        cell: ({ getValue }) => (
          <span className="text-zinc-600">{getValue() || '—'}</span>
        ),
      }),
      col.accessor('target_complete', {
        id: 'target_complete',
        size: 128,
        minSize: 100,
        header: 'Target',
        cell: ({ getValue, row }) => {
          const dateStr = getValue();
          if (!dateStr) return <span className="text-zinc-400">—</span>;
          const parsed = new Date(dateStr);
          if (isNaN(parsed.getTime())) return <span className="text-zinc-400">—</span>;
          const overdue = isOverdue(dateStr, row.original.status);
          const formatted = format(parsed, 'MMM dd, yyyy');
          return (
            <span className={`inline-flex items-center gap-1 text-[12px] whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : 'text-zinc-600'}`}>
              {overdue && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M7 6V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7" cy="10.25" r="0.75" fill="currentColor" />
                </svg>
              )}
              {formatted}
            </span>
          );
        },
      }),
      col.accessor('computed_score', {
        id: 'computed_score',
        size: 72,
        minSize: 60,
        header: 'Score',
        cell: ({ getValue }) => <ScoreCell score={getValue()} />,
      }),
      col.accessor('progress', {
        id: 'progress',
        size: 108,
        minSize: 80,
        header: 'Progress',
        cell: ({ getValue, row }) => (
          <ProgressBar value={getValue()} status={row.original.status} />
        ),
      }),
      col.accessor('updated_at', {
        id: 'updated_at',
        size: 88,
        minSize: 80,
        header: 'Updated',
        cell: ({ getValue }) => <RelativeDate date={getValue()} />,
      }),
    ],
    [onRowClick, onStatusChange, onFavoriteToggle]
  );

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
    initialState: {
      columnPinning: { left: ['select', 'drag', 'favorite', 'initiative_key'] },
    },
  });

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Fix 13: bordered rounded container */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'fixed', minWidth: 1320 }}>
            {/* Fix 18: explicit colgroup */}
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 28 }} />
              <col style={{ width: 36 }} />
              <col style={{ width: 90 }} />
              <col />
              <col style={{ width: 148 }} />
              <col style={{ width: 118 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 146 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 128 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 88 }} />
            </colgroup>

            {/* Header — Fix 15: zinc-50 bg */}
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="h-9 border-b border-zinc-200 sticky top-0 z-10" style={{ background: '#fafafa' }}>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className="relative px-3 text-left text-[11px] uppercase font-semibold tracking-[0.05em] text-zinc-500 select-none whitespace-nowrap"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-1 ${canSort ? 'cursor-pointer' : ''}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span
                                className={`transition-opacity ${
                                  sorted ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-50'
                                }`}
                              >
                                {sorted === 'asc' ? (
                                  <ChevronUp size={12} className="text-blue-600" />
                                ) : sorted === 'desc' ? (
                                  <ChevronDown size={12} className="text-blue-600" />
                                ) : (
                                  <ChevronUp size={12} className="text-zinc-400" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-zinc-300 opacity-0 hover:opacity-100 transition-opacity"
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <Droppable droppableId="request-table" type="ROW">
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
                            className={`
                              group/row transition-colors cursor-pointer
                              ${dc.rowH} ${dc.text}
                              ${selected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}
                              ${!selected ? 'hover:bg-zinc-50' : ''}
                              ${isCancelled ? 'opacity-[0.55]' : ''}
                              ${snapshot.isDragging ? 'bg-white shadow-lg opacity-90' : ''}
                            `}
                            style={{
                              ...dragProvided.draggableProps.style,
                              borderBottom: '1px solid #f4f4f5',
                              display: snapshot.isDragging ? 'table' : undefined,
                              tableLayout: snapshot.isDragging ? 'fixed' : undefined,
                              width: snapshot.isDragging ? '100%' : undefined,
                            }}
                            onClick={() => onRowClick(row.original)}
                            onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, row.original); }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ width: cell.column.getSize() }}
                                {...(cell.column.id === 'drag' ? dragProvided.dragHandleProps : {})}
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
