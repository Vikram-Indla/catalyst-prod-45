import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Filter, Check, X, Pencil, MoreHorizontal, Trash2, Copy, Save, Undo } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// ENTERPRISE TABLE COMPONENT WITH INLINE EDITING
// Based on AG Grid, Jira Align, and MUI DataGrid patterns
// Adapted for Catalyst Golden Hour Design System
// ============================================================================

// Types
export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  editable?: boolean;
  editType?: 'text' | 'number' | 'select' | 'date';
  options?: { value: string; label: string }[]; // For select type
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: { value: string; label: string; count?: number }[];
  renderCell?: (value: any, row: T) => React.ReactNode;
  renderEditCell?: (value: any, onChange: (val: any) => void, row: T) => React.ReactNode;
  validate?: (value: any, row: T) => string | null; // Returns error message or null
}

export interface TableState {
  sortColumn: string | null;
  sortDirection: SortDirection;
  filters: Record<string, string[]>;
  editingCell: { rowId: string; columnId: string } | null;
  editingRow: string | null;
  selectedRows: string[];
  undoStack: { rowId: string; columnId: string; oldValue: any; newValue: any }[];
}

interface EnterpriseTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowUpdate?: (rowId: string, columnId: string, newValue: any) => Promise<void>;
  onRowDelete?: (rowId: string) => Promise<void>;
  onRowClick?: (row: T) => void;
  editMode?: 'cell' | 'row' | 'none';
  enableUndo?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showCheckboxes?: boolean;
  showActionsColumn?: boolean;
}

// ============================================================================
// INLINE CELL EDITOR COMPONENT
// Handles text, number, select, and date inputs
// ============================================================================
function InlineCellEditor<T>({
  value,
  column,
  row,
  onSave,
  onCancel,
}: {
  value: any;
  column: Column<T>;
  row: T;
  onSave: (newValue: any) => void;
  onCancel: () => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      // Could emit event to move to next cell
    }
  };

  const handleSave = () => {
    if (column.validate) {
      const errorMsg = column.validate(localValue, row);
      if (errorMsg) {
        setError(errorMsg);
        return;
      }
    }
    onSave(localValue);
  };

  const baseInputClass = cn(
    "w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-2",
    error 
      ? "border-red-400 focus:ring-red-200" 
      : "border-brand-gold focus:ring-brand-gold/30"
  );

  // Custom render if provided
  if (column.renderEditCell) {
    return column.renderEditCell(localValue, setLocalValue, row);
  }

  // Select editor
  if (column.editType === 'select' && column.options) {
    return (
      <div className="relative">
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={baseInputClass}
        >
          {column.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Number editor
  if (column.editType === 'number') {
    return (
      <div className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={localValue ?? ''}
          onChange={(e) => setLocalValue(e.target.value ? Number(e.target.value) : null)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={baseInputClass}
        />
        {error && (
          <span className="absolute left-0 top-full text-xs text-red-500 mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }

  // Date editor
  if (column.editType === 'date') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={localValue ?? ''}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={baseInputClass}
      />
    );
  }

  // Default text editor
  return (
    <div className="relative">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={localValue ?? ''}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={baseInputClass}
      />
      {error && (
        <span className="absolute left-0 top-full text-xs text-red-500 mt-1">
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// ROW EDIT MODE COMPONENT
// Full row editing with save/cancel buttons
// ============================================================================
function RowEditMode<T extends { id: string }>({
  row,
  columns,
  onSave,
  onCancel,
}: {
  row: T;
  columns: Column<T>[];
  onSave: (updates: Partial<T>) => void;
  onCancel: () => void;
}) {
  const [editedValues, setEditedValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getValue = (column: Column<T>) => {
    const colId = column.id as keyof T;
    if (colId in editedValues) {
      return editedValues[colId];
    }
    return typeof column.accessor === 'function' 
      ? column.accessor(row) 
      : row[column.accessor];
  };

  const handleChange = (columnId: string, value: any) => {
    setEditedValues((prev) => ({ ...prev, [columnId]: value }));
    // Clear error on change
    if (errors[columnId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[columnId];
        return next;
      });
    }
  };

  const handleSave = () => {
    // Validate all editable columns
    const newErrors: Record<string, string> = {};
    columns.forEach((col) => {
      if (col.editable && col.validate) {
        const value = getValue(col);
        const error = col.validate(value, row);
        if (error) {
          newErrors[col.id] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(editedValues);
  };

  return (
    <tr className="bg-brand-gold/5 border-2 border-brand-gold/30">
      {columns.map((column) => (
        <td key={column.id} className="px-4 py-2">
          {column.editable ? (
            <InlineCellEditor
              value={getValue(column)}
              column={column}
              row={row}
              onSave={(val) => handleChange(column.id, val)}
              onCancel={() => {}}
            />
          ) : (
            <span className="text-muted-foreground">
              {typeof column.accessor === 'function'
                ? column.accessor(row)
                : row[column.accessor]}
            </span>
          )}
        </td>
      ))}
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="p-1.5 rounded bg-brand-gold text-white hover:bg-brand-gold-hover transition-colors"
            title="Save changes"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// COLUMN HEADER WITH SORT & FILTER
// Enhanced version of your existing TableColumnHeader
// ============================================================================
function EnterpriseColumnHeader<T>({
  column,
  sortDirection,
  activeFilters,
  onSort,
  onFilter,
}: {
  column: Column<T>;
  sortDirection: SortDirection;
  activeFilters: string[];
  onSort: () => void;
  onFilter: (values: string[]) => void;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>(activeFilters);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedFilters(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = (column.filterOptions ?? []).filter((opt) =>
    opt.label.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const handleApply = () => {
    onFilter(selectedFilters);
    setIsFilterOpen(false);
  };

  const handleClear = () => {
    setSelectedFilters([]);
    onFilter([]);
    setIsFilterOpen(false);
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-foreground">{column.header}</span>
      
      {/* Sort Button */}
      {column.sortable !== false && (
        <button
          onClick={onSort}
          className="p-1 rounded hover:bg-muted/50 transition-colors"
          title={`Sort by ${column.header}`}
        >
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4 text-brand-gold" />
          ) : sortDirection === 'desc' ? (
            <ChevronDown className="h-4 w-4 text-brand-gold" />
          ) : (
            <div className="flex flex-col -space-y-1">
              <ChevronUp className="h-3 w-3 text-muted-foreground/40" />
              <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}
        </button>
      )}

      {/* Filter Button */}
      {column.filterable !== false && column.filterOptions && column.filterOptions.length > 0 && (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "p-1 rounded hover:bg-muted/50 transition-colors",
              hasActiveFilters && "text-brand-gold"
            )}
            title={`Filter by ${column.header}`}
          >
            <Filter className={cn(
              "h-4 w-4",
              hasActiveFilters ? "text-brand-gold" : "text-muted-foreground/40"
            )} />
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-xl z-50">
              {/* Search */}
              <div className="p-3 border-b border-border">
                <input
                  type="text"
                  placeholder="Search filters..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full h-8 px-3 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                />
              </div>

              {/* Options */}
              <div className="max-h-48 overflow-auto py-2">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(option.value)}
                        onChange={() => {
                          setSelectedFilters((prev) =>
                            prev.includes(option.value)
                              ? prev.filter((f) => f !== option.value)
                              : [...prev, option.value]
                          );
                        }}
                        className="rounded border-border text-brand-gold focus:ring-brand-gold/30"
                      />
                      <span className="text-sm flex-1">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          ({option.count})
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
                <button
                  onClick={handleClear}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="px-4 py-1.5 text-sm bg-brand-gold text-white rounded-md hover:bg-brand-gold-hover transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Count Badge */}
      {hasActiveFilters && (
        <span className="px-1.5 py-0.5 text-xs bg-brand-gold/20 text-brand-gold rounded-full font-medium">
          {activeFilters.length}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// ROW ACTIONS DROPDOWN
// Context menu for row operations
// ============================================================================
function RowActionsMenu({
  onEdit,
  onDelete,
  onDuplicate,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
          <button
            onClick={() => { onEdit(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit Row
          </button>
          {onDuplicate && (
            <button
              onClick={() => { onDuplicate(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
          )}
          <hr className="my-1 border-border" />
          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN ENTERPRISE TABLE COMPONENT
// ============================================================================
export function EnterpriseTable<T extends { id: string }>({
  data,
  columns,
  onRowUpdate,
  onRowDelete,
  onRowClick,
  editMode = 'cell',
  enableUndo = true,
  selectedRows: externalSelectedRows,
  onSelectionChange,
  showCheckboxes = false,
  showActionsColumn = true,
}: EnterpriseTableProps<T>) {
  const [state, setState] = useState<TableState>({
    sortColumn: null,
    sortDirection: null,
    filters: {},
    editingCell: null,
    editingRow: null,
    selectedRows: [],
    undoStack: [],
  });

  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Handle cell click for inline editing
  const handleCellClick = useCallback((rowId: string, columnId: string) => {
    if (editMode !== 'cell') return;
    
    const column = columns.find((c) => c.id === columnId);
    if (!column?.editable) return;

    setState((prev) => ({
      ...prev,
      editingCell: { rowId, columnId },
    }));
  }, [editMode, columns]);

  // Handle cell save
  const handleCellSave = useCallback(async (rowId: string, columnId: string, newValue: any) => {
    const row = localData.find((r) => r.id === rowId);
    if (!row) return;

    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    const oldValue = typeof column.accessor === 'function'
      ? column.accessor(row)
      : row[column.accessor];

    // Add to undo stack
    if (enableUndo) {
      setState((prev) => ({
        ...prev,
        undoStack: [...prev.undoStack.slice(-49), { rowId, columnId, oldValue, newValue }],
      }));
    }

    // Update local state
    setLocalData((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, [columnId]: newValue } : r
      )
    );

    // Clear editing state
    setState((prev) => ({ ...prev, editingCell: null }));

    // Notify parent
    if (onRowUpdate) {
      await onRowUpdate(rowId, columnId, newValue);
    }
  }, [localData, columns, enableUndo, onRowUpdate]);

  // Handle undo (Ctrl+Z)
  useEffect(() => {
    if (!enableUndo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && state.undoStack.length > 0) {
        e.preventDefault();
        const lastChange = state.undoStack[state.undoStack.length - 1];
        
        setLocalData((prev) =>
          prev.map((r) =>
            r.id === lastChange.rowId
              ? { ...r, [lastChange.columnId]: lastChange.oldValue }
              : r
          )
        );

        setState((prev) => ({
          ...prev,
          undoStack: prev.undoStack.slice(0, -1),
        }));

        if (onRowUpdate) {
          onRowUpdate(lastChange.rowId, lastChange.columnId, lastChange.oldValue);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableUndo, state.undoStack, onRowUpdate]);

  // Handle sorting
  const handleSort = (columnId: string) => {
    setState((prev) => {
      if (prev.sortColumn === columnId) {
        const nextDirection = prev.sortDirection === 'asc' ? 'desc' : prev.sortDirection === 'desc' ? null : 'asc';
        return { ...prev, sortDirection: nextDirection, sortColumn: nextDirection ? columnId : null };
      }
      return { ...prev, sortColumn: columnId, sortDirection: 'asc' };
    });
  };

  // Handle filtering
  const handleFilter = (columnId: string, values: string[]) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [columnId]: values },
    }));
  };

  // Get cell value
  const getCellValue = (row: T, column: Column<T>) => {
    return typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];
  };

  // Apply sorting and filtering to data
  const processedData = React.useMemo(() => {
    let result = [...localData];

    // Apply filters
    Object.entries(state.filters).forEach(([columnId, values]) => {
      if (values.length > 0) {
        const column = columns.find((c) => c.id === columnId);
        if (column) {
          result = result.filter((row) => {
            const value = getCellValue(row, column);
            return values.includes(String(value));
          });
        }
      }
    });

    // Apply sorting
    if (state.sortColumn && state.sortDirection) {
      const column = columns.find((c) => c.id === state.sortColumn);
      if (column) {
        result.sort((a, b) => {
          const aVal = getCellValue(a, column);
          const bVal = getCellValue(b, column);
          
          if (aVal === bVal) return 0;
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          const comparison = aVal < bVal ? -1 : 1;
          return state.sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [localData, state.filters, state.sortColumn, state.sortDirection, columns]);

  // Use external selection if provided, otherwise internal
  const currentSelectedRows = externalSelectedRows ?? state.selectedRows;

  const handleRowSelection = (rowId: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked
        ? [...currentSelectedRows, rowId]
        : currentSelectedRows.filter((id) => id !== rowId);
      onSelectionChange(newSelection);
    } else {
      setState((prev) => ({
        ...prev,
        selectedRows: checked
          ? [...prev.selectedRows, rowId]
          : prev.selectedRows.filter((id) => id !== rowId),
      }));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const allIds = processedData.map((r) => r.id);
    if (onSelectionChange) {
      onSelectionChange(checked ? allIds : []);
    } else {
      setState((prev) => ({
        ...prev,
        selectedRows: checked ? allIds : [],
      }));
    }
  };

  const isAllSelected = currentSelectedRows.length === processedData.length && processedData.length > 0;

  // Handle row click - triggers drawer if not editing
  const handleRowClick = (row: T, e: React.MouseEvent) => {
    // Don't trigger row click if we're editing a cell or the click is on an interactive element
    if (state.editingCell || state.editingRow) return;
    
    onRowClick?.(row);
  };

  return (
    <div className="relative w-full overflow-auto rounded-lg border border-border bg-card">
      {/* Undo indicator */}
      {enableUndo && state.undoStack.length > 0 && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
          <Undo className="h-3 w-3" />
          {state.undoStack.length} change{state.undoStack.length !== 1 ? 's' : ''} (Ctrl+Z to undo)
        </div>
      )}

      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="h-12 bg-muted/50">
            {showCheckboxes && (
              <th className="h-12 px-4 w-10 text-left align-middle">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-border text-brand-gold focus:ring-brand-gold/30"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.id}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                style={{ width: column.width }}
              >
                <EnterpriseColumnHeader
                  column={column}
                  sortDirection={state.sortColumn === column.id ? state.sortDirection : null}
                  activeFilters={state.filters[column.id] ?? []}
                  onSort={() => handleSort(column.id)}
                  onFilter={(values) => handleFilter(column.id, values)}
                />
              </th>
            ))}
            {showActionsColumn && (
              <th className="h-12 px-4 w-16 text-left align-middle font-medium text-muted-foreground">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {processedData.map((row) =>
            state.editingRow === row.id ? (
              <RowEditMode
                key={row.id}
                row={row}
                columns={columns}
                onSave={(updates) => {
                  // Handle row save
                  Object.entries(updates).forEach(([columnId, value]) => {
                    handleCellSave(row.id, columnId, value);
                  });
                  setState((prev) => ({ ...prev, editingRow: null }));
                }}
                onCancel={() => setState((prev) => ({ ...prev, editingRow: null }))}
              />
            ) : (
              <tr
                key={row.id}
                className={cn(
                  "h-12 border-b transition-colors hover:bg-muted/50",
                  currentSelectedRows.includes(row.id) && "bg-brand-gold/5",
                  onRowClick && "cursor-pointer"
                )}
                onClick={(e) => handleRowClick(row, e)}
              >
                {showCheckboxes && (
                  <td 
                    className="px-4 py-2 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={currentSelectedRows.includes(row.id)}
                      onChange={(e) => handleRowSelection(row.id, e.target.checked)}
                      className="rounded border-border text-brand-gold focus:ring-brand-gold/30"
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const value = getCellValue(row, column);
                  const isEditing = 
                    state.editingCell?.rowId === row.id && 
                    state.editingCell?.columnId === column.id;

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-2 align-middle",
                        column.editable && editMode === 'cell' && "hover:bg-brand-gold/5"
                      )}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(row.id, column.id);
                      }}
                    >
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <InlineCellEditor
                            value={value}
                            column={column}
                            row={row}
                            onSave={(newValue) => handleCellSave(row.id, column.id, newValue)}
                            onCancel={() => setState((prev) => ({ ...prev, editingCell: null }))}
                          />
                        </div>
                      ) : column.renderCell ? (
                        column.renderCell(value, row)
                      ) : (
                        <span className={cn(
                          column.editable && editMode === 'cell' && "border-b border-dashed border-transparent hover:border-brand-gold/30"
                        )}>
                          {value ?? '—'}
                        </span>
                      )}
                    </td>
                  );
                })}
                {showActionsColumn && (
                  <td 
                    className="px-4 py-2 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActionsMenu
                      onEdit={() => setState((prev) => ({ ...prev, editingRow: row.id }))}
                      onDelete={() => onRowDelete?.(row.id)}
                    />
                  </td>
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================
/*
import { EnterpriseTable } from './EnterpriseTable';

const columns = [
  {
    id: 'requestId',
    header: 'Request ID',
    accessor: 'requestId',
    editable: false,
  },
  {
    id: 'summary',
    header: 'Summary',
    accessor: 'summary',
    editable: true,
    editType: 'text',
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    editable: true,
    editType: 'select',
    options: [
      { value: 'new', label: 'New Request' },
      { value: 'in_review', label: 'In Review' },
      { value: 'approved', label: 'Approved' },
    ],
    filterOptions: [
      { value: 'new', label: 'New Request', count: 3 },
      { value: 'in_review', label: 'In Review', count: 2 },
      { value: 'approved', label: 'Approved', count: 1 },
    ],
    renderCell: (value) => (
      <span className="px-2 py-1 text-xs rounded-full bg-muted">
        {value}
      </span>
    ),
  },
  {
    id: 'score',
    header: 'Score',
    accessor: 'score',
    editable: true,
    editType: 'number',
    validate: (value) => {
      if (value < 0 || value > 100) return 'Score must be 0-100';
      return null;
    },
  },
];

function MyPage() {
  return (
    <EnterpriseTable
      data={requests}
      columns={columns}
      editMode="cell"
      enableUndo={true}
      onRowUpdate={async (rowId, columnId, newValue) => {
        await api.updateRequest(rowId, { [columnId]: newValue });
      }}
      onRowDelete={async (rowId) => {
        await api.deleteRequest(rowId);
      }}
    />
  );
}
*/

export default EnterpriseTable;
