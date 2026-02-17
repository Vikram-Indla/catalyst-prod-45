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
import { Star, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { getPriorityLevel, PRIORITY_THRESHOLDS, UNSCORED_STYLE } from '@/types/initiative';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';
import { ProgressBar } from './ProgressBar';
import { RelativeDate } from './RelativeDate';

interface InitiativeTableProps {
  data: Initiative[];
  loading?: boolean;
  density: Density;
  onRowClick: (initiative: Initiative) => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onAssigneeChange: (id: string, assigneeId: string) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onSortChange: (sorting: { id: string; desc: boolean }[]) => void;
}

const col = createColumnHelper<Initiative>();

const DENSITY_CONFIG: Record<Density, { rowH: string; text: string; avatarSize: 20 | 24 | 28 }> = {
  compact:     { rowH: 'h-8',  text: 'text-xs',         avatarSize: 20 },
  standard:    { rowH: 'h-10', text: 'text-table-base',  avatarSize: 24 },
  comfortable: { rowH: 'h-12', text: 'text-sm',         avatarSize: 28 },
};

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-400">—</span>;
  const p = getPriorityLevel(score);
  return <span className="font-medium" style={{ color: p.text }}>{score.toFixed(1)}</span>;
}

function isOverdue(dateStr: string | null, status: InitiativeStatus): boolean {
  if (!dateStr) return false;
  if (['delivered', 'closed', 'cancelled'].includes(status)) return false;
  return new Date(dateStr) < new Date();
}

export function InitiativeTable({
  data,
  loading = false,
  density,
  onRowClick,
  onStatusChange,
  onAssigneeChange,
  onFavoriteToggle,
  onSelectionChange,
  onSortChange,
}: InitiativeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const dc = DENSITY_CONFIG[density];

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
      col.display({
        id: 'select',
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded border-zinc-300 accent-blue-600 cursor-pointer"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded border-zinc-300 accent-blue-600 cursor-pointer"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
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
      col.accessor('is_favorited', {
        id: 'favorite',
        size: 32,
        minSize: 32,
        maxSize: 32,
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
        size: 88,
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
        size: 140,
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
        size: 110,
        minSize: 90,
        header: 'Priority',
        cell: ({ row }) => <PriorityBadge score={row.original.computed_score} />,
      }),
      col.accessor('assignee_name', {
        id: 'assignee_name',
        size: 160,
        minSize: 120,
        header: 'Assignee',
        cell: ({ getValue }) => (
          <UserAvatar name={getValue()} size={dc.avatarSize} showName />
        ),
      }),
      col.accessor('department_name', {
        id: 'department_name',
        size: 140,
        minSize: 100,
        header: 'Department',
        cell: ({ getValue }) => (
          <span className="text-zinc-600 truncate">{getValue() || '—'}</span>
        ),
      }),
      col.accessor('target_quarter', {
        id: 'target_quarter',
        size: 100,
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
        cell: ({ getValue, row }) => (
          <RelativeDate
            date={getValue()}
            isOverdue={isOverdue(getValue(), row.original.status)}
          />
        ),
      }),
      col.accessor('computed_score', {
        id: 'computed_score',
        size: 80,
        minSize: 60,
        header: 'Score',
        cell: ({ getValue }) => <ScoreCell score={getValue()} />,
      }),
      col.accessor('progress', {
        id: 'progress',
        size: 100,
        minSize: 80,
        header: 'Progress',
        cell: ({ getValue, row }) => (
          <ProgressBar value={getValue()} status={row.original.status} />
        ),
      }),
      col.accessor('updated_at', {
        id: 'updated_at',
        size: 100,
        minSize: 80,
        header: 'Updated',
        cell: ({ getValue }) => <RelativeDate date={getValue()} />,
      }),
    ],
    [dc.avatarSize, onRowClick, onStatusChange, onFavoriteToggle]
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
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]" style={{ tableLayout: 'fixed' }}>
          {/* Colgroup for widths */}
          <colgroup>
            {table.getVisibleFlatColumns().map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>

          {/* Header */}
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="h-9 bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
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
                      {/* Resize handle */}
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
          <tbody>
            {table.getRowModel().rows.map((row, idx) => {
              const selected = row.getIsSelected();
              const isCancelled = row.original.status === 'cancelled';
              return (
                <tr
                  key={row.id}
                  className={`
                    group/row border-b border-zinc-100 transition-colors cursor-pointer
                    ${dc.rowH} ${dc.text}
                    ${selected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}
                    ${!selected && idx % 2 === 1 ? 'bg-[rgba(250,250,250,0.5)]' : ''}
                    ${!selected ? 'hover:bg-zinc-50' : ''}
                    ${isCancelled ? 'opacity-55' : ''}
                  `}
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 align-middle whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
