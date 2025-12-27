import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// ============================================================================
// CATALYST ENTERPRISE TABLE - ENTERPRISE-GRADE VISUAL QUALITY
// ============================================================================

// Catalyst Blue + Teal Palette - uses CSS tokens for dark mode support
const colors = {
  olive: 'var(--secondary-green, #5c7c5c)',
  bronze: 'var(--secondary-bronze, #8b7355)',
  primary: 'var(--brand-primary, #2563eb)',
  primaryHover: 'var(--brand-primary-hover, #1d4ed8)',
  champagne: 'var(--secondary-champagne, #d4b896)',
  grey: 'var(--secondary-grey, #c8ccd0)',
  white: 'var(--surface-1, #ffffff)',
  border: 'var(--border-color, #e5e5e5)',
  muted: 'var(--text-2, #6b7280)',
  danger: '#dc2626',
};

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
  enableDragDrop?: boolean;
  onReorder?: (reorderedData: T[], sourceIndex: number, destinationIndex: number) => void;
  droppableId?: string;
  onCreateNew?: () => void;
}

// Icons (inline SVG)
const Icons = {
  ChevronUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  ),
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

// ============================================================================
// INLINE CELL EDITOR COMPONENT
// ============================================================================
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    border: `2px solid var(--brand-accent)`,
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--input-text)',
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
        style={{ ...inputStyle, cursor: 'pointer' }}
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
      type={type === 'number' ? 'number' : 'text'}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onSave(localValue === '' ? null : (type === 'number' ? Number(localValue) : localValue))}
      onKeyDown={handleKeyDown}
      style={inputStyle}
    />
  );
}

// ============================================================================
// COLUMN HEADER WITH SORT & FILTER - POLISHED
// ============================================================================
function ColumnHeader<T>({ 
  column, 
  sortConfig, 
  filterValues,
  onSort,
  onFilter,
}: { 
  column: CatalystColumn<T>;
  sortConfig: { column: string | null; direction: SortDirection };
  filterValues: string[];
  onSort: (columnId: string) => void;
  onFilter: (columnId: string, values: string[]) => void;
}) {
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(filterValues);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isSorted = sortConfig.column === column.id;
  const hasFilters = filterValues.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterToggle = (value: string) => {
    setSelectedFilters(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
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
        <span className={cn(
          "font-semibold uppercase tracking-wider text-xs whitespace-nowrap transition-colors",
          "text-gray-600 dark:text-gray-400"
        )}>
          {column.header}
        </span>
        
        {column.sortable !== false && (
          <button
            onClick={(e) => { e.stopPropagation(); onSort(column.id); }}
            className={cn(
              "p-0.5 rounded transition-colors",
              isSorted 
                ? "text-[#c69c6d] dark:text-[#d4b896]" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
            title="Sort"
          >
            {isSorted && sortConfig.direction === 'asc' ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : isSorted && sortConfig.direction === 'desc' ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-40" />
            )}
          </button>
        )}

        {column.filterable !== false && column.filterOptions && column.filterOptions.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
            className={cn(
              "p-0.5 rounded transition-colors",
              hasFilters 
                ? "text-[#c69c6d] dark:text-[#d4b896]" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
            title="Filter"
          >
            <Icons.Filter />
            {hasFilters && (
              <span className="ml-0.5 text-[10px] bg-[#c69c6d] text-white dark:bg-[#d4b896] dark:text-gray-900 rounded-full px-1">
                {filterValues.length}
              </span>
            )}
          </button>
        )}
      </div>

      {showFilter && column.filterOptions && (
        <div 
          ref={dropdownRef} 
          className={cn(
            "absolute top-full right-0 mt-2 w-60 z-[100] rounded-lg border shadow-lg",
            "bg-white dark:bg-[#1a1a1a]",
            "border-gray-200 dark:border-gray-700"
          )}
        >
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Filter by {column.header}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {column.filterOptions.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-sm transition-colors",
                  selectedFilters.includes(opt.value) 
                    ? "bg-[#c69c6d]/10 dark:bg-[#c69c6d]/20" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(opt.value)}
                  onChange={() => handleFilterToggle(opt.value)}
                  className={cn(
                    "w-4 h-4 rounded transition-all cursor-pointer",
                    "border-gray-300 text-[#c69c6d] focus:ring-[#c69c6d] focus:ring-offset-0",
                    "dark:border-gray-500 dark:bg-gray-800 dark:checked:bg-[#c69c6d] dark:checked:border-[#c69c6d]"
                  )}
                />
                <span className="flex-1 text-gray-700 dark:text-gray-300">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className={cn(
            "flex justify-between p-3 border-t",
            "border-gray-200 dark:border-gray-700",
            "bg-gray-50 dark:bg-[#262626]"
          )}>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded transition-colors",
                "bg-[#c69c6d] text-white hover:bg-[#b8894f]",
                "dark:bg-[#c69c6d] dark:hover:bg-[#b8894f]"
              )}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ROW ACTIONS MENU
// ============================================================================
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
        className={cn(
          "p-1 rounded transition-colors",
          "text-gray-400 dark:text-gray-500",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "hover:text-gray-600 dark:hover:text-gray-300"
        )}
      >
        <Icons.MoreHorizontal />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute right-0 top-full mt-1 min-w-[120px] z-50 rounded-lg border shadow-lg",
          "bg-white dark:bg-[#1a1a1a]",
          "border-gray-200 dark:border-gray-700"
        )}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
            className={cn(
              "w-full px-3 py-2 text-left text-sm transition-colors",
              "text-gray-700 dark:text-gray-300",
              "hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            Edit Row
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================
export function CatalystEnterpriseTable<T extends { id: string }>({
  data,
  columns,
  onRowUpdate,
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  showCheckboxes = true,
  showActionsColumn = true,
  enableDragDrop = false,
  onReorder,
  droppableId = 'catalyst-table',
  onCreateNew,
}: CatalystEnterpriseTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: SortDirection }>({ column: null, direction: null });
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [undoStack, setUndoStack] = useState<{ rowId: string; columnId: string; oldValue: any; newValue: any }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Handle drag end for reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    const reordered = Array.from(processedData);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);
    
    onReorder(reordered, sourceIndex, destinationIndex);
  };

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

  const handleSort = (columnId: string) => {
    setSortConfig(prev => {
      if (prev.column !== columnId) return { column: columnId, direction: 'asc' };
      if (prev.direction === 'asc') return { column: columnId, direction: 'desc' };
      if (prev.direction === 'desc') return { column: null, direction: null };
      return { column: columnId, direction: 'asc' };
    });
  };

  const handleFilter = (columnId: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [columnId]: values }));
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

  // Render row content with enterprise styling
  const renderRowContent = (row: T, rowIndex: number, dragHandleProps?: any, isDragging?: boolean) => (
    <>
      {/* Drag handle column */}
      {enableDragDrop && (
        <td className="py-3 px-2 w-8" {...dragHandleProps}>
          <GripVertical 
            className={cn(
              "h-4 w-4 cursor-grab active:cursor-grabbing transition-colors",
              isDragging 
                ? "text-[#c69c6d] dark:text-[#d4b896]" 
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            )} 
          />
        </td>
      )}
      {/* Checkbox with enhanced visibility */}
      {showCheckboxes && (
        <td className="py-3 px-4 w-12" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRows.includes(row.id)}
            onChange={(e) => handleCheckboxChange(e, row.id)}
            className={cn(
              "w-4 h-4 rounded transition-all cursor-pointer",
              "border-gray-300 text-[#c69c6d] focus:ring-[#c69c6d] focus:ring-offset-0",
              "dark:border-gray-500 dark:bg-gray-800 dark:checked:bg-[#c69c6d] dark:checked:border-[#c69c6d]",
              "hover:border-[#c69c6d] dark:hover:border-[#c69c6d]"
            )}
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
            className={cn(
              "py-3 px-4 align-middle text-gray-900 dark:text-gray-100",
              column.width && `w-[${column.width}]`
            )}
            style={{ width: column.width }}
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
                  column.editable && "inline-block px-2 py-1 -mx-2 -my-1 rounded border border-transparent transition-all cursor-pointer",
                  column.editable && "hover:border-[rgba(37,99,235,0.3)] hover:bg-[rgba(37,99,235,0.05)]"
                )}
              >
                {value ?? <span className="text-gray-400 dark:text-gray-500">—</span>}
              </span>
            )}
          </td>
        );
      })}
      {showActionsColumn && (
        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            onEdit={() => setEditingCell({ rowId: row.id, columnId: columns.find(c => c.editable)?.id || columns[0].id })}
          />
        </td>
      )}
    </>
  );

  // Empty state component
  const EmptyState = () => (
    <tr>
      <td colSpan={columns.length + (showCheckboxes ? 1 : 0) + (showActionsColumn ? 1 : 0) + (enableDragDrop ? 1 : 0)} className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center mb-3",
            "bg-gray-100 dark:bg-gray-800"
          )}>
            <Inbox className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {processedData.length === 0 
              ? "No requests found" 
              : `Showing ${processedData.length} request${processedData.length !== 1 ? 's' : ''}`}
          </p>
          {onCreateNew && (
            <button 
              onClick={onCreateNew}
              className="text-sm text-[#c69c6d] dark:text-[#d4b896] hover:underline font-medium"
            >
              + Create new request
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const tableContent = (
    <TooltipProvider>
      <div className={cn(
        "rounded-lg border overflow-hidden",
        "bg-white dark:bg-[#1a1a1a]",
        "border-gray-200 dark:border-gray-700",
        "shadow-sm dark:shadow-none"
      )}>
        {/* Request count header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          "border-gray-200 dark:border-gray-700",
          "bg-gray-50/50 dark:bg-[#262626]"
        )}>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{processedData.length}</span> {processedData.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed border-collapse">
            {/* Column widths */}
            <colgroup>
              {enableDragDrop && <col className="w-8" />}
              {showCheckboxes && <col className="w-12" />}
              {columns.map((col) => (
                <col key={col.id} style={{ width: col.width }} />
              ))}
              {showActionsColumn && <col className="w-12" />}
            </colgroup>
            
            {/* Header with polish */}
            <thead>
              <tr className={cn(
                "border-b",
                "bg-gray-50 dark:bg-[#262626]",
                "border-gray-200 dark:border-gray-700"
              )}>
                {enableDragDrop && (
                  <th className="py-3 px-2 w-8"></th>
                )}
                {showCheckboxes && (
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={processedData.length > 0 && selectedRows.length === processedData.length}
                      onChange={handleSelectAll}
                      className={cn(
                        "w-4 h-4 rounded transition-all cursor-pointer",
                        "border-gray-300 text-[#c69c6d] focus:ring-[#c69c6d] focus:ring-offset-0",
                        "dark:border-gray-500 dark:bg-gray-800 dark:checked:bg-[#c69c6d] dark:checked:border-[#c69c6d]"
                      )}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th 
                    key={column.id} 
                    className={cn(
                      "py-3 px-4 text-left cursor-pointer transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
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
                  <th className="py-3 px-4 w-12"></th>
                )}
              </tr>
            </thead>
            
            {/* Body with row separation */}
            {enableDragDrop ? (
              <Droppable droppableId={droppableId}>
                {(provided) => (
                  <tbody 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className="divide-y divide-gray-200 dark:divide-gray-700"
                  >
                    {processedData.length === 0 ? (
                      <EmptyState />
                    ) : (
                      processedData.map((row, rowIndex) => (
                        <Draggable key={row.id} draggableId={row.id} index={rowIndex}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              onClick={() => handleRowClick(row)}
                              className={cn(
                                "transition-colors cursor-pointer",
                                // Alternating row backgrounds
                                rowIndex % 2 === 0 
                                  ? "bg-white dark:bg-[#1a1a1a]" 
                                  : "bg-gray-50/50 dark:bg-[#222222]",
                                // Hover state
                                "hover:bg-[rgba(37,99,235,0.05)] dark:hover:bg-[rgba(37,99,235,0.1)]",
                                // Selected state
                                selectedRows.includes(row.id) && "bg-[rgba(37,99,235,0.1)] dark:bg-[rgba(37,99,235,0.15)] ring-1 ring-inset ring-[rgba(37,99,235,0.3)]",
                                // Dragging state
                                snapshot.isDragging && "bg-[rgba(37,99,235,0.15)] dark:bg-[rgba(37,99,235,0.2)] shadow-lg"
                              )}
                            >
                              {renderRowContent(row, rowIndex, provided.dragHandleProps, snapshot.isDragging)}
                            </tr>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            ) : (
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {processedData.length === 0 ? (
                  <EmptyState />
                ) : (
                  processedData.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className={cn(
                        "transition-colors cursor-pointer",
                        // Alternating row backgrounds
                        rowIndex % 2 === 0 
                          ? "bg-white dark:bg-[#1a1a1a]" 
                          : "bg-gray-50/50 dark:bg-[#222222]",
                        // Hover state
                        "hover:bg-[rgba(37,99,235,0.05)] dark:hover:bg-[rgba(37,99,235,0.1)]",
                        // Selected state
                        selectedRows.includes(row.id) && "bg-[rgba(37,99,235,0.1)] dark:bg-[rgba(37,99,235,0.15)] ring-1 ring-inset ring-[rgba(37,99,235,0.3)]"
                      )}
                    >
                      {renderRowContent(row, rowIndex)}
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Undo Bar */}
        {undoStack.length > 0 && (
          <div className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]",
            "flex items-center gap-3 px-5 py-3 rounded-lg",
            "bg-gray-900 dark:bg-gray-800 text-white shadow-lg"
          )}>
            <Icons.Undo />
            <span className="text-sm">{undoStack.length} unsaved change{undoStack.length !== 1 ? 's' : ''}</span>
            <button 
              onClick={handleUndo}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                "bg-[#c69c6d] text-white hover:bg-[#b8894f]"
              )}
            >
              Undo (Ctrl+Z)
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={cn(
            "fixed top-6 right-6 z-[1000]",
            "flex items-center gap-2 px-5 py-3 rounded-lg",
            "bg-[#5c7c5c] text-white shadow-lg"
          )}>
            <Icons.Check /> {toast}
          </div>
        )}
      </div>
    </TooltipProvider>
  );

  // Wrap with DragDropContext if drag-drop is enabled
  if (enableDragDrop) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        {tableContent}
      </DragDropContext>
    );
  }

  return tableContent;
}
