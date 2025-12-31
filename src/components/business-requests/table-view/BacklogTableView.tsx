/**
 * BacklogTableView - Industry Backlog Table
 * Enhanced data table with drag-and-drop, bulk actions, and keyboard navigation
 * Real-time updates for cross-view synchronization
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, GripVertical, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  IdCell, 
  PriorityCell, 
  SummaryCell,
  EditableStatusCell,
  EditableOwnerCell,
  EditableQuarterCell,
  EditableDepartmentCell,
  AssigneeCell,
  TypeCell
} from './cells';
import { useTableSelection } from './useTableSelection';
import { useTableSort } from './useTableSort';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { DEFAULT_COLUMNS, TableColumn } from './types';
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown';
import { BulkActionsBar } from './BulkActionsBar';

import { TablePagination } from './TablePagination';
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
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
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    return DEFAULT_COLUMNS.map(c => c.key);
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
  
  const handleReorderColumns = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
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

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Get ID at index for keyboard navigation
  const getIdAtIndex = useCallback((index: number) => {
    return paginatedData[index]?.id;
  }, [paginatedData]);

  // Keyboard navigation
  useKeyboardNavigation({
    dataLength: paginatedData.length,
    focusedIndex,
    setFocusedIndex,
    toggleSelection,
    onRowClick,
    getIdAtIndex,
    isEnabled: !isLoading && paginatedData.length > 0,
  });

  // Reset focused index when page changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [currentPage]);

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
      
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success(assignee ? `Assigned to ${assignee}` : 'Unassigned');
    } catch (error) {
      console.error('Failed to update assignee:', error);
      toast.error('Failed to update assignee');
    }
  }, [queryClient]);

  // Handle status update
  const handleStatusUpdate = useCallback(async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ process_step: status })
        .eq('id', requestId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success('Status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  }, [queryClient]);

  // Handle owner update (reporter or business owner)
  const handleOwnerUpdate = useCallback(async (requestId: string, fieldName: string, value: string | null) => {
    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ [fieldName]: value })
        .eq('id', requestId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success(value ? `Updated ${fieldName.replace('_', ' ')}` : `Cleared ${fieldName.replace('_', ' ')}`);
    } catch (error) {
      console.error(`Failed to update ${fieldName}:`, error);
      toast.error(`Failed to update ${fieldName.replace('_', ' ')}`);
    }
  }, [queryClient]);

  // Handle quarter update
  const handleQuarterUpdate = useCallback(async (requestId: string, quarter: string[] | null) => {
    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ planned_quarter: quarter })
        .eq('id', requestId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success(quarter ? 'Quarter updated' : 'Quarter cleared');
    } catch (error) {
      console.error('Failed to update quarter:', error);
      toast.error('Failed to update quarter');
    }
  }, [queryClient]);

  // Handle department update
  const handleDepartmentUpdate = useCallback(async (requestId: string, department: string | null) => {
    try {
      const { error } = await supabase
        .from('business_requests')
        .update({ department })
        .eq('id', requestId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success(department ? 'Department updated' : 'Department cleared');
    } catch (error) {
      console.error('Failed to update department:', error);
      toast.error('Failed to update department');
    }
  }, [queryClient]);

  // Real-time subscription for cross-view synchronization
  useEffect(() => {
    const channel = supabase
      .channel('backlog-table-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_requests'
        },
        (payload) => {
          console.log('Real-time update received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filter and order columns based on visibility and order
  const displayColumns = useMemo(() => {
    const columnsMap = new Map(DEFAULT_COLUMNS.map(c => [c.key, c]));
    return columnOrder
      .filter(key => visibleColumns.has(key))
      .map(key => columnsMap.get(key)!)
      .filter(Boolean);
  }, [visibleColumns, columnOrder]);

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
      case 'type':
        return <TypeCell type="Business Request" />;
      case 'rank':
        return (
          <span className="text-sm font-medium text-foreground">
            {row.rank ?? '—'}
          </span>
        );
      case 'id':
        return <IdCell requestKey={row.request_key || row.id.slice(0, 8)} onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }} />;
      case 'status':
        return (
          <EditableStatusCell 
            status={row.process_step || 'new_request'} 
            requestId={row.id}
            onSave={handleStatusUpdate}
          />
        );
      case 'title':
        return <SummaryCell title={row.title || ''} />;
      case 'priority':
        return <PriorityCell priority={row.priority_tier || null} />;
      case 'reporter':
        return (
          <EditableOwnerCell 
            name={row.requestor_name || row.requestor || null}
            requestId={row.id}
            fieldName="requestor"
            onSave={handleOwnerUpdate}
          />
        );
      case 'assignee':
        return (
          <AssigneeCell 
            name={row.assignee || null} 
            requestId={row.id}
            onSave={handleAssigneeUpdate}
          />
        );
      case 'business_owner':
        return (
          <EditableOwnerCell 
            name={row.business_owner || null}
            requestId={row.id}
            fieldName="business_owner"
            onSave={handleOwnerUpdate}
          />
        );
      case 'department':
        return (
          <EditableDepartmentCell 
            department={row.department || null}
            requestId={row.id}
            onSave={handleDepartmentUpdate}
          />
        );
      case 'quarter':
        return (
          <EditableQuarterCell 
            quarter={row.planned_quarter?.[0] || null}
            requestId={row.id}
            onSave={handleQuarterUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table Container */}
      <div 
        className={cn(
          "flex flex-col flex-1 rounded-[14px] border overflow-hidden",
          "bg-card border-border",
          "shadow-sm"
        )}
      >
        {/* Header Bar - improved light mode visibility */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          "border-border bg-muted/50",
          "dark:bg-[#0f0f0f]"
        )}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              <strong className="font-semibold text-foreground">{totalItems}</strong> {totalItems === 1 ? 'request' : 'requests'}
              {totalItems > pageSize && (
                <span className="ml-1">
                  (showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)})
                </span>
              )}
            </span>
          </div>
          <ColumnVisibilityDropdown
            columns={columnOrder.map(key => DEFAULT_COLUMNS.find(c => c.key === key)!).filter(Boolean)}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumnVisibility}
            onShowAll={showAllColumns}
            onHideAll={hideAllColumns}
            onReorderColumns={handleReorderColumns}
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
                "bg-card dark:bg-[#0f0f0f]"
              )}>
                <tr>
                  <th className={cn(
                    "w-8 px-2 py-3.5 text-left border-b",
                    "border-border"
                  )} />
                  {displayColumns.map(column => {
                    const isActive = sortConfig.column === column.key;
                    return (
                      <th
                        key={column.key}
                        className={cn(
                          "text-left border-b whitespace-nowrap px-4 py-3.5",
                          "text-[11px] uppercase font-semibold tracking-[0.5px]",
                          "border-border",
                          isActive 
                            ? "text-brand-primary" 
                            : "text-muted-foreground",
                          column.sortable && "cursor-pointer hover:text-foreground"
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
                    "border-border"
                  )} />
                </tr>
              </thead>
              <Droppable droppableId="backlog-table">
                {(provided) => (
                  <tbody 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="divide-y divide-border"
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
                    ) : paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={displayColumns.length + 2} className="text-center py-20 text-muted-foreground">
                          No requests found
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, index) => (
                        <Draggable key={row.id} draggableId={row.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              data-row-index={index}
                              className={cn(
                                "transition-colors cursor-pointer",
                                "hover:bg-muted/50 dark:hover:bg-[#262626]/50",
                                selectedIds.has(row.id) && "bg-brand-primary/[0.08] dark:bg-brand-primary/[0.15]",
                                focusedIndex === index && "ring-2 ring-inset ring-brand-primary/50 bg-brand-primary/[0.04]",
                                snapshot.isDragging && "bg-muted dark:bg-[#333333] shadow-lg"
                              )}
                              onMouseEnter={() => setHoveredRowId(row.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                              onClick={() => setFocusedIndex(index)}
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
                                    (hoveredRowId === row.id || focusedIndex === index) ? "opacity-50 hover:opacity-100" : "opacity-0"
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
                              
                              {/* Row actions - visible on hover or focus */}
                              <td 
                                className="px-4 py-3.5 text-right" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={cn(
                                  "flex items-center justify-end gap-1 transition-opacity",
                                  (hoveredRowId === row.id || focusedIndex === index) ? "opacity-100" : "opacity-0"
                                )}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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
        
        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
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

    </div>
  );
}
