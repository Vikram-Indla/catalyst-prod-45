import { useState, useMemo, useCallback, useEffect } from 'react';
import { SortState, FilterState, CatalystColumn, TableState } from '../types';

interface UseTableStateOptions<T extends { id: string }> {
  data: T[];
  columns: CatalystColumn<T>[];
  defaultSort?: SortState[];
  defaultFilters?: FilterState[];
  defaultPage?: number;
  defaultPageSize?: number;
  serverSort?: boolean;
  serverFilter?: boolean;
  serverPagination?: boolean;
  onStateChange?: (state: TableState) => void;
}

export function useTableState<T extends { id: string }>({
  data,
  columns,
  defaultSort = [],
  defaultFilters = [],
  defaultPage = 0,
  defaultPageSize = 25,
  serverSort = false,
  serverFilter = false,
  serverPagination = false,
  onStateChange,
}: UseTableStateOptions<T>) {
  // Sorting state
  const [sorting, setSorting] = useState<SortState[]>(defaultSort);
  
  // Filter state (legacy format for compatibility)
  const [filters, setFilters] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    defaultFilters.forEach(f => {
      if (Array.isArray(f.value)) {
        initial[f.id] = f.value;
      } else {
        initial[f.id] = [f.value];
      }
    });
    return initial;
  });
  
  // Pagination state
  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  
  // Selection state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  
  // Editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  
  // Undo stack
  const [undoStack, setUndoStack] = useState<{ rowId: string; columnId: string; oldValue: any; newValue: any }[]>([]);

  // Process data with filters and sort (client-side only)
  const processedData = useMemo(() => {
    if (serverSort && serverFilter) {
      return data;
    }
    
    let result = [...data];

    // Apply filters (client-side)
    if (!serverFilter) {
      Object.entries(filters).forEach(([columnId, values]) => {
        if (values && values.length > 0) {
          result = result.filter((row) => {
            const col = columns.find(c => c.id === columnId);
            const cellValue = col && typeof col.accessor === 'function' 
              ? col.accessor(row) 
              : (row as any)[columnId];
            return values.includes(String(cellValue));
          });
        }
      });
    }

    // Apply sort (client-side)
    if (!serverSort && sorting.length > 0) {
      const sortState = sorting[0]; // Single sort for now
      const col = columns.find(c => c.id === sortState.id);
      
      result.sort((a, b) => {
        const aVal = col && typeof col.accessor === 'function' 
          ? col.accessor(a) 
          : (a as any)[sortState.id];
        const bVal = col && typeof col.accessor === 'function' 
          ? col.accessor(b) 
          : (b as any)[sortState.id];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortState.desc ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, sorting, columns, serverSort, serverFilter]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (serverPagination) {
      return processedData;
    }
    const start = page * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize, serverPagination]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.ceil(processedData.length / pageSize);
  }, [processedData.length, pageSize]);

  // Handle sort
  const handleSort = useCallback((columnId: string) => {
    setSorting(prev => {
      const existing = prev.find(s => s.id === columnId);
      if (!existing) {
        return [{ id: columnId, desc: false }];
      }
      if (!existing.desc) {
        return [{ id: columnId, desc: true }];
      }
      return [];
    });
  }, []);

  // Handle filter
  const handleFilter = useCallback((columnId: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [columnId]: values }));
    setPage(0); // Reset to first page when filtering
  }, []);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  }, [totalPages]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  }, []);

  // Handle selection
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedRows(ids);
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedData.map(row => row.id));
    } else {
      setSelectedRows([]);
    }
  }, [paginatedData]);

  const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
    setSelectedRows(prev => 
      checked 
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  }, []);

  // Push undo
  const pushUndo = useCallback((rowId: string, columnId: string, oldValue: any, newValue: any) => {
    setUndoStack(prev => [...prev.slice(-19), { rowId, columnId, oldValue, newValue }]);
  }, []);

  // Pop undo
  const popUndo = useCallback(() => {
    if (undoStack.length === 0) return null;
    const lastChange = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    return lastChange;
  }, [undoStack]);

  // Notify state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        sorting,
        filters: Object.entries(filters).map(([id, value]) => ({ id, value })),
        pagination: { pageIndex: page, pageSize },
        selection: selectedRows,
        columnVisibility,
        columnOrder: [],
        columnPinning: { left: [], right: [] },
        columnSizing: {},
        expanded: [],
        grouping: [],
      });
    }
  }, [sorting, filters, page, pageSize, selectedRows, columnVisibility, onStateChange]);

  return {
    // Processed data
    processedData,
    paginatedData,
    totalRows: processedData.length,
    
    // Sorting
    sorting,
    setSorting,
    handleSort,
    
    // Filtering
    filters,
    setFilters,
    handleFilter,
    
    // Pagination
    page,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    
    // Selection
    selectedRows,
    setSelectedRows: handleSelectionChange,
    handleSelectAll,
    handleRowSelect,
    
    // Column visibility
    columnVisibility,
    setColumnVisibility,
    
    // Editing
    editingCell,
    setEditingCell,
    
    // Undo
    undoStack,
    pushUndo,
    popUndo,
  };
}
