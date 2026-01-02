/**
 * Enterprise Grid Hook
 * Bloomberg-grade grid state management with persistence
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import type { Json } from '@/integrations/supabase/types';

// ==================== TYPES ====================

export type SortDirection = 'asc' | 'desc';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'isNull' | 'isNotNull';
export type RowHeight = 'compact' | 'normal' | 'comfortable';

export interface ColumnConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'badge' | 'user' | 'link' | 'actions';
  visible: boolean;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  order: number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  frozen?: boolean;
  align?: 'left' | 'center' | 'right';
  filterOptions?: { label: string; value: string }[];
}

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface FilterConfig {
  id: string;
  column: string;
  operator: FilterOperator;
  value: unknown;
}

export interface GridView {
  id: string;
  name: string;
  isDefault: boolean;
  isShared: boolean;
  columnsConfig: ColumnConfig[];
  sortConfig: SortConfig[];
  filterConfig: FilterConfig[];
  groupBy: string | null;
  rowHeight: RowHeight;
  createdAt: string;
  updatedAt: string;
}

export interface GridState {
  activeViewId: string | null;
  quickFilters: Record<string, unknown>;
  searchQuery: string;
  selectedRowIds: Set<string>;
}

export interface EnterpriseGridConfig {
  gridId: string;
  defaultColumns: ColumnConfig[];
  defaultSort?: SortConfig[];
  persistState?: boolean;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableSort?: boolean;
  enableColumnResize?: boolean;
  enableColumnReorder?: boolean;
  enableBulkSelection?: boolean;
  enableSavedViews?: boolean;
  enableOpenInNewWindow?: boolean;
  searchPlaceholder?: string;
  rowIdField?: string;
}

export interface UseEnterpriseGridReturn {
  // State
  columns: ColumnConfig[];
  sortConfig: SortConfig[];
  filterConfig: FilterConfig[];
  searchQuery: string;
  debouncedSearchQuery: string;
  selectedRowIds: Set<string>;
  activeView: GridView | null;
  views: GridView[];
  rowHeight: RowHeight;
  groupBy: string | null;
  isLoading: boolean;

  // Column operations
  setColumnVisible: (columnId: string, visible: boolean) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  reorderColumns: (sourceId: string, targetId: string) => void;
  resetColumns: () => void;

  // Sort operations
  toggleSort: (columnId: string) => void;
  clearSort: () => void;

  // Filter operations
  addFilter: (filter: Omit<FilterConfig, 'id'>) => void;
  updateFilter: (id: string, updates: Partial<FilterConfig>) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  setQuickFilter: (key: string, value: unknown) => void;

  // Search
  setSearchQuery: (query: string) => void;

  // Selection
  selectRow: (rowId: string) => void;
  deselectRow: (rowId: string) => void;
  toggleRowSelection: (rowId: string) => void;
  selectAllRows: (rowIds: string[]) => void;
  clearSelection: () => void;
  isRowSelected: (rowId: string) => boolean;

  // Views
  saveView: (name: string, isDefault?: boolean, isShared?: boolean) => Promise<void>;
  loadView: (viewId: string) => void;
  deleteView: (viewId: string) => Promise<void>;
  renameView: (viewId: string, newName: string) => Promise<void>;

  // Display
  setRowHeight: (height: RowHeight) => void;
  setGroupBy: (column: string | null) => void;

  // Utils
  openInNewWindow: () => void;
  exportData: (format: 'csv' | 'json') => void;
  getServerFilterParams: () => Record<string, unknown>;
}

// ==================== HELPER FUNCTIONS ====================

function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mapDbViewToGridView(dbView: any): GridView {
  return {
    id: dbView.id,
    name: dbView.name,
    isDefault: dbView.is_default || false,
    isShared: dbView.is_shared || false,
    columnsConfig: dbView.columns_config || [],
    sortConfig: dbView.sort_config || [],
    filterConfig: dbView.filter_config || [],
    groupBy: dbView.group_by || null,
    rowHeight: dbView.row_height || 'normal',
    createdAt: dbView.created_at,
    updatedAt: dbView.updated_at,
  };
}

// ==================== MAIN HOOK ====================

export function useEnterpriseGrid(config: EnterpriseGridConfig): UseEnterpriseGridReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    gridId,
    defaultColumns,
    defaultSort = [],
    persistState = true,
    enableSavedViews = true,
    rowIdField = 'id',
  } = config;

  // Local state
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(defaultSort);
  const [filterConfig, setFilterConfig] = useState<FilterConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [rowHeight, setRowHeightState] = useState<RowHeight>('normal');
  const [groupBy, setGroupByState] = useState<string | null>(null);
  const [quickFilters, setQuickFilters] = useState<Record<string, unknown>>({});

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch saved views
  const { data: views = [], isLoading: viewsLoading } = useQuery({
    queryKey: ['enterprise-grid-views', gridId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('enterprise_grid_views')
        .select('*')
        .eq('grid_id', gridId)
        .or(`user_id.eq.${user.id},is_shared.eq.true`)
        .order('name');

      if (error) throw error;
      return (data || []).map(mapDbViewToGridView);
    },
    enabled: !!user?.id && enableSavedViews,
  });

  // Fetch user's grid state
  const { data: userState, isLoading: stateLoading } = useQuery({
    queryKey: ['enterprise-grid-state', gridId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('enterprise_grid_user_state')
        .select('*')
        .eq('grid_id', gridId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id && persistState,
  });

  // Initialize state from user's saved state
  useEffect(() => {
    if (userState) {
      if (userState.active_view_id) {
        setActiveViewId(userState.active_view_id);
      }
      if (userState.search_query) {
        setSearchQuery(userState.search_query);
      }
      if (userState.quick_filters) {
        setQuickFilters(userState.quick_filters as Record<string, unknown>);
      }
    }
  }, [userState]);

  // Load active view when it changes
  useEffect(() => {
    if (activeViewId && views.length > 0) {
      const view = views.find(v => v.id === activeViewId);
      if (view) {
        setColumns(mergeColumnsWithDefaults(view.columnsConfig, defaultColumns));
        setSortConfig(view.sortConfig);
        setFilterConfig(view.filterConfig);
        setRowHeightState(view.rowHeight);
        setGroupByState(view.groupBy);
      }
    }
  }, [activeViewId, views, defaultColumns]);

  // Merge saved columns with defaults (in case new columns were added)
  function mergeColumnsWithDefaults(savedCols: ColumnConfig[], defaults: ColumnConfig[]): ColumnConfig[] {
    const savedMap = new Map(savedCols.map(c => [c.id, c]));
    const merged = defaults.map(def => {
      const saved = savedMap.get(def.id);
      if (saved) {
        return { ...def, visible: saved.visible, width: saved.width, order: saved.order };
      }
      return def;
    });
    return merged.sort((a, b) => a.order - b.order);
  }

  // Save state mutation
  const saveStateMutation = useMutation({
    mutationFn: async (state: Partial<{
      activeViewId: string | null;
      searchQuery: string;
      quickFilters: Record<string, unknown>;
    }>) => {
      if (!user?.id || !persistState) return;

      const { error } = await supabase
        .from('enterprise_grid_user_state')
        .upsert([{
          user_id: user.id,
          grid_id: gridId,
          active_view_id: state.activeViewId,
          search_query: state.searchQuery || '',
          quick_filters: (state.quickFilters || {}) as Json,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'user_id,grid_id',
        });

      if (error) throw error;
    },
  });

  // Debounced state persistence
  useEffect(() => {
    if (persistState && user?.id) {
      const timeout = setTimeout(() => {
        saveStateMutation.mutate({
          activeViewId,
          searchQuery: debouncedSearchQuery,
          quickFilters,
        });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [activeViewId, debouncedSearchQuery, quickFilters, persistState, user?.id]);

  // Column operations
  const setColumnVisible = useCallback((columnId: string, visible: boolean) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, visible } : c));
  }, []);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, width: Math.max(c.minWidth || 50, Math.min(c.maxWidth || 500, width)) } : c));
  }, []);

  const reorderColumns = useCallback((sourceId: string, targetId: string) => {
    setColumns(prev => {
      const newCols = [...prev];
      const sourceIdx = newCols.findIndex(c => c.id === sourceId);
      const targetIdx = newCols.findIndex(c => c.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const [removed] = newCols.splice(sourceIdx, 1);
      newCols.splice(targetIdx, 0, removed);
      return newCols.map((c, i) => ({ ...c, order: i }));
    });
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(defaultColumns);
  }, [defaultColumns]);

  // Sort operations
  const toggleSort = useCallback((columnId: string) => {
    setSortConfig(prev => {
      const existing = prev.find(s => s.column === columnId);
      if (!existing) {
        return [{ column: columnId, direction: 'asc' }];
      }
      if (existing.direction === 'asc') {
        return [{ column: columnId, direction: 'desc' }];
      }
      return [];
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig([]);
  }, []);

  // Filter operations
  const addFilter = useCallback((filter: Omit<FilterConfig, 'id'>) => {
    setFilterConfig(prev => [...prev, { ...filter, id: generateFilterId() }]);
  }, []);

  const updateFilter = useCallback((id: string, updates: Partial<FilterConfig>) => {
    setFilterConfig(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilterConfig(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterConfig([]);
    setQuickFilters({});
  }, []);

  const setQuickFilter = useCallback((key: string, value: unknown) => {
    setQuickFilters(prev => {
      if (value === undefined || value === null || value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  // Selection operations
  const selectRow = useCallback((rowId: string) => {
    setSelectedRowIds(prev => new Set(prev).add(rowId));
  }, []);

  const deselectRow = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const selectAllRows = useCallback((rowIds: string[]) => {
    setSelectedRowIds(new Set(rowIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const isRowSelected = useCallback((rowId: string) => {
    return selectedRowIds.has(rowId);
  }, [selectedRowIds]);

  // View operations
  const saveView = useCallback(async (name: string, isDefault = false, isShared = false) => {
    if (!user?.id) {
      toast.error('You must be logged in to save views');
      return;
    }

    try {
      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('enterprise_grid_views')
          .update({ is_default: false })
          .eq('grid_id', gridId)
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('enterprise_grid_views')
        .upsert([{
          user_id: user.id,
          grid_id: gridId,
          name,
          is_default: isDefault,
          is_shared: isShared,
          columns_config: columns as unknown as Json,
          sort_config: sortConfig as unknown as Json,
          filter_config: filterConfig as unknown as Json,
          group_by: groupBy,
          row_height: rowHeight,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'user_id,grid_id,name',
        })
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['enterprise-grid-views', gridId] });
      setActiveViewId(data.id);
      toast.success(`View "${name}" saved`);
    } catch (error) {
      console.error('Error saving view:', error);
      toast.error('Failed to save view');
    }
  }, [user?.id, gridId, columns, sortConfig, filterConfig, groupBy, rowHeight, queryClient]);

  const loadView = useCallback((viewId: string) => {
    setActiveViewId(viewId);
  }, []);

  const deleteView = useCallback(async (viewId: string) => {
    try {
      const { error } = await supabase
        .from('enterprise_grid_views')
        .delete()
        .eq('id', viewId);

      if (error) throw error;

      if (activeViewId === viewId) {
        setActiveViewId(null);
        setColumns(defaultColumns);
        setSortConfig(defaultSort);
        setFilterConfig([]);
      }

      queryClient.invalidateQueries({ queryKey: ['enterprise-grid-views', gridId] });
      toast.success('View deleted');
    } catch (error) {
      console.error('Error deleting view:', error);
      toast.error('Failed to delete view');
    }
  }, [activeViewId, defaultColumns, defaultSort, gridId, queryClient]);

  const renameView = useCallback(async (viewId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('enterprise_grid_views')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', viewId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['enterprise-grid-views', gridId] });
      toast.success('View renamed');
    } catch (error) {
      console.error('Error renaming view:', error);
      toast.error('Failed to rename view');
    }
  }, [gridId, queryClient]);

  // Display operations
  const setRowHeight = useCallback((height: RowHeight) => {
    setRowHeightState(height);
  }, []);

  const setGroupBy = useCallback((column: string | null) => {
    setGroupByState(column);
  }, []);

  // Utils
  const openInNewWindow = useCallback(() => {
    const params = new URLSearchParams();
    params.set('gridId', gridId);
    if (activeViewId) params.set('viewId', activeViewId);
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    
    const url = `${window.location.pathname}?${params.toString()}`;
    window.open(url, '_blank', 'width=1200,height=800');
  }, [gridId, activeViewId, debouncedSearchQuery]);

  const exportData = useCallback((format: 'csv' | 'json') => {
    // This will be called by the parent component with actual data
    toast.info(`Export to ${format.toUpperCase()} - implement in parent component`);
  }, []);

  // Generate server filter params for API calls
  const getServerFilterParams = useCallback(() => {
    const params: Record<string, unknown> = {};

    // Search
    if (debouncedSearchQuery) {
      params.search = debouncedSearchQuery;
    }

    // Sort
    if (sortConfig.length > 0) {
      params.sortBy = sortConfig[0].column;
      params.sortDirection = sortConfig[0].direction;
    }

    // Filters
    filterConfig.forEach(f => {
      params[`filter_${f.column}_${f.operator}`] = f.value;
    });

    // Quick filters
    Object.entries(quickFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });

    return params;
  }, [debouncedSearchQuery, sortConfig, filterConfig, quickFilters]);

  // Find active view
  const activeView = useMemo(() => {
    if (!activeViewId) return null;
    return views.find(v => v.id === activeViewId) || null;
  }, [activeViewId, views]);

  const isLoading = viewsLoading || stateLoading;

  return {
    // State
    columns,
    sortConfig,
    filterConfig,
    searchQuery,
    debouncedSearchQuery,
    selectedRowIds,
    activeView,
    views,
    rowHeight,
    groupBy,
    isLoading,

    // Column operations
    setColumnVisible,
    setColumnWidth,
    reorderColumns,
    resetColumns,

    // Sort operations
    toggleSort,
    clearSort,

    // Filter operations
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    setQuickFilter,

    // Search
    setSearchQuery,

    // Selection
    selectRow,
    deselectRow,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    isRowSelected,

    // Views
    saveView,
    loadView,
    deleteView,
    renameView,

    // Display
    setRowHeight,
    setGroupBy,

    // Utils
    openInNewWindow,
    exportData,
    getServerFilterParams,
  };
}

// Types are exported at definition
