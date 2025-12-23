/**
 * BacklogTableView - Full-featured data table for business requests
 * With drag-and-drop row reordering that persists rank to database
 */

import { useMemo, useCallback, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RankCell, IdCell, OwnerCell, PriorityCell, QuarterCell, DateCell, TextCell } from './cells';
import { useTableSelection } from './useTableSelection';
import { useTableSort } from './useTableSort';
import { DEFAULT_COLUMNS, TableColumn } from './types';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BusinessRequestRow {
  id: string;
  request_key?: string;
  title?: string;
  process_step?: string;
  priority_tier?: string;
  business_score?: number | null;
  rank?: number | null;
  requestor?: string | null;
  requestor_name?: string | null;
  assignee?: string | null;
  business_owner?: string | null;
  impl_start_date?: string | null;
  end_date?: string | null;
  delivery_platform?: string | null;
  planned_quarter?: string[] | null;
}

interface BacklogTableViewProps {
  data: BusinessRequestRow[];
  isLoading?: boolean;
  onRowClick: (requestId: string) => void;
}

export function BacklogTableView({ data, isLoading, onRowClick }: BacklogTableViewProps) {
  const queryClient = useQueryClient();
  const { 
    selectedIds, 
    isAllSelected, 
    isIndeterminate, 
    toggleSelection, 
    toggleAll,
    clearSelection 
  } = useTableSelection(data.map(d => ({ id: d.id })));
  
  const { sortConfig, handleSort } = useTableSort({ column: 'rank', direction: 'asc' });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    return new Set(DEFAULT_COLUMNS.filter(c => c.visible !== false).map(c => c.key));
  });

  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  }, []);

  const showAllColumns = useCallback(() => {
    setVisibleColumns(new Set(DEFAULT_COLUMNS.map(c => c.key)));
  }, []);

  const hideAllColumns = useCallback(() => {
    // Keep only checkbox visible
    setVisibleColumns(new Set(['checkbox']));
  }, []);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.column) {
        case 'rank': aVal = a.rank || 999; bVal = b.rank || 999; break;
        case 'title': aVal = a.title || ''; bVal = b.title || ''; break;
        case 'priority': aVal = a.priority_tier || ''; bVal = b.priority_tier || ''; break;
        case 'kickoff_date': aVal = a.impl_start_date || ''; bVal = b.impl_start_date || ''; break;
        case 'target_date': aVal = a.end_date || ''; bVal = b.end_date || ''; break;
        case 'reporter': aVal = a.requestor_name || a.requestor || ''; bVal = b.requestor_name || b.requestor || ''; break;
        case 'assignee': aVal = a.assignee || ''; bVal = b.assignee || ''; break;
        case 'business_owner': aVal = a.business_owner || ''; bVal = b.business_owner || ''; break;
        case 'delivery_platform': aVal = a.delivery_platform || ''; bVal = b.delivery_platform || ''; break;
        case 'quarter': aVal = a.planned_quarter?.[0] || ''; bVal = b.planned_quarter?.[0] || ''; break;
        default: aVal = a.rank || 999; bVal = b.rank || 999;
      }
      if (sortConfig.direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [data, sortConfig]);

  // Handle drag end - persist rank changes to database
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source } = result;

    if (!destination || destination.index === source.index) return;

    const reordered = Array.from(sortedData);
    const [removed] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, removed);

    const updates = reordered.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));

    queryClient.setQueryData(['business-requests'], (old: any) => {
      if (!old) return old;
      return old.map((item: any) => {
        const update = updates.find(u => u.id === item.id);
        return update ? { ...item, rank: update.rank } : item;
      });
    });

    try {
      const updatePromises = updates.map((item) =>
        supabase
          .from('business_requests')
          .update({ rank: item.rank })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);
      toast.success('Rank order saved');
    } catch (error) {
      console.error('Failed to save rank order:', error);
      toast.error('Failed to save rank order');
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    }
  }, [sortedData, queryClient]);

  // Filter columns based on visibility
  const displayColumns = useMemo(() => {
    return DEFAULT_COLUMNS.filter(c => visibleColumns.has(c.key));
  }, [visibleColumns]);

  const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;
    const isActive = sortConfig.column === column.key;
    return (
      <span className={cn("ml-1", isActive ? "text-foreground" : "text-muted-foreground/50")}>
        {isActive && sortConfig.direction === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </span>
    );
  };

  const renderCellContent = (column: TableColumn, row: BusinessRequestRow, index: number) => {
    switch (column.key) {
      case 'checkbox':
        return (
          <Checkbox
            checked={selectedIds.has(row.id)}
            onCheckedChange={() => toggleSelection(row.id)}
          />
        );
      case 'rank':
        return <RankCell displayIndex={index + 1} />;
      case 'id':
        return <IdCell requestKey={row.request_key || row.id.slice(0, 8)} onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }} />;
      case 'priority':
        return <PriorityCell priority={row.priority_tier || null} />;
      case 'title':
        return <span className="font-medium text-foreground max-w-[250px] truncate block">{row.title || '—'}</span>;
      case 'kickoff_date':
        return <DateCell date={row.impl_start_date} />;
      case 'target_date':
        return <DateCell date={row.end_date} />;
      case 'reporter':
        return <OwnerCell name={row.requestor_name || row.requestor || null} />;
      case 'assignee':
        return <OwnerCell name={row.assignee || null} />;
      case 'business_owner':
        return <OwnerCell name={row.business_owner || null} />;
      case 'delivery_platform':
        return <TextCell value={row.delivery_platform} />;
      case 'quarter':
        return <QuarterCell quarter={row.planned_quarter?.[0] || null} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      {/* Toolbar with Column Visibility */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 ? (
            <>
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{sortedData.length} items</span>
          )}
        </div>
        <ColumnVisibilityDropdown
          columns={DEFAULT_COLUMNS}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumnVisibility}
          onShowAll={showAllColumns}
          onHideAll={hideAllColumns}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-muted/50">
              <tr>
                <th className="w-8 px-2 py-2.5 text-left border-b border-border" />
                {displayColumns.map(column => (
                  <th
                    key={column.key}
                    className={cn(
                      "text-left font-semibold text-muted-foreground border-b border-border",
                      "whitespace-nowrap px-3 py-2.5",
                      column.sortable && "cursor-pointer hover:text-foreground"
                    )}
                    style={{ width: column.width, minWidth: column.minWidth }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    {column.key === 'checkbox' ? (
                      <Checkbox
                        checked={isAllSelected || (isIndeterminate ? 'indeterminate' : false)}
                        onCheckedChange={() => toggleAll()}
                      />
                    ) : (
                      <div className="flex items-center">
                        {column.label}
                        {renderSortIcon(column)}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <Droppable droppableId="backlog-table">
              {(provided) => (
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-2 py-3" />
                        {displayColumns.map(col => (
                          <td key={col.key} className="px-3 py-3">
                            <Skeleton className="h-5 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sortedData.length === 0 ? (
                    <tr>
                      <td colSpan={displayColumns.length + 1} className="text-center py-16 text-muted-foreground">
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((row, index) => (
                      <Draggable key={row.id} draggableId={row.id} index={index}>
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors",
                              selectedIds.has(row.id) && "bg-[hsl(var(--brand-primary))]/5",
                              snapshot.isDragging && "bg-muted shadow-lg"
                            )}
                            onClick={() => onRowClick(row.id)}
                          >
                            <td
                              {...provided.dragHandleProps}
                              className="px-2 py-3 cursor-grab active:cursor-grabbing"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
                            </td>
                            {displayColumns.map(column => (
                              <td
                                key={column.key}
                                className="px-3 py-3"
                                onClick={column.key === 'checkbox' ? (e) => e.stopPropagation() : undefined}
                              >
                                {renderCellContent(column, row, index)}
                              </td>
                            ))}
                          </tr>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          </table>
        </DragDropContext>
      </div>
    </div>
  );
}
