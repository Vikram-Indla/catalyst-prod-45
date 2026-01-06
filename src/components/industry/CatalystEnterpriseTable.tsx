import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// ============================================================================
// CATALYST V5 ENTERPRISE TABLE - DARK MODE COMPLIANT
// Uses Catalyst v5 semantic tokens for proper dark mode support
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
        className={cn(
          "w-full px-2.5 py-1.5 text-sm rounded border-2 cursor-pointer",
          "bg-[var(--table-toolbar-input-bg)] text-[var(--table-text-primary)]",
          "border-[var(--brand-primary-hex)] focus:outline-none"
        )}
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
      className={cn(
        "w-full px-2.5 py-1.5 text-sm rounded border-2",
        "bg-[var(--table-toolbar-input-bg)] text-[var(--table-text-primary)]",
        "border-[var(--brand-primary-hex)] focus:outline-none"
      )}
    />
  );
}

// ============================================================================
// COLUMN HEADER WITH SORT & FILTER - CATALYST V5 COMPLIANT
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
        {/* Header text - text-primary in dark mode */}
        <span className="font-semibold uppercase tracking-wider text-xs whitespace-nowrap transition-colors text-[var(--table-header-text)]">
          {column.header}
        </span>
        
        {/* Sort button */}
        {column.sortable !== false && (
          <button
            onClick={(e) => { e.stopPropagation(); onSort(column.id); }}
            className={cn(
              "p-0.5 rounded transition-colors",
              isSorted 
                ? "text-[var(--brand-primary-hex)]" 
                : "text-[var(--table-icon-default)] hover:text-[var(--table-icon-hover)]"
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

        {/* Filter button */}
        {column.filterable !== false && column.filterOptions && column.filterOptions.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
            className={cn(
              "p-0.5 rounded transition-colors",
              hasFilters 
                ? "text-[var(--brand-primary-hex)]" 
                : "text-[var(--table-icon-default)] hover:text-[var(--table-icon-hover)]"
            )}
            title="Filter"
          >
            <Icons.Filter />
            {hasFilters && (
              <span className="ml-0.5 text-[10px] bg-[var(--brand-primary-hex)] text-white rounded-full px-1">
                {filterValues.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter dropdown - uses Catalyst v5 surface tokens */}
      {showFilter && column.filterOptions && (
        <div 
          ref={dropdownRef} 
          className={cn(
            "absolute top-full right-0 mt-2 w-60 z-[100] rounded-lg border shadow-lg",
            "bg-[var(--table-container-bg)] border-[var(--table-container-border)]"
          )}
        >
          <div className="p-3 border-b border-[var(--table-header-border)]">
            <div className="text-xs font-semibold text-[var(--table-text-secondary)]">
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
                    ? "bg-[var(--selection-row-bg)]" 
                    : "hover:bg-[var(--table-row-hover)]"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(opt.value)}
                  onChange={() => handleFilterToggle(opt.value)}
                  className={cn(
                    "w-4 h-4 rounded transition-all cursor-pointer",
                    "border-[var(--table-container-border)] text-[var(--brand-primary-hex)]",
                    "focus:ring-[var(--brand-primary-hex)] focus:ring-offset-0",
                    "bg-[var(--table-toolbar-input-bg)]"
                  )}
                />
                <span className="flex-1 text-[var(--table-text-primary)]">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className={cn(
            "flex justify-between p-3 border-t",
            "border-[var(--table-header-border)]",
            "bg-[var(--table-header-bg)]"
          )}>
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--table-text-secondary)] hover:text-[var(--table-text-primary)]"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded transition-colors",
                "bg-[var(--brand-primary-hex)] text-white hover:opacity-90"
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
// ROW ACTIONS MENU - CATALYST V5 COMPLIANT
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
          "text-[var(--table-icon-default)]",
          "hover:bg-[var(--table-row-hover)]",
          "hover:text-[var(--table-icon-hover)]"
        )}
      >
        <Icons.MoreHorizontal />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute right-0 top-full mt-1 min-w-[120px] z-50 rounded-lg border shadow-lg",
          "bg-[var(--table-container-bg)] border-[var(--table-container-border)]"
        )}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
            className={cn(
              "w-full px-3 py-2 text-left text-sm transition-colors",
              "text-[var(--table-text-primary)]",
              "hover:bg-[var(--table-row-hover)]"
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
// MAIN TABLE COMPONENT - CATALYST V5 DARK MODE COMPLIANT
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

  // Render row content with Catalyst v5 styling - Executive Dark Mode Compliant
  const renderRowContent = (row: T, rowIndex: number, dragHandleProps?: any, isDragging?: boolean) => (
    <>
      {/* Drag handle column - NO visible divider in dark mode */}
      {enableDragDrop && (
        <td className="py-3 px-2 w-8" {...dragHandleProps}>
          <GripVertical 
            className={cn(
              "h-4 w-4 cursor-grab active:cursor-grabbing transition-colors",
              isDragging 
                ? "text-[var(--brand-primary-hex)]" 
                : "text-[var(--table-icon-default)] hover:text-[var(--table-icon-hover)]"
            )} 
          />
        </td>
      )}
      {/* Checkbox - NO visible divider in dark mode */}
      {showCheckboxes && (
        <td className="py-3 px-4 w-12" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRows.includes(row.id)}
            onChange={(e) => handleCheckboxChange(e, row.id)}
            className={cn(
              "w-4 h-4 rounded transition-all cursor-pointer",
              "border-[var(--table-container-border)] text-[var(--brand-primary-hex)]",
              "focus:ring-[var(--brand-primary-hex)] focus:ring-offset-0",
              "bg-[var(--table-toolbar-input-bg)]",
              "hover:border-[var(--brand-primary-hex)]"
            )}
          />
        </td>
      )}
      {columns.map((column, colIndex) => {
        const value = typeof column.accessor === 'function' 
          ? column.accessor(row) 
          : (row as any)[column.accessor];
        const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

        return (
          <td
            key={column.id}
            className={cn(
              "py-3 px-4 align-middle text-[var(--table-text-primary)]",
              // NO column dividers in dark mode - content clarity over borders
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
                {value ?? <span className="text-[var(--table-text-muted)]">—</span>}
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

  // Empty state component with Catalyst v5 styling
  const EmptyState = () => (
    <tr>
      <td colSpan={columns.length + (showCheckboxes ? 1 : 0) + (showActionsColumn ? 1 : 0) + (enableDragDrop ? 1 : 0)} className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-[var(--table-header-bg)]">
            <Inbox className="w-6 h-6 text-[var(--table-icon-default)]" />
          </div>
          <p className="text-sm text-[var(--table-empty-text)] mb-2">
            {processedData.length === 0 
              ? "No requests found" 
              : `Showing ${processedData.length} request${processedData.length !== 1 ? 's' : ''}`}
          </p>
          {onCreateNew && (
            <button 
              onClick={onCreateNew}
              className="text-sm text-[var(--brand-primary-hex)] hover:underline font-medium"
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
      {/* Table container - Executive Dark Mode: single subtle outer border only */}
      <div className={cn(
        "rounded-lg border overflow-hidden",
        "bg-[var(--table-container-bg)]",
        // Light mode: subtle border
        "border-[var(--table-container-border)]",
        // Dark mode: very subtle border (darker than content, never bright)
        "dark:border-[#262626]",
        "shadow-[var(--shadow-elev-1)]"
      )}>
        {/* Request count header - subtle separation via background, minimal border */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5",
          // Light mode: border visible
          "border-b border-[var(--table-header-border)]",
          // Dark mode: ultra-subtle border
          "dark:border-b dark:border-[#232323]",
          "bg-[var(--table-header-bg)] dark:bg-[#1a1a1a]"
        )}>
          <span className="text-sm text-[var(--table-text-secondary)]">
            <span className="font-semibold text-[var(--table-text-primary)]">{processedData.length}</span> {processedData.length === 1 ? 'request' : 'requests'}
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
            
            {/* Header - Dark mode: separation via darker surface, not bright borders */}
            <thead>
              <tr className={cn(
                // Light mode: visible border
                "border-b border-[var(--table-header-border)]",
                // Dark mode: ultra-subtle or no border (rely on surface contrast)
                "dark:border-b dark:border-[#232323]",
                "bg-[var(--table-header-bg)] dark:bg-[#1a1a1a]"
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
                        "border-[var(--table-container-border)] text-[var(--brand-primary-hex)]",
                        "focus:ring-[var(--brand-primary-hex)] focus:ring-offset-0",
                        "bg-[var(--table-toolbar-input-bg)]"
                      )}
                    />
                  </th>
                )}
                {columns.map((column) => {
                  return (
                    <th 
                      key={column.id} 
                      className={cn(
                        "py-3 px-4 text-left cursor-pointer transition-colors",
                        // NO column dividers in dark mode - content clarity over borders
                        "hover:bg-[var(--table-row-hover)] dark:hover:bg-[#2a2a2a]"
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
                  );
                })}
                {showActionsColumn && (
                  <th className="py-3 px-4 w-12"></th>
                )}
              </tr>
            </thead>
            
            {/* Body - Executive Dark Mode: Row separation via surface contrast, ultra-subtle dividers */}
            {enableDragDrop ? (
              <Droppable droppableId={droppableId}>
                {(provided) => (
                  <tbody 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
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
                                // Light mode: subtle border
                                "border-b border-[var(--table-row-border)]",
                                // Dark mode: ultra-subtle divider (barely visible, never white)
                                "dark:border-b dark:border-[#232323]",
                                // Alternating row backgrounds for row distinction
                                rowIndex % 2 === 0 
                                  ? "bg-[var(--table-row-bg)]" 
                                  : "bg-[var(--table-row-alt-bg)] dark:bg-[#1f1f1f]",
                                // Hover: surface tint, NOT border highlight
                                "hover:bg-[var(--table-row-hover)] dark:hover:bg-[#2a2a2a]",
                                // Selected: surface elevation with subtle brand accent
                                selectedRows.includes(row.id) && "bg-[var(--table-row-selected)] dark:bg-[#1f1f1f] ring-1 ring-inset ring-[var(--brand-primary-hex)]/30",
                                // Dragging state
                                snapshot.isDragging && "bg-[var(--selection-row-bg)] shadow-lg"
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
              <tbody>
                {processedData.length === 0 ? (
                  <EmptyState />
                ) : (
                  processedData.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className={cn(
                        "transition-colors cursor-pointer",
                        // Light mode: subtle border
                        "border-b border-[var(--table-row-border)]",
                        // Dark mode: ultra-subtle divider
                        "dark:border-b dark:border-[#232323]",
                        // Alternating backgrounds for row separation
                        rowIndex % 2 === 0 
                          ? "bg-[var(--table-row-bg)]" 
                          : "bg-[var(--table-row-alt-bg)] dark:bg-[#1f1f1f]",
                        // Hover: surface tint
                        "hover:bg-[var(--table-row-hover)] dark:hover:bg-[#2a2a2a]",
                        // Selected: surface elevation
                        selectedRows.includes(row.id) && "bg-[var(--table-row-selected)] dark:bg-[#1f1f1f] ring-1 ring-inset ring-[var(--brand-primary-hex)]/30"
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
            "bg-[var(--surface-elevated)] text-[var(--table-text-primary)] shadow-lg"
          )}>
            <Icons.Undo />
            <span className="text-sm">{undoStack.length} unsaved change{undoStack.length !== 1 ? 's' : ''}</span>
            <button 
              onClick={handleUndo}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                "bg-[var(--brand-primary-hex)] text-white hover:opacity-90"
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
            "bg-[var(--status-success)] text-white shadow-lg"
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
