import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// CATALYST ENTERPRISE TABLE - Styled after the provided design
// ============================================================================

export type SortDirection = 'asc' | 'desc' | null;

export interface CatalystColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  editable?: boolean;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string; color?: string }[];
  filterOptions?: { value: string; label: string }[];
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface CatalystEnterpriseTableProps<T extends { id: string }> {
  data: T[];
  columns: CatalystColumn<T>[];
  onRowUpdate?: (rowId: string, columnId: string, newValue: any) => Promise<void>;
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showCheckboxes?: boolean;
  showActionsColumn?: boolean;
}

// Icons (inline SVG)
const Icons = {
  ChevronUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
  Filter: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  MoreHorizontal: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
    </svg>
  ),
  Undo: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  ),
};

// Inline Cell Editor
function InlineCellEditor({ 
  value, 
  type, 
  options, 
  onSave, 
  onCancel 
}: {
  value: any;
  type: 'text' | 'number' | 'select';
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

  const handleBlur = () => {
    onSave(localValue === '' ? null : (type === 'number' ? Number(localValue) : localValue));
  };

  const inputClass = "w-full px-2 py-1 text-sm border-2 border-brand-gold rounded outline-none bg-white";

  if (type === 'select') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={inputClass}
      >
        <option value="">— Select —</option>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'number' ? 'number' : 'text'}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      className={inputClass}
    />
  );
}

// Column Header with Sort & Filter
function ColumnHeader<T>({ 
  column, 
  sortConfig, 
  filterValues, 
  onSort, 
  onFilter 
}: {
  column: CatalystColumn<T>;
  sortConfig: { column: string | null; direction: SortDirection };
  filterValues: string[];
  onSort: (colId: string) => void;
  onFilter: (colId: string, values: string[]) => void;
}) {
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(filterValues || []);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedFilters(filterValues || []);
  }, [filterValues]);

  const isSorted = sortConfig.column === column.id;
  const hasFilters = filterValues && filterValues.length > 0;

  const handleFilterToggle = (value: string) => {
    setSelectedFilters((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const applyFilters = () => {
    onFilter(column.id, selectedFilters);
    setShowFilter(false);
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    onFilter(column.id, []);
    setShowFilter(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-muted-foreground whitespace-nowrap">{column.header}</span>
        
        {column.sortable !== false && (
          <button
            onClick={(e) => { e.stopPropagation(); onSort(column.id); }}
            className={cn(
              "p-0.5 rounded hover:bg-muted/50 transition-colors",
              isSorted ? "text-brand-gold" : "text-muted-foreground/50"
            )}
            title="Sort"
          >
            {isSorted && sortConfig.direction === 'asc' ? (
              <Icons.ChevronUp />
            ) : isSorted && sortConfig.direction === 'desc' ? (
              <Icons.ChevronDown />
            ) : (
              <span className="text-xs opacity-40">⇅</span>
            )}
          </button>
        )}

        {column.filterable !== false && column.filterOptions && column.filterOptions.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
            className={cn(
              "p-0.5 rounded hover:bg-muted/50 transition-colors",
              hasFilters ? "text-brand-gold" : "text-muted-foreground/50"
            )}
            title="Filter"
          >
            <Icons.Filter />
            {hasFilters && (
              <span className="ml-0.5 text-[10px] bg-brand-gold text-white rounded-full px-1">
                {filterValues.length}
              </span>
            )}
          </button>
        )}
      </div>

      {showFilter && column.filterOptions && (
        <div 
          ref={dropdownRef} 
          className="absolute top-full right-0 mt-2 w-56 bg-white border border-border rounded-lg shadow-xl z-50"
        >
          <div className="p-3 border-b border-border">
            <div className="text-xs font-semibold text-muted-foreground">
              Filter by {column.header}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {column.filterOptions.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors",
                  selectedFilters.includes(opt.value) && "bg-brand-gold/5"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(opt.value)}
                  onChange={() => handleFilterToggle(opt.value)}
                  className="rounded border-border accent-brand-gold"
                />
                <span className="text-sm flex-1">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between p-3 border-t border-border bg-muted/20">
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-1 text-sm bg-brand-gold text-white rounded hover:bg-brand-gold-hover transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Row Actions Menu
function RowActionsMenu({ onEdit }: { onEdit: () => void }) {
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
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
      >
        <Icons.MoreHorizontal />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg z-50 min-w-[120px]">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
          >
            Edit Row
          </button>
        </div>
      )}
    </div>
  );
}

// Main Table Component
export function CatalystEnterpriseTable<T extends { id: string }>({
  data,
  columns,
  onRowUpdate,
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  showCheckboxes = true,
  showActionsColumn = true,
}: CatalystEnterpriseTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: SortDirection }>({ column: null, direction: null });
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [undoStack, setUndoStack] = useState<{ rowId: string; columnId: string; oldValue: any; newValue: any }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Process data with filters and sort
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([columnId, values]) => {
      if (values && values.length > 0) {
        result = result.filter((row) => {
          const val = (row as any)[columnId];
          return values.includes(val);
        });
      }
    });

    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const col = columns.find(c => c.id === sortConfig.column);
        if (!col) return 0;
        
        const aVal = typeof col.accessor === 'function' ? col.accessor(a) : (a as any)[col.accessor];
        const bVal = typeof col.accessor === 'function' ? col.accessor(b) : (b as any)[col.accessor];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal - bVal;
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig, columns]);

  const handleSort = (columnId: string) => {
    setSortConfig((prev) => {
      if (prev.column === columnId) {
        if (prev.direction === 'asc') return { column: columnId, direction: 'desc' };
        if (prev.direction === 'desc') return { column: null, direction: null };
      }
      return { column: columnId, direction: 'asc' };
    });
  };

  const handleFilter = (columnId: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [columnId]: values }));
  };

  const handleCellDoubleClick = (e: React.MouseEvent, rowId: string, columnId: string) => {
    e.stopPropagation();
    const column = columns.find((c) => c.id === columnId);
    if (column?.editable) {
      setEditingCell({ rowId, columnId });
    }
  };

  const handleCellSave = async (rowId: string, columnId: string, newValue: any) => {
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
  };

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    
    const lastChange = undoStack[undoStack.length - 1];
    if (onRowUpdate) {
      await onRowUpdate(lastChange.rowId, lastChange.columnId, lastChange.oldValue);
    }
    setUndoStack((prev) => prev.slice(0, -1));
    showToast('Change undone');
  }, [undoStack, onRowUpdate]);

  // Ctrl+Z shortcut
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

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRowClick = (row: T) => {
    // Don't trigger row click if editing
    if (editingCell) return;
    onRowClick?.(row);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, rowId: string) => {
    e.stopPropagation();
    if (onSelectionChange) {
      const newSelection = selectedRows.includes(rowId)
        ? selectedRows.filter(id => id !== rowId)
        : [...selectedRows, rowId];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (e.target.checked) {
        onSelectionChange(processedData.map(row => row.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/30">
              {showCheckboxes && (
                <th className="px-4 py-3 text-center w-10 border-b border-border">
                  <input
                    type="checkbox"
                    checked={processedData.length > 0 && selectedRows.length === processedData.length}
                    onChange={handleSelectAll}
                    className="rounded border-border accent-brand-gold"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th 
                  key={column.id} 
                  className="px-4 py-3 text-left border-b border-border whitespace-nowrap"
                  style={{ width: column.width }}
                >
                  <ColumnHeader
                    column={column}
                    sortConfig={sortConfig}
                    filterValues={filters[column.id] || []}
                    onSort={handleSort}
                    onFilter={handleFilter}
                  />
                </th>
              ))}
              {showActionsColumn && (
                <th className="px-4 py-3 w-12 border-b border-border"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {processedData.map((row) => (
              <tr
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={cn(
                  "border-b border-border/50 transition-colors cursor-pointer",
                  "hover:bg-muted/30",
                  selectedRows.includes(row.id) && "bg-brand-gold/5"
                )}
              >
                {showCheckboxes && (
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={(e) => handleCheckboxChange(e, row.id)}
                      className="rounded border-border accent-brand-gold"
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const value = typeof column.accessor === 'function' 
                    ? column.accessor(row) 
                    : (row as any)[column.accessor];
                  const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

                  return (
                    <td
                      key={column.id}
                      className="px-4 py-3"
                      onDoubleClick={(e) => handleCellDoubleClick(e, row.id, column.id)}
                      title={column.editable ? 'Double-click to edit' : ''}
                    >
                      {isEditing ? (
                        <InlineCellEditor
                          value={value}
                          type={column.type || 'text'}
                          options={column.options}
                          onSave={(newValue) => handleCellSave(row.id, column.id, newValue)}
                          onCancel={() => setEditingCell(null)}
                        />
                      ) : column.render ? (
                        column.render(value, row)
                      ) : (
                        <span
                          className={cn(
                            column.editable && "inline-block px-1.5 py-0.5 -mx-1.5 rounded border border-transparent",
                            column.editable && "hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-colors"
                          )}
                        >
                          {value ?? '—'}
                        </span>
                      )}
                    </td>
                  );
                })}
                {showActionsColumn && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      onEdit={() => setEditingCell({ rowId: row.id, columnId: columns.find(c => c.editable)?.id || columns[0].id })}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Undo Bar */}
      {undoStack.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-lg shadow-lg z-50">
          <Icons.Undo />
          <span className="text-sm">{undoStack.length} unsaved change{undoStack.length !== 1 ? 's' : ''}</span>
          <button 
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold text-white rounded text-sm font-medium hover:bg-brand-gold-hover transition-colors"
          >
            Undo (Ctrl+Z)
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 flex items-center gap-2 px-4 py-3 bg-secondary-green text-white rounded-lg shadow-lg z-50 animate-in slide-in-from-right">
          <Icons.Check /> {toast}
        </div>
      )}
    </div>
  );
}


