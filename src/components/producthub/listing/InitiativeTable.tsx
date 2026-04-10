/**
 * InitiativeTable — LINEAR PRECISION Design with pb-* namespace
 */

import { useMemo, useState, useCallback, useRef, useEffect, Fragment } from 'react';
import type { BRDTask } from '@/hooks/useMDTBacklog';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  createColumnHelper, flexRender,
  type SortingState, type RowSelectionState, type ColumnResizeMode, type VisibilityState,
} from '@tanstack/react-table';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Check, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Star, MoreVertical, Map, LayoutGrid } from 'lucide-react';
import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { STATUS_DISPLAY, getPriorityLevel } from '@/types/initiative';
import type { GroupByField } from '@/components/producthub/listing/ListingToolbar';
import {
  StatusCell, PriorityCell, ScoreCell, AssigneeCell,
  DateCell, ProgressCell, EACell, QuarterCell, IDCell, TypeIconCell,
} from './CellRenderers';
import { InlineCellEditor, EDITABLE_COLUMNS, COLUMN_TO_FIELD } from './InlineCellEditor';
import type { ColumnConfig } from './ColumnManager';
import { RoadmapBadge } from '@/components/producthub/shared/RoadmapBadge';

import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';

interface Props {
  data: Initiative[];
  loading?: boolean;
  density: Density;
  columnConfigs: ColumnConfig[];
  groupBy?: GroupByField;
  brdTasksMap?: Record<string, BRDTask[]>;
  onRowClick: (initiative: Initiative) => void;
  onStatusChange: (id: string, status: InitiativeStatus) => void;
  onFavoriteToggle: (id: string, isFavorited: boolean) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onSortChange: (sorting: { id: string; desc: boolean }[]) => void;
  onContextMenu?: (e: React.MouseEvent, initiative: Initiative) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
  onInlineEdit?: (id: string, field: string, value: string | number | null) => void;
  onPromote?: (initiative: Initiative) => void;
  onRoadmapToggle?: (id: string, currentValue: boolean) => void;
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
  if (groupBy === 'status') return STATUS_DISPLAY[key as InitiativeStatus]?.label ?? key;
  return key;
}

const col = createColumnHelper<Initiative>();

function PBCheckbox({ checked, indeterminate, onToggle }: { checked: boolean; indeterminate?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{
        width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: checked || indeterminate ? '1.5px solid var(--pb-primary)' : '1.5px solid var(--pb-border-strong)',
        background: checked || indeterminate ? 'var(--pb-primary)' : 'transparent',
        cursor: 'pointer', transition: 'all 100ms',
      }}
    >
      {(checked || indeterminate) && <Check size={11} color="#fff" strokeWidth={3} />}
    </button>
  );
}

export function InitiativeTable({
  data, loading = false, density, columnConfigs, groupBy = 'none', brdTasksMap = {}, onRowClick, onStatusChange,
  onFavoriteToggle, onSelectionChange, onSortChange, onContextMenu, onReorder,
  onInlineEdit, onPromote, onRoadmapToggle, focusedRowIndex = -1, onFocusedRowChange,
}: Props) {
  const avatarsByName = useProfileAvatarsByName();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'initiative_key', desc: false }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string; rect: DOMRect } | null>(null);
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
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

  const handleRowSingleClick = useCallback((initiative: Initiative) => {
    if (editingCell) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clickTimerRef.current = null; onRowClick(initiative); }, 250);
  }, [onRowClick, editingCell]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, rowId: string, columnId: string) => {
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
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
      setFlashCell(`${editingCell.rowId}-${editingCell.columnId}`);
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

  useEffect(() => {
    if (focusedRowIndex < 0 || !tbodyRef.current) return;
    const row = tbodyRef.current.querySelector(`[data-row-index="${focusedRowIndex}"]`) as HTMLElement | null;
    if (row && document.activeElement !== row) row.focus({ preventScroll: false });
  }, [focusedRowIndex]);

  const columnVisibility = useMemo<VisibilityState>(() => {
    const vis: VisibilityState = {};
    columnConfigs.forEach(c => { vis[c.id] = c.visible; });
    return vis;
  }, [columnConfigs]);

  const columns = useMemo(() => [
    col.display({
      id: 'select', size: 40, minSize: 40, maxSize: 40, enableResizing: false,
      header: ({ table }) => <PBCheckbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onToggle={() => table.toggleAllRowsSelected()} />,
      cell: ({ row }) => <PBCheckbox checked={row.getIsSelected()} onToggle={() => row.toggleSelected()} />,
    }),
    col.display({
      id: 'roadmap', size: 32, minSize: 32, maxSize: 32, enableResizing: false,
      header: () => <Map size={14} style={{ color: 'var(--pb-ink-muted)' }} />,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRoadmapToggle?.(row.original.id, row.original.on_roadmap ?? false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={row.original.on_roadmap ? 'Remove from Roadmap' : 'Add to Roadmap'}
        >
          <Map size={16} style={{ color: row.original.on_roadmap ? 'var(--pb-primary)' : 'var(--pb-ink-muted)', opacity: row.original.on_roadmap ? 1 : 0.4, transition: 'all 150ms' }} />
        </button>
      ),
    }),
    col.display({
      id: 'type_icon', size: 28, minSize: 28, maxSize: 28, enableResizing: false,
      header: () => <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--cp-text-muted)' }}>Type</span>,
      cell: ({ row }) => <TypeIconCell typeKey={row.original.initiative_type_key} />,
    }),
    col.accessor('initiative_key', {
      id: 'initiative_key', size: 90, minSize: 72, header: 'ID',
      cell: ({ getValue }) => <IDCell value={getValue()} />,
    }),
    col.accessor('title', {
      id: 'title', size: 240, minSize: 200, header: 'Title',
      cell: ({ getValue, row }) => (
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--pb-ink)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.original.is_favorited && <Star size={12} style={{ color: '#F59E0B', fill: '#F59E0B', display: 'inline', marginRight: 4 }} />}
          {getValue()}
        </span>
      ),
    }),
    col.accessor('status', {
      id: 'status', size: 190, minSize: 170, header: 'Status',
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
      cell: ({ row, getValue }) => {
        const name = getValue();
        const directAvatar = (row.original as any).assignee_avatar;
        const url = directAvatar || (name ? avatarsByName.get(name.toLowerCase()) : undefined);
        return <AssigneeCell name={name} avatarUrl={url} />;
      },
    }),
    col.accessor('department_name', {
      id: 'department', size: 150, minSize: 100, header: 'Department',
      cell: ({ getValue }) => <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--pb-ink-secondary)' }}>{getValue() || '—'}</span>,
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
  ], [avatarsByName]);

  const table = useReactTable({
    data, columns,
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

  useEffect(() => { return () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); }; }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 50, display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', borderBottom: '1px solid var(--pb-border)' }}>
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} style={{ height: 12, borderRadius: 4, background: 'var(--pb-surface-tertiary)', width: `${60 + Math.random() * 80}px` }} className="animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '64px 0' }}>
        <LayoutGrid size={48} style={{ color: 'var(--pb-border-strong)' }} />
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--pb-ink)' }}>No initiatives match your filters</h3>
        <p style={{ fontSize: 13, color: 'var(--pb-ink-muted)' }}>Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  const totalSize = table.getTotalSize();

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '0.555556px solid rgba(11, 18, 14, 0.14)', borderRadius: 8, background: 'transparent', boxShadow: 'none' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, scrollbarWidth: 'thin', scrollbarColor: 'var(--pb-border-strong) transparent' }}>
          <table className="pb-table" style={{ tableLayout: 'fixed', width: totalSize, minWidth: '100%' }}>
            <colgroup>
              {table.getVisibleFlatColumns().map(column => (
                <col key={column.id} style={{ width: column.getSize(), minWidth: column.columnDef.minSize }} />
              ))}
            </colgroup>

            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th key={header.id} style={{ width: header.getSize(), minWidth: header.getSize(), color: sorted ? 'var(--pb-primary)' : undefined }}>
                        {header.isPlaceholder ? null : (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: canSort ? 'pointer' : undefined, paddingRight: 8 }}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              sorted
                                ? (sorted === 'asc'
                                  ? <ChevronUp size={12} style={{ color: 'var(--pb-primary)' }} />
                                  : <ChevronDown size={12} style={{ color: 'var(--pb-primary)' }} />)
                                : <ChevronsUpDown size={12} style={{ color: 'var(--pb-border-strong)', opacity: 0 }} className="group-hover/th:opacity-100" />
                            )}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onDoubleClick={() => header.column.resetSize()}
                            onClick={(e) => e.stopPropagation()}
                            className="group/resize"
                            style={{
                              position: 'absolute', right: -3, top: 0, bottom: 0, width: 7,
                              cursor: 'col-resize', userSelect: 'none', touchAction: 'none',
                              zIndex: 20,
                            }}
                          >
                            <div style={{
                              position: 'absolute', left: 3, top: 4, bottom: 4,
                              width: 1, borderRadius: 1,
                              background: header.column.getIsResizing() ? '#93C5FD' : 'transparent',
                              transition: 'background 120ms',
                            }} className="group-hover/resize:!bg-slate-300" />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <Droppable droppableId="initiative-table" type="ROW">
              {(provided) => {
                const rows = table.getRowModel().rows;
                const groupHeaders: globalThis.Map<number, { label: string; count: number }> = new globalThis.Map();
                if (groupBy && groupBy !== 'none') {
                  let lastKey = '';
                  rows.forEach((row, idx) => {
                    const key = getGroupKey(row.original, groupBy);
                    if (key !== lastKey) {
                      let count = 0;
                      for (let j = idx; j < rows.length; j++) {
                        if (getGroupKey(rows[j].original, groupBy) === key) count++; else break;
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
                                <tr style={{ height: 32, background: 'var(--pb-primary-bg)', borderBottom: '1px solid #DBEAFE' }}>
                                  <td colSpan={visibleColCount} style={{ padding: '0 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--pb-primary)' }}>
                                    {groupHeader.label}
                                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--pb-ink-muted)' }}>({groupHeader.count})</span>
                                  </td>
                                </tr>
                              )}
                              <tr
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                tabIndex={0}
                                data-row-index={idx}
                                className={selected ? 'pb-row-selected' : ''}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  opacity: isCancelled ? 0.55 : snapshot.isDragging ? 0.9 : 1,
                                  boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : undefined,
                                  outline: isFocused ? '2px solid var(--pb-primary)' : 'none',
                                  outlineOffset: -2,
                                }}
                                onClick={(e) => {
                                  const target = e.target as HTMLElement;
                                  if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('[data-drag-handle]')) return;
                                  const tasks = brdTasksMap[row.original.id];
                                  if (tasks && tasks.length > 0) {
                                    setExpandedRows(prev => {
                                      const next = new Set(prev);
                                      if (next.has(row.original.id)) next.delete(row.original.id); else next.add(row.original.id);
                                      return next;
                                    });
                                  } else {
                                    handleRowSingleClick(row.original);
                                  }
                                }}
                                onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, row.original); }}
                                onFocus={() => onFocusedRowChange?.(idx)}
                              >
                                {row.getVisibleCells().map((cell, cellIdx) => {
                                  const cellKey = `${row.id}-${cell.column.id}`;
                                  const isFlashing = flashCell === cellKey;
                                  const dragHandleProps = cellIdx === 1 ? dragProvided.dragHandleProps : undefined;
                                  return (
                                    <td
                                      key={cell.id}
                                      className={isFlashing ? 'pb-flash-success' : ''}
                                      style={{ width: cell.column.getSize(), cursor: cellIdx === 1 ? 'grab' : undefined }}
                                      onDoubleClick={(e) => handleDoubleClick(e, row.id, cell.column.id)}
                                      {...dragHandleProps}
                                      data-drag-handle={cellIdx === 1 ? true : undefined}
                                    >
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                  );
                                })}

                                {/* Hover Actions */}
                                <td style={{ position: 'relative', width: 0, padding: 0, border: 'none' }}>
                                  <div className="pb-row-actions" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'var(--pb-surface)', border: '1px solid var(--pb-border)', borderRadius: 'var(--pb-r-md)', padding: '2px 4px', zIndex: 20 }}>
                                    {!row.original.on_roadmap && onPromote && (
                                      <button type="button" className="pb-row-action-btn" style={{ color: 'var(--pb-teal)' }} title="Add to Roadmap"
                                        onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } onPromote(row.original); }}>
                                        <Map size={14} />
                                      </button>
                                    )}
                                    <button type="button" className="pb-row-action-btn" title="Edit"
                                      onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } onRowClick(row.original); }}>
                                      <Pencil size={14} />
                                    </button>
                                    <button type="button" className="pb-row-action-btn" title="Star"
                                      style={{ color: row.original.is_favorited ? '#F59E0B' : undefined }}
                                      onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } onFavoriteToggle(row.original.id, row.original.is_favorited); }}>
                                      <Star size={14} style={row.original.is_favorited ? { fill: '#F59E0B' } : undefined} />
                                    </button>
                                    <button type="button" className="pb-row-action-btn" title="More"
                                      onClick={(e) => { e.stopPropagation(); if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; } onContextMenu?.(e, row.original); }}>
                                      <MoreVertical size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* BRD Sub-rows */}
                              {expandedRows.has(row.original.id) && (brdTasksMap[row.original.id] || []).map((task) => (
                                <tr key={task.issue_key} style={{ height: 32, background: 'var(--pb-surface-secondary)', borderBottom: '1px solid var(--pb-surface-tertiary)' }}>
                                  <td style={{ padding: '8px 12px' }} />
                                  <td style={{ padding: '0 12px 0 40px', fontFamily: 'var(--pb-font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--pb-primary)' }}>
                                    {task.issue_key}
                                  </td>
                                  <td colSpan={2} style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pb-ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {task.summary.replace(/^BRD\s+of\s+/i, '')}
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--pb-r-full)',
                                      fontSize: 10, fontWeight: 500,
                                      background: task.status === 'Done' ? 'var(--pb-success-bg)' : task.status === 'BRD Sign Off' ? 'var(--pb-warning-bg)' : 'var(--pb-surface-tertiary)',
                                      color: task.status === 'Done' ? 'var(--pb-success)' : task.status === 'BRD Sign Off' ? 'var(--pb-warning)' : 'var(--pb-ink-tertiary)',
                                    }}>
                                      {task.status}
                                    </span>
                                  </td>
                                  <td colSpan={visibleColCount - 5} style={{ padding: '8px 12px', fontSize: 12, color: 'var(--pb-ink-muted)' }}>
                                    {task.assignee_display_name || '—'}
                                  </td>
                                </tr>
                              ))}
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
