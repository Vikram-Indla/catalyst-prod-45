/**
 * BacklogTableView - Industry Backlog Table
 * Enhanced data table with drag-and-drop, bulk actions, and keyboard navigation
 * Real-time updates for cross-view synchronization
 * 
 * V12 HYBRID PRECISION — styling tokens applied
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, GripVertical, Pencil, Check } from 'lucide-react';
// 2026-04-27 — Notion Features unification: theme label lookup
import { THEME_OPTIONS } from '@/types/business-request';
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
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
  // 2026-04-27 — Notion Features unification
  theme?: string | null;
  stakeholders?: string[] | null;
  targeted_feature?: boolean | null;
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
        // 2026-04-27 — Notion Features unification (theme + targeted_feature sortable)
        case 'theme': aVal = a.theme || ''; bVal = b.theme || ''; break;
        case 'targeted_feature': aVal = a.targeted_feature ? 1 : 0; bVal = b.targeted_feature ? 1 : 0; break;
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
        typedQuery('business_requests')
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
      const { error } = await typedQuery('business_requests')
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
      const { error } = await typedQuery('business_requests')
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
      const { error } = await typedQuery('business_requests')
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
      const { error } = await typedQuery('business_requests')
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
      const { error } = await typedQuery('business_requests')
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

  /* V12 */ const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;
    const isActive = sortConfig.column === column.key;
    return (
      <span className={cn("inline-flex ml-1", isActive ? "text-[#2563EB]" : "text-[#94A3B8]")}>
        {isActive && sortConfig.direction === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
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
            className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]" /* V12 */
            style={{ width: 16, height: 16, borderRadius: 3 }} /* V12 */
          />
        );
      case 'type':
        return <TypeCell type="Business Request" />;
      case 'rank':
        return (
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, fontWeight: 500, color: 'var(--fg-1)' }}> {/* V12 */}
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
      // 2026-04-27 — Notion Features unification cells (read-only for now;
      // editing happens in BusinessRequestDetailModal where Atlaskit pickers live)
      case 'theme': {
        if (!row.theme) return <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>—</span>;
        const m = THEME_OPTIONS.find(t => t.value === row.theme);
        return (
          <span style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }} title={m?.labelEn || row.theme}>
            {m?.label ?? row.theme}
          </span>
        );
      }
      case 'stakeholders': {
        const count = Array.isArray(row.stakeholders) ? row.stakeholders.length : 0;
        if (count === 0) return <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>—</span>;
        return (
          <span
            title={(row.stakeholders ?? []).join(', ')}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 24, height: 20, padding: '0 8px', borderRadius: 10,
              background: '#DEEBFF', color: '#0747A6',
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--cp-font-mono)',
            }}
          >{count}</span>
        );
      }
      case 'targeted_feature':
        return row.targeted_feature
          ? <Check size={14} style={{ color: '#006644' }} aria-label="Targeted" />
          : <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>—</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* V12 Table Container */}
      <div 
        style={{
          border: '1px solid rgba(15, 23, 42, 0.12)', /* V12 */
          borderRadius: 4, /* V12 */
          overflow: 'hidden', /* V12 */
          boxShadow: 'none', /* V12 — remove shadow */
        }}
        className="flex flex-col flex-1 bg-card"
      >
        {/* V12 Header Bar */}
        <div
          className="flex items-center justify-between px-3"
          style={{
            background: '#F1F5F9', /* V12 */
            borderBottom: '1.5px solid rgba(15, 23, 42, 0.12)', /* V12 */
            padding: '8px 12px', /* V12 */
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500, color: 'var(--fg-3)' }}>
              <strong style={{ fontWeight: 650, color: 'var(--fg-1)' }}>{totalItems}</strong> {totalItems === 1 ? 'request' : 'requests'}
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
            <table
              className="w-full min-w-[1000px]"
              style={{ borderCollapse: 'collapse', fontSize: 13 }} /* V12 */
            >
              {/* Column width definitions */}
              <colgroup>
                <col style={{ width: 32 }} />
                <col style={{ width: 48 }} />
                <col style={{ width: 100 }} />
              </colgroup>
              {/* V12 Table Header */}
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  background: '#F1F5F9', /* V12 */
                }}
              >
                <tr style={{ borderBottom: '1.5px solid rgba(15, 23, 42, 0.12)' /* V12 */ }}>
                  {/* V12 Drag handle header */}
                  <th
                    style={{
                      width: 32,
                      padding: '10px 4px', /* V12 */
                      borderBottom: 'none',
                    }}
                  />
                  {displayColumns.map((column, colIdx) => {
                    const isActive = sortConfig.column === column.key;
                    const isCheckbox = column.key === 'checkbox';
                    return (
                      <th
                        key={column.key}
                        style={{
                          padding: isCheckbox ? '10px 4px' : '10px 12px', /* V12 */
                          fontFamily: 'var(--cp-font-body)', /* V12 */
                          fontSize: 11, /* V12 */
                          fontWeight: 650, /* V12 */
                          textTransform: 'uppercase' as const, /* V12 */
                          letterSpacing: '0.06em', /* V12 */
                          color: isActive ? '#2563EB' : '#64748B', /* V12 */
                          whiteSpace: 'nowrap' as const, /* V12 */
                          userSelect: 'none' as const, /* V12 */
                          lineHeight: 1.2, /* V12 */
                          textAlign: isCheckbox ? 'center' as const : 'start' as const, /* V12 RTL-safe */
                          borderInlineStart: colIdx > 0 ? '0.75px solid rgba(15, 23, 42, 0.06)' : 'none', /* V12 */
                          width: isCheckbox ? 44 : column.width,
                          minWidth: column.minWidth,
                          cursor: column.sortable ? 'pointer' : 'default',
                        }}
                        onClick={() => column.sortable && handleSort(column.key)}
                      >
                        {isCheckbox ? (
                          <Checkbox
                            checked={isAllSelected || (isIndeterminate ? 'indeterminate' : false)}
                            onCheckedChange={() => toggleAll()}
                            className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]" /* V12 */
                            style={{ width: 16, height: 16, borderRadius: 3 }} /* V12 */
                          />
                        ) : (
                          <div className="flex items-center">
                            <span>{column.label}</span>
                            {renderSortIcon(column)}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  {/* V12 Actions column header */}
                  <th style={{ width: 100, padding: '10px 12px', textAlign: 'end' as const }} />
                </tr>
              </thead>
              <Droppable droppableId="backlog-table">
                {(provided) => (
                  <tbody 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                  >
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} style={{ height: 50, borderBottom: '0.75px solid rgba(15, 23, 42, 0.06)' /* V12 */ }}>
                          <td style={{ padding: '8px 4px' }} />
                          {displayColumns.map(col => (
                            <td key={col.key} style={{ padding: '8px 12px' }}>
                              <Skeleton className="h-4 w-full" />
                            </td>
                          ))}
                          <td style={{ padding: '8px 12px' }} />
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
                          {(provided, snapshot) => {
                            const isSelected = selectedIds.has(row.id);
                            const isFocused = focusedIndex === index;
                            return (
                              <tr
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                data-row-index={index}
                                aria-selected={isSelected || undefined} /* V12 WCAG */
                                style={{
                                  ...provided.draggableProps.style,
                                  height: 50, /* V12 */
                                  borderBottom: '0.75px solid rgba(15, 23, 42, 0.06)', /* V12 */
                                  transition: 'background 80ms cubic-bezier(0.4, 0, 0.2, 1)', /* V12 */
                                  background: snapshot.isDragging
                                    ? 'rgba(15, 23, 42, 0.08)' /* V12 pressed */
                                    : isSelected
                                      ? 'rgba(37, 99, 235, 0.08)' /* V12 selected */
                                      : 'transparent', /* V12 rest */
                                  cursor: 'pointer',
                                  ...(isFocused ? {
                                    outline: '2px solid #2563EB', /* V12 focus */
                                    outlineOffset: -2,
                                    zIndex: 1,
                                    position: 'relative' as const,
                                  } : {}),
                                }}
                                onMouseEnter={(e) => {
                                  setHoveredRowId(row.id);
                                  /* V12 hover state */
                                  if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)';
                                  } else {
                                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.12)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  setHoveredRowId(null);
                                  /* V12 restore rest/selected */
                                  e.currentTarget.style.background = isSelected
                                    ? 'rgba(37, 99, 235, 0.08)'
                                    : 'transparent';
                                }}
                                onClick={() => setFocusedIndex(index)}
                              >
                                {/* Drag handle */}
                                <td
                                  {...provided.dragHandleProps}
                                  style={{ padding: '8px 4px', cursor: 'grab' }} /* V12 */
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical 
                                    className={cn(
                                      "h-4 w-4 transition-opacity",
                                      (hoveredRowId === row.id || isFocused) ? "opacity-50 hover:opacity-100" : "opacity-0"
                                    )} 
                                    style={{ color: 'var(--fg-3)' }} /* V12 */
                                  />
                                </td>
                                
                                {displayColumns.map((column, colIdx) => (
                                  <td
                                    key={column.key}
                                    style={{
                                      padding: column.key === 'checkbox' ? '8px 4px' : '8px 12px', /* V12 */
                                      fontFamily: 'var(--cp-font-body)', /* V12 */
                                      fontSize: 13, /* V12 */
                                      fontWeight: 400, /* V12 */
                                      color: 'var(--fg-1)', /* V12 */
                                      whiteSpace: 'nowrap' as const, /* V12 */
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: 1.2, /* V12 */
                                      borderInlineStart: colIdx > 0 ? '0.75px solid rgba(15, 23, 42, 0.06)' : 'none', /* V12 */
                                      textAlign: column.key === 'checkbox' ? 'center' as const : 'start' as const, /* V12 */
                                      width: column.key === 'checkbox' ? 44 : undefined,
                                    }}
                                    onClick={column.key === 'checkbox' ? (e) => e.stopPropagation() : undefined}
                                  >
                                    {renderCellContent(column, row, index)}
                                  </td>
                                ))}
                                
                                {/* Row actions */}
                                <td 
                                  style={{ padding: '8px 12px', textAlign: 'end' as const }} /* V12 */
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className={cn(
                                    "flex items-center justify-end gap-1 transition-opacity",
                                    (hoveredRowId === row.id || isFocused) ? "opacity-100" : "opacity-0"
                                  )}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-md"
                                      style={{ background: 'none' }}
                                      onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--fg-3)' }} /* V12 */ />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }}
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
        onStatusUpdate={async (status: string) => {
          const ids = Array.from(selectedIds);
          try {
            const { error } = await typedQuery('business_requests')
              .update({ process_step: status, updated_at: new Date().toISOString() })
              .in('id', ids);
            if (error) throw error;
            toast.success(`Updated ${ids.length} item${ids.length > 1 ? 's' : ''} to ${status.replace(/_/g, ' ')}`);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['business-requests'] });
          } catch (err) {
            console.error('Bulk status update failed:', err);
            toast.error('Failed to update status');
          }
        }}
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
            const { error } = await typedQuery('business_requests')
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