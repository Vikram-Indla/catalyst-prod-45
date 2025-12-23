/**
 * BacklogTableView - Industry Backlog Table
 * Enhanced data table with drag-and-drop, bulk actions, and keyboard navigation
 */

import { useMemo, useCallback, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, GripVertical, Pencil, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  IdCell, 
  StatusCell,
  OwnerCell,
  AssigneeCell,
  PriorityCell, 
  QuarterCell, 
  SummaryCell 
} from './cells';
import { useTableSelection } from './useTableSelection';
import { useTableSort } from './useTableSort';
import { DEFAULT_COLUMNS, TableColumn } from './types';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
import { BulkActionsBar } from './BulkActionsBar';
import { KeyboardHints } from './KeyboardHints';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
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
  department?: string | null;
  created_at?: string | null;
}

interface BacklogTableViewProps {
  data: BusinessRequestRow[];
  isLoading?: boolean;
  onRowClick: (requestId: string) => void;
}

export function BacklogTableView({ data, isLoading, onRowClick }: BacklogTableViewProps) {
  const queryClient = useQueryClient();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
        case 'status': aVal = a.process_step || ''; bVal = b.process_step || ''; break;
        case 'score': aVal = a.business_score || 0; bVal = b.business_score || 0; break;
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

  // Handle drag end
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

  // Handle assignee update
  const handleAssigneeUpdate = useCallback(async (requestId: string, assignee: string | null) => {
    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ assignee })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Invalidate all business-requests queries (handles different search query keys)
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success(assignee ? `Assigned to ${assignee}` : 'Unassigned');
    } catch (error) {
      console.error('Failed to update assignee:', error);
      toast.error('Failed to update assignee');
    }
  }, [queryClient]);

  // Filter columns based on visibility
  const displayColumns = useMemo(() => {
    return DEFAULT_COLUMNS.filter(c => visibleColumns.has(c.key));
  }, [visibleColumns]);

  const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;
    const isActive = sortConfig.column === column.key;
    return (
      <span className={cn("ml-1", isActive ? "text-[var(--brand-gold)]" : "text-muted-foreground/40")}>
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
            className="data-[state=checked]:bg-[var(--brand-gold)] data-[state=checked]:border-[var(--brand-gold)]"
          />
        );
      case 'id':
        return <IdCell requestKey={row.request_key || row.id.slice(0, 8)} onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }} />;
      case 'status':
        return <StatusCell status={row.process_step || 'new'} />;
      case 'title':
        return <SummaryCell title={row.title || ''} />;
      case 'priority':
        return <PriorityCell priority={row.priority_tier || null} />;
      case 'reporter':
        return <OwnerCell name={row.requestor_name || row.requestor || null} />;
      case 'assignee':
        return (
          <AssigneeCell 
            name={row.assignee || null} 
            requestId={row.id}
            onSave={handleAssigneeUpdate}
          />
        );
      case 'business_owner':
        return <OwnerCell name={row.business_owner || null} />;
      case 'department':
        return <span className="text-sm text-foreground truncate block max-w-full">{row.department || '—'}</span>;
      case 'quarter':
        return <QuarterCell quarter={row.planned_quarter?.[0] || null} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table Container with Industry styling - Dark mode 9.5 grade */}
      <div 
        className={cn(
          "flex flex-col flex-1 rounded-[14px] border overflow-hidden",
          "bg-[var(--industry-bg-card)] border-[var(--industry-border-default)]",
          "dark:bg-[#171717] dark:border-[#404040]"
        )}
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        {/* Header Bar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          "border-[var(--industry-border-default)] bg-[var(--industry-bg-subtle)]",
          "dark:border-[#404040] dark:bg-[#0f0f0f]"
        )}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--industry-text-secondary)] dark:text-gray-300">
              <strong className="font-semibold text-[var(--industry-text-primary)] dark:text-gray-100">{sortedData.length}</strong> {sortedData.length === 1 ? 'request' : 'requests'}
            </span>
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
            <table className="w-full min-w-[1000px] border-collapse text-[13px]">
              {/* Column width definitions to prevent ID wrapping */}
              <colgroup>
                <col style={{ width: '32px' }} />      {/* Drag handle */}
                <col style={{ width: '48px' }} />      {/* Checkbox */}
                <col style={{ width: '100px' }} />     {/* ID - prevent wrapping */}
                {/* Dynamic columns */}
              </colgroup>
              <thead className={cn(
                "sticky top-0 z-10",
                "bg-[var(--industry-bg-card)] dark:bg-[#0f0f0f]"
              )}>
                <tr>
                  <th className={cn(
                    "w-8 px-2 py-3.5 text-left border-b",
                    "border-[var(--industry-border-default)] dark:border-[#404040]"
                  )} />
                  {displayColumns.map(column => {
                    const isActive = sortConfig.column === column.key;
                    return (
                      <th
                        key={column.key}
                        className={cn(
                          "text-left border-b whitespace-nowrap px-4 py-3.5",
                          "text-[11px] uppercase font-semibold tracking-[0.5px]",
                          "border-[var(--industry-border-default)] dark:border-[#404040]",
                          isActive 
                            ? "text-[var(--brand-gold)] dark:text-[#d4a855]" 
                            : "text-[var(--industry-text-muted)] dark:text-gray-400",
                          column.sortable && "cursor-pointer hover:text-[var(--industry-text-secondary)] dark:hover:text-gray-300"
                        )}
                        style={{ width: column.width, minWidth: column.minWidth }}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        {column.key === 'checkbox' ? (
                          <Checkbox
                            checked={isAllSelected || (isIndeterminate ? 'indeterminate' : false)}
                            onCheckedChange={() => toggleAll()}
                            className={cn(
                              "data-[state=checked]:bg-[var(--brand-gold)] data-[state=checked]:border-[var(--brand-gold)]",
                              "border-gray-300 dark:border-gray-500 dark:bg-[#262626]"
                            )}
                          />
                        ) : (
                          <div className="flex items-center">
                            <span className={cn(isActive && "border-b-2 border-[var(--brand-gold)] dark:border-[#d4a855] pb-0.5")}>
                              {column.label}
                            </span>
                            {renderSortIcon(column)}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  {/* Actions column header */}
                  <th className={cn(
                    "w-[100px] text-right px-4 py-3.5 border-b",
                    "border-[var(--industry-border-default)] dark:border-[#404040]"
                  )} />
                </tr>
              </thead>
              <Droppable droppableId="backlog-table">
                {(provided) => (
                  <tbody 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="divide-y divide-gray-100 dark:divide-[#404040]"
                  >
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-[var(--industry-border-subtle)] dark:border-[#404040]">
                          <td className="px-2 py-3.5" />
                          {displayColumns.map(col => (
                            <td key={col.key} className="px-4 py-3.5">
                              <Skeleton className="h-5 w-full" />
                            </td>
                          ))}
                          <td className="px-4 py-3.5" />
                        </tr>
                      ))
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={displayColumns.length + 2} className="text-center py-20 text-[var(--industry-text-muted)] dark:text-gray-400">
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
                                "transition-colors cursor-pointer",
                                "hover:bg-[var(--industry-bg-hover)] dark:hover:bg-[#262626]/50",
                                selectedIds.has(row.id) && "bg-[var(--brand-gold)]/[0.08] dark:bg-[#c69c6d]/[0.15]",
                                snapshot.isDragging && "bg-muted dark:bg-[#333333] shadow-lg"
                              )}
                              onMouseEnter={() => setHoveredRowId(row.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                            >
                              {/* Drag handle - visible on hover */}
                              <td
                                {...provided.dragHandleProps}
                                className="px-2 py-3.5 cursor-grab active:cursor-grabbing"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical 
                                  className={cn(
                                    "h-4 w-4 transition-opacity",
                                    hoveredRowId === row.id ? "opacity-50 hover:opacity-100" : "opacity-0"
                                  )} 
                                />
                              </td>
                              
                              {displayColumns.map(column => (
                                <td
                                  key={column.key}
                                  className="px-4 py-3.5"
                                  onClick={column.key === 'checkbox' ? (e) => e.stopPropagation() : undefined}
                                >
                                  {renderCellContent(column, row, index)}
                                </td>
                              ))}
                              
                              {/* Row actions - visible on hover */}
                              <td 
                                className="px-4 py-3.5 text-right" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={cn(
                                  "flex items-center justify-end gap-1 transition-opacity",
                                  hoveredRowId === row.id ? "opacity-100" : "opacity-0"
                                )}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-muted"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              </td>
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

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        onAssignOwner={() => toast.info('Assign Owner feature coming soon')}
        onSetQuarter={() => toast.info('Set Quarter feature coming soon')}
        onApprove={() => toast.info('Approve feature coming soon')}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        selectedCount={selectedIds.size}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (selectedIds.size === 0) return;
          
          setIsDeleting(true);
          try {
            const { error } = await supabase
              .from('business_requests')
              .delete()
              .in('id', Array.from(selectedIds));
            
            if (error) throw error;
            
            toast.success(`Successfully deleted ${selectedIds.size} request${selectedIds.size > 1 ? 's' : ''}`);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['business-requests'] });
            setDeleteDialogOpen(false);
          } catch (error) {
            console.error('Failed to delete requests:', error);
            toast.error('Failed to delete requests');
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      {/* Keyboard Hints */}
      <KeyboardHints />
    </div>
  );
}
