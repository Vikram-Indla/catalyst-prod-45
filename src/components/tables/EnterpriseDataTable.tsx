/**
 * ENTERPRISE DATA TABLE - Catalyst Design System
 * Enterprise-grade, dense, Jira-like table with full token-based theming
 * Features: column resize, reorder, visibility, pinned columns, inline edit, pagination
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  Check, 
  MoreHorizontal, 
  Undo2,
  Columns3,
  X,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================
export type SortDirection = 'asc' | 'desc' | null;

export interface EnterpriseColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  editable?: boolean;
  type?: 'text' | 'number' | 'select' | 'date' | 'multiselect' | 'user';
  options?: { value: string; label: string; color?: string }[];
  filterOptions?: { value: string; label: string }[];
  width?: number;
  minWidth?: number;
  pinned?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface EnterpriseDataTableProps<T extends { id: string }> {
  data: T[];
  columns: EnterpriseColumn<T>[];
  rowKey?: keyof T;
  onRowClick?: (row: T) => void;
  onRowUpdate?: (rowId: string, columnId: string, newValue: any) => Promise<void>;
  onBulkEdit?: (rowIds: string[], updates: Record<string, any>) => Promise<void>;
  onColumnReorder?: (columns: EnterpriseColumn<T>[]) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  onSortChange?: (column: string | null, direction: SortDirection) => void;
  onFilterChange?: (filters: Record<string, string[]>) => void;
  onGroupByChange?: (groupBy: string | null) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showCheckboxes?: boolean;
  showActionsColumn?: boolean;
  enableDragDrop?: boolean;
  onReorder?: (reorderedData: T[], sourceIndex: number, destinationIndex: number) => void;
  droppableId?: string;
  storageKey?: string; // For persisting column widths/order
}

// ============================================================================
// INLINE CELL EDITOR
// ============================================================================
function InlineCellEditor({ 
  value, 
  type, 
  options, 
  onSave, 
  onCancel 
}: {
  value: any;
  type: 'text' | 'number' | 'select' | 'date' | 'multiselect' | 'user';
  options?: { value: string; label: string }[];
  onSave: (val: any) => void;
  onCancel: () => void;
}) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (type !== 'select' && inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      onSave(localValue === '' ? null : (type === 'number' ? Number(localValue) : localValue));
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onSave(e.target.value);
        }}
        onBlur={() => onCancel()}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-[var(--text-sm)] border-2 border-[var(--brand-accent)] rounded bg-[var(--input-bg)] text-[var(--input-text)] outline-none"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onSave(localValue === '' ? null : (type === 'number' ? Number(localValue) : localValue))}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 text-[var(--text-sm)] border-2 border-[var(--brand-accent)] rounded bg-[var(--input-bg)] text-[var(--input-text)] outline-none"
    />
  );
}

// ============================================================================
// COLUMN VISIBILITY POPOVER
// ============================================================================
function ColumnVisibilityPopover<T>({
  columns,
  visibleColumns,
  onToggle,
  onClose,
}: {
  columns: EnterpriseColumn<T>[];
  visibleColumns: Set<string>;
  onToggle: (columnId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredColumns = columns.filter(col => 
    col.header.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-64 bg-[var(--surface-1)] border border-[var(--border-color)] rounded-lg shadow-[var(--shadow-dropdown)] z-50"
    >
      <div className="p-3 border-b border-[var(--divider)]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[var(--text-sm)] bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[var(--text-1)] placeholder:text-[var(--input-placeholder)]"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filteredColumns.map((col) => (
          <label
            key={col.id}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
          >
            <input
              type="checkbox"
              checked={visibleColumns.has(col.id)}
              onChange={() => onToggle(col.id)}
              className="w-4 h-4 accent-[var(--brand-accent)]"
            />
            <span className="text-[var(--text-sm)] text-[var(--text-1)]">{col.header}</span>
          </label>
        ))}
      </div>
      <div className="p-2 border-t border-[var(--divider)] flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[var(--text-sm)] text-[var(--text-1)] hover:bg-[var(--surface-hover)] rounded transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// FILTER POPOVER
// ============================================================================
function FilterPopover<T>({ 
  column, 
  filterValues,
  onApply,
  onClose,
}: { 
  column: EnterpriseColumn<T>;
  filterValues: string[];
  onApply: (values: string[]) => void;
  onClose: () => void;
}) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(filterValues);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleFilterToggle = (value: string) => {
    setSelectedFilters(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  return (
    <div 
      ref={dropdownRef} 
      className="absolute top-full right-0 mt-2 w-60 bg-[var(--surface-1)] border border-[var(--border-color)] rounded-lg shadow-[var(--shadow-dropdown)] z-50"
    >
      <div className="px-3 py-2 border-b border-[var(--divider)]">
        <div className="text-[var(--text-xs)] font-semibold text-[var(--text-2)]">
          Filter by {column.header}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {column.filterOptions?.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-[var(--text-sm)]",
              selectedFilters.includes(opt.value) ? "bg-[var(--accent-muted)]" : "hover:bg-[var(--surface-hover)]"
            )}
          >
            <input
              type="checkbox"
              checked={selectedFilters.includes(opt.value)}
              onChange={() => handleFilterToggle(opt.value)}
              className="w-4 h-4 accent-[var(--brand-accent)]"
            />
            <span className="flex-1 text-[var(--text-1)]">{opt.label}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between px-3 py-2 border-t border-[var(--divider)] bg-[var(--surface-subtle)]">
        <button
          onClick={() => { setSelectedFilters([]); onApply([]); }}
          className="text-[var(--text-sm)] text-[var(--text-2)] hover:text-[var(--text-1)]"
        >
          Clear
        </button>
        <button
          onClick={() => onApply(selectedFilters)}
          className="px-3 py-1 text-[var(--text-sm)] bg-[var(--brand-accent)] text-[var(--btn-primary-text)] rounded hover:bg-[var(--brand-accent-hover)] transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COLUMN HEADER
// ============================================================================
function ColumnHeader<T>({ 
  column, 
  sortConfig, 
  filterValues,
  onSort,
  onFilter,
  onResize,
  isResizing,
}: { 
  column: EnterpriseColumn<T>;
  sortConfig: { column: string | null; direction: SortDirection };
  filterValues: string[];
  onSort: (columnId: string) => void;
  onFilter: (columnId: string, values: string[]) => void;
  onResize: (e: React.MouseEvent) => void;
  isResizing: boolean;
}) {
  const [showFilter, setShowFilter] = useState(false);
  const isSorted = sortConfig.column === column.id;
  const hasFilters = filterValues.length > 0;

  return (
    <div className="relative flex items-center gap-1 group">
      <span 
        className={cn(
          "font-semibold whitespace-nowrap text-[var(--table-header-text)] text-[var(--text-sm)]",
          column.sortable !== false && "cursor-pointer hover:text-[var(--text-1)]"
        )}
        onClick={() => column.sortable !== false && onSort(column.id)}
      >
        {column.header}
      </span>
      
      {column.sortable !== false && (
        <button
          onClick={(e) => { e.stopPropagation(); onSort(column.id); }}
          className={cn(
            "p-0.5 rounded transition-opacity",
            isSorted ? "opacity-100 text-[var(--brand-accent)]" : "opacity-0 group-hover:opacity-50 text-[var(--text-muted)]"
          )}
        >
          {isSorted && sortConfig.direction === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : isSorted && sortConfig.direction === 'desc' ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {column.filterable !== false && column.filterOptions && column.filterOptions.length > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
          className={cn(
            "p-0.5 rounded transition-opacity",
            hasFilters ? "opacity-100 text-[var(--brand-accent)]" : "opacity-0 group-hover:opacity-50 text-[var(--text-muted)]"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          {hasFilters && (
            <span className="ml-0.5 text-[10px] bg-[var(--brand-accent)] text-[var(--btn-primary-text)] rounded-full px-1">
              {filterValues.length}
            </span>
          )}
        </button>
      )}

      {showFilter && column.filterOptions && (
        <FilterPopover
          column={column}
          filterValues={filterValues}
          onApply={(values) => { onFilter(column.id, values); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* Column resize handle */}
      <div
        onMouseDown={onResize}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--brand-accent)] transition-colors",
          isResizing && "bg-[var(--brand-accent)]"
        )}
      />
    </div>
  );
}

// ============================================================================
// PAGINATION CONTROLS
// ============================================================================
function PaginationControls({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--divider)] bg-[var(--surface-subtle)]">
      <div className="text-[var(--text-sm)] text-[var(--text-2)]">
        Showing {start}–{end} of {total}
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onChange(1, Number(e.target.value))}
          className="px-2 py-1 text-[var(--text-sm)] bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[var(--text-1)]"
        >
          {[10, 20, 40, 80].map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(page - 1, pageSize)}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-2)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-[var(--text-sm)] text-[var(--text-1)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onChange(page + 1, pageSize)}
            disabled={page >= totalPages}
            className="p-1.5 rounded hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--text-2)]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ENTERPRISE DATA TABLE COMPONENT
// ============================================================================
export function EnterpriseDataTable<T extends { id: string }>({
  data,
  columns: initialColumns,
  rowKey = 'id' as keyof T,
  onRowClick,
  onRowUpdate,
  onBulkEdit,
  onColumnReorder,
  onColumnResize,
  onColumnVisibilityChange,
  onSortChange,
  onFilterChange,
  onGroupByChange,
  pagination,
  selectedRows = [],
  onSelectionChange,
  showCheckboxes = true,
  showActionsColumn = true,
  enableDragDrop = false,
  onReorder,
  droppableId = 'enterprise-table',
  storageKey,
}: EnterpriseDataTableProps<T>) {
  // State
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: SortDirection }>({ column: null, direction: null });
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [undoStack, setUndoStack] = useState<{ rowId: string; columnId: string; oldValue: any; newValue: any }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(initialColumns.filter(c => !c.hidden).map(c => c.id))
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}-widths`);
      if (saved) return JSON.parse(saved);
    }
    return initialColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.width || 150 }), {});
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  // Refs
  const tableRef = useRef<HTMLTableElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Memoized columns
  const columns = useMemo(() => 
    initialColumns.filter(col => visibleColumns.has(col.id)),
    [initialColumns, visibleColumns]
  );

  const pinnedColumns = useMemo(() => columns.filter(c => c.pinned), [columns]);
  const scrollableColumns = useMemo(() => columns.filter(c => !c.pinned), [columns]);

  // Process data with filters and sort
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([columnId, values]) => {
      if (values && values.length > 0) {
        result = result.filter((row) => {
          const col = columns.find(c => c.id === columnId);
          const cellValue = col && typeof col.accessor === 'function' ? col.accessor(row) : (row as any)[columnId];
          return values.includes(String(cellValue));
        });
      }
    });

    // Apply sort
    if (sortConfig.column && sortConfig.direction) {
      const col = columns.find(c => c.id === sortConfig.column);
      result.sort((a, b) => {
        const aVal = col && typeof col.accessor === 'function' ? col.accessor(a) : (a as any)[sortConfig.column!];
        const bVal = col && typeof col.accessor === 'function' ? col.accessor(b) : (b as any)[sortConfig.column!];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig, columns]);

  // Handlers
  const handleSort = useCallback((columnId: string) => {
    setSortConfig(prev => {
      const newConfig = prev.column !== columnId 
        ? { column: columnId, direction: 'asc' as SortDirection }
        : prev.direction === 'asc' 
          ? { column: columnId, direction: 'desc' as SortDirection }
          : { column: null, direction: null };
      onSortChange?.(newConfig.column, newConfig.direction);
      return newConfig;
    });
  }, [onSortChange]);

  const handleFilter = useCallback((columnId: string, values: string[]) => {
    setFilters(prev => {
      const newFilters = { ...prev, [columnId]: values };
      onFilterChange?.(newFilters);
      return newFilters;
    });
  }, [onFilterChange]);

  const handleCellDoubleClick = useCallback((e: React.MouseEvent, rowId: string, columnId: string) => {
    e.stopPropagation();
    const column = columns.find((c) => c.id === columnId);
    if (column?.editable) {
      setEditingCell({ rowId, columnId });
    }
  }, [columns]);

  const handleCellSave = useCallback(async (rowId: string, columnId: string, newValue: any) => {
    const row = data.find((r) => r.id === rowId);
    if (!row) return;
    
    const col = columns.find(c => c.id === columnId);
    const oldValue = col && typeof col.accessor === 'function' ? col.accessor(row) : (row as any)[columnId];

    setUndoStack((prev) => [...prev.slice(-19), { rowId, columnId, oldValue, newValue }]);
    setEditingCell(null);
    
    if (onRowUpdate) {
      await onRowUpdate(rowId, columnId, newValue);
    }
    
    showToast(`Updated ${columnId}`);
  }, [data, columns, onRowUpdate]);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const lastChange = undoStack[undoStack.length - 1];
    if (onRowUpdate) {
      await onRowUpdate(lastChange.rowId, lastChange.columnId, lastChange.oldValue);
    }
    setUndoStack((prev) => prev.slice(0, -1));
    showToast('Change undone');
  }, [undoStack, onRowUpdate]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setResizingColumn(columnId);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnId] || 150;
  }, [columnWidths]);

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, resizeStartWidth.current + delta);
      setColumnWidths(prev => {
        const updated = { ...prev, [resizingColumn]: newWidth };
        if (storageKey) {
          localStorage.setItem(`${storageKey}-widths`, JSON.stringify(updated));
        }
        return updated;
      });
      onColumnResize?.(resizingColumn, newWidth);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, storageKey, onColumnResize]);

  // Column visibility toggle
  const handleColumnToggle = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      onColumnVisibilityChange?.(columnId, next.has(columnId));
      return next;
    });
  }, [onColumnVisibilityChange]);

  // Selection handlers
  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, rowId: string) => {
    e.stopPropagation();
    if (onSelectionChange) {
      const newSelection = selectedRows.includes(rowId)
        ? selectedRows.filter(id => id !== rowId)
        : [...selectedRows, rowId];
      onSelectionChange(newSelection);
    }
  }, [selectedRows, onSelectionChange]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      onSelectionChange(e.target.checked ? processedData.map(row => row.id) : []);
    }
  }, [processedData, onSelectionChange]);

  // Drag-drop handler
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !onReorder) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    const reordered = Array.from(processedData);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);
    onReorder(reordered, sourceIndex, destinationIndex);
  }, [processedData, onReorder]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Render cell content
  const renderCell = useCallback((row: T, column: EnterpriseColumn<T>) => {
    const value = typeof column.accessor === 'function' 
      ? column.accessor(row) 
      : (row as any)[column.accessor];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

    if (isEditing) {
      return (
        <InlineCellEditor
          value={value}
          type={column.type || 'text'}
          options={column.options}
          onSave={(newValue) => handleCellSave(row.id, column.id, newValue)}
          onCancel={() => setEditingCell(null)}
        />
      );
    }

    if (column.render) {
      return column.render(value, row);
    }

    return (
      <span
        className={cn(
          "block truncate",
          column.editable && "cursor-pointer px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded border border-transparent hover:border-[var(--border-accent)] hover:bg-[var(--accent-muted)] transition-colors"
        )}
        title={column.editable ? 'Double-click to edit' : String(value ?? '')}
      >
        {value ?? '—'}
      </span>
    );
  }, [editingCell, handleCellSave]);

  // Render row
  const renderRow = useCallback((row: T, index: number, dragHandleProps?: any, isDragging?: boolean) => (
    <>
      {enableDragDrop && (
        <td className="px-2 py-2 w-8" {...dragHandleProps}>
          <GripVertical className={cn(
            "h-4 w-4 cursor-grab active:cursor-grabbing",
            isDragging ? "text-[var(--brand-accent)]" : "text-[var(--text-muted)]"
          )} />
        </td>
      )}
      {showCheckboxes && (
        <td className="px-3 py-2 text-center w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRows.includes(row.id)}
            onChange={(e) => handleCheckboxChange(e, row.id)}
            className="w-4 h-4 accent-[var(--brand-accent)]"
          />
        </td>
      )}
      {columns.map((column) => (
        <td
          key={column.id}
          style={{ width: columnWidths[column.id], minWidth: column.minWidth || 80 }}
          className={cn(
            "px-3 py-2 text-[var(--text-base)] text-[var(--text-1)] border-b border-[var(--divider)]",
            column.pinned && "sticky left-0 bg-inherit z-10"
          )}
          onDoubleClick={(e) => handleCellDoubleClick(e, row.id, column.id)}
        >
          {renderCell(row, column)}
        </td>
      ))}
      {showActionsColumn && (
        <td className="px-2 py-2 w-10" onClick={(e) => e.stopPropagation()}>
          <button className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--icon-default)]">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </td>
      )}
    </>
  ), [columns, columnWidths, selectedRows, showCheckboxes, showActionsColumn, enableDragDrop, handleCheckboxChange, handleCellDoubleClick, renderCell]);

  const tableContent = (
    <div className="bg-[var(--surface-1)] border border-[var(--table-border)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
      {/* Table Header Actions */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-[var(--divider)] bg-[var(--surface-subtle)]">
        <div className="relative">
          <button
            onClick={() => setShowColumnPopover(!showColumnPopover)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[var(--text-sm)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-hover)] rounded transition-colors"
          >
            <Columns3 className="w-4 h-4" />
            Columns
          </button>
          {showColumnPopover && (
            <ColumnVisibilityPopover
              columns={initialColumns}
              visibleColumns={visibleColumns}
              onToggle={handleColumnToggle}
              onClose={() => setShowColumnPopover(false)}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full border-collapse text-[var(--text-base)]">
          <thead>
            <tr className="bg-[var(--table-header-bg)]">
              {enableDragDrop && <th className="w-8" />}
              {showCheckboxes && (
                <th className="px-3 py-2.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={processedData.length > 0 && selectedRows.length === processedData.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-[var(--brand-accent)]"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th 
                  key={column.id}
                  style={{ width: columnWidths[column.id], minWidth: column.minWidth || 80 }}
                  className={cn(
                    "px-3 py-2.5 text-left border-b border-[var(--divider)] whitespace-nowrap",
                    column.pinned && "sticky left-0 bg-[var(--table-header-bg)] z-20"
                  )}
                >
                  <ColumnHeader
                    column={column}
                    sortConfig={sortConfig}
                    filterValues={filters[column.id] || []}
                    onSort={handleSort}
                    onFilter={handleFilter}
                    onResize={(e) => handleResizeStart(e, column.id)}
                    isResizing={resizingColumn === column.id}
                  />
                </th>
              ))}
              {showActionsColumn && <th className="w-10" />}
            </tr>
          </thead>
          {enableDragDrop ? (
            <Droppable droppableId={droppableId}>
              {(provided) => (
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {processedData.map((row, index) => (
                    <Draggable key={row.id} draggableId={row.id} index={index}>
                      {(provided, snapshot) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => !editingCell && onRowClick?.(row)}
                          className={cn(
                            "cursor-pointer transition-colors border-b border-[var(--divider)]",
                            snapshot.isDragging 
                              ? "bg-[var(--accent-muted)] shadow-[var(--shadow-md)]" 
                              : selectedRows.includes(row.id) 
                                ? "bg-[var(--table-row-selected)]" 
                                : "bg-[var(--table-row-bg)] hover:bg-[var(--table-row-hover)]"
                          )}
                          style={provided.draggableProps.style}
                        >
                          {renderRow(row, index, provided.dragHandleProps, snapshot.isDragging)}
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              )}
            </Droppable>
          ) : (
            <tbody>
              {processedData.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => !editingCell && onRowClick?.(row)}
                  className={cn(
                    "cursor-pointer transition-colors border-b border-[var(--divider)]",
                    selectedRows.includes(row.id) 
                      ? "bg-[var(--table-row-selected)]" 
                      : "bg-[var(--table-row-bg)] hover:bg-[var(--table-row-hover)]"
                  )}
                >
                  {renderRow(row, index)}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <PaginationControls
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
        />
      )}

      {/* Undo Bar */}
      {undoStack.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-3)] text-[var(--text-1)] rounded-lg shadow-[var(--shadow-lg)] z-50">
          <Undo2 className="w-4 h-4" />
          <span className="text-[var(--text-sm)]">{undoStack.length} unsaved change{undoStack.length !== 1 ? 's' : ''}</span>
          <button 
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-sm)] font-medium bg-[var(--brand-accent)] text-[var(--btn-primary-text)] rounded hover:bg-[var(--brand-accent-hover)] transition-colors"
          >
            Undo (Ctrl+Z)
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-[var(--status-success)] text-[var(--text-inverse)] rounded-lg shadow-[var(--shadow-lg)] z-50">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  );

  if (enableDragDrop) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        {tableContent}
      </DragDropContext>
    );
  }

  return tableContent;
}

export default EnterpriseDataTable;
