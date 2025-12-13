import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// CATALYST ENTERPRISE TABLE - STYLED EXACTLY LIKE THE REFERENCE
// ============================================================================

// Catalyst Golden Hour Color Palette
const colors = {
  olive: '#5c7c5c',
  bronze: '#8b7355',
  gold: '#c69c6d',
  goldHover: '#b8894f',
  champagne: '#d4b896',
  grey: '#c8ccd0',
  cream: '#faf7f1',
  white: '#ffffff',
  border: '#e5e5e5',
  muted: '#6b7280',
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
  // Drag-drop support
  enableDragDrop?: boolean;
  onReorder?: (reorderedData: T[], sourceIndex: number, destinationIndex: number) => void;
  droppableId?: string;
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
    border: `2px solid ${colors.gold}`,
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: colors.white,
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
// COLUMN HEADER WITH SORT & FILTER
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

  const sortButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: isSorted ? colors.gold : colors.muted,
    opacity: isSorted ? 1 : 0.5,
    transition: 'opacity 0.2s',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 500, color: colors.muted, whiteSpace: 'nowrap' }}>
          {column.header}
        </span>
        
        {column.sortable !== false && (
          <button
            onClick={(e) => { e.stopPropagation(); onSort(column.id); }}
            style={sortButtonStyle}
            title="Sort"
          >
            {isSorted && sortConfig.direction === 'asc' ? (
              <Icons.ChevronUp />
            ) : isSorted && sortConfig.direction === 'desc' ? (
              <Icons.ChevronDown />
            ) : (
              <span style={{ fontSize: '12px', opacity: 0.4 }}>⇅</span>
            )}
          </button>
        )}

        {column.filterable !== false && column.filterOptions && column.filterOptions.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
            style={{ ...sortButtonStyle, color: hasFilters ? colors.gold : colors.muted, opacity: hasFilters ? 1 : 0.5 }}
            title="Filter"
          >
            <Icons.Filter />
            {hasFilters && (
              <span style={{ 
                marginLeft: '2px', 
                fontSize: '10px', 
                backgroundColor: colors.gold, 
                color: colors.white, 
                borderRadius: '9999px', 
                padding: '0 4px' 
              }}>
                {filterValues.length}
              </span>
            )}
          </button>
        )}
      </div>

      {showFilter && column.filterOptions && (
        <div 
          ref={dropdownRef} 
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '240px',
            backgroundColor: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: colors.muted }}>
              Filter by {column.header}
            </div>
          </div>
          <div style={{ maxHeight: '192px', overflowY: 'auto' }}>
            {column.filterOptions.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  backgroundColor: selectedFilters.includes(opt.value) ? `${colors.gold}10` : 'transparent',
                  fontSize: '13px',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${colors.gold}10`)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = selectedFilters.includes(opt.value) ? `${colors.gold}10` : 'transparent')}
              >
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(opt.value)}
                  onChange={() => handleFilterToggle(opt.value)}
                  style={{ width: '16px', height: '16px', accentColor: colors.gold }}
                />
                <span style={{ flex: 1 }}>{opt.label}</span>
              </label>
            ))}
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '12px 14px', 
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: '#fafafa',
          }}>
            <button
              onClick={clearFilters}
              style={{ fontSize: '13px', color: colors.muted, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              style={{ 
                padding: '6px 16px', 
                fontSize: '13px', 
                backgroundColor: colors.gold, 
                color: colors.white, 
                border: 'none',
                borderRadius: '4px', 
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = colors.goldHover)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.gold)}
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
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{ 
          padding: '4px', 
          borderRadius: '4px', 
          border: 'none', 
          background: 'none',
          cursor: 'pointer',
          color: colors.muted,
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Icons.MoreHorizontal />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: '4px',
          backgroundColor: colors.white,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 50,
          minWidth: '120px',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); setIsOpen(false); }}
            style={{
              width: '100%',
              padding: '10px 14px',
              textAlign: 'left',
              fontSize: '13px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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

  // Styles matching the reference exactly
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    fontWeight: 500,
    color: colors.muted,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.border}`,
    verticalAlign: 'middle',
  };

  // Render row content (shared between drag and non-drag modes)
  const renderRowContent = (row: T, rowIndex: number, dragHandleProps?: any, isDragging?: boolean) => (
    <>
      {/* Drag handle column */}
      {enableDragDrop && (
        <td style={{ ...tdStyle, padding: '8px', width: '32px' }} {...dragHandleProps}>
          <GripVertical 
            className={cn(
              "h-4 w-4 cursor-grab active:cursor-grabbing",
              isDragging ? "text-brand-gold" : "text-muted-foreground"
            )} 
          />
        </td>
      )}
      {showCheckboxes && (
        <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRows.includes(row.id)}
            onChange={(e) => handleCheckboxChange(e, row.id)}
            style={{ width: '16px', height: '16px', accentColor: colors.gold }}
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
            style={tdStyle}
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
                style={{
                  display: 'inline-block',
                  padding: column.editable ? '4px 8px' : undefined,
                  margin: column.editable ? '-4px -8px' : undefined,
                  borderRadius: column.editable ? '4px' : undefined,
                  border: column.editable ? '1px dashed transparent' : undefined,
                  transition: 'all 0.15s',
                  cursor: column.editable ? 'pointer' : undefined,
                }}
                onMouseOver={(e) => {
                  if (column.editable) {
                    e.currentTarget.style.borderColor = `${colors.gold}50`;
                    e.currentTarget.style.backgroundColor = `${colors.gold}08`;
                  }
                }}
                onMouseOut={(e) => {
                  if (column.editable) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {value ?? '—'}
              </span>
            )}
          </td>
        );
      })}
      {showActionsColumn && (
        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu
            onEdit={() => setEditingCell({ rowId: row.id, columnId: columns.find(c => c.editable)?.id || columns[0].id })}
          />
        </td>
      )}
    </>
  );

  const tableContent = (
    <div style={cardStyle}>
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              {/* Drag handle header */}
              {enableDragDrop && (
                <th style={{ ...thStyle, width: '32px' }}></th>
              )}
              {showCheckboxes && (
                <th style={{ ...thStyle, textAlign: 'center', width: '48px' }}>
                  <input
                    type="checkbox"
                    checked={processedData.length > 0 && selectedRows.length === processedData.length}
                    onChange={handleSelectAll}
                    style={{ width: '16px', height: '16px', accentColor: colors.gold }}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th 
                  key={column.id} 
                  style={{ ...thStyle, width: column.width }}
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
                <th style={{ ...thStyle, width: '48px' }}></th>
              )}
            </tr>
          </thead>
          {enableDragDrop ? (
            <Droppable droppableId={droppableId}>
              {(provided) => (
                <tbody ref={provided.innerRef} {...provided.droppableProps}>
                  {processedData.map((row, rowIndex) => (
                    <Draggable key={row.id} draggableId={row.id} index={rowIndex}>
                      {(provided, snapshot) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => handleRowClick(row)}
                          style={{
                            ...provided.draggableProps.style,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                            backgroundColor: snapshot.isDragging 
                              ? `${colors.gold}15` 
                              : selectedRows.includes(row.id) 
                                ? `${colors.gold}08` 
                                : 'transparent',
                            boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                          }}
                          onMouseOver={(e) => {
                            if (!selectedRows.includes(row.id) && !snapshot.isDragging) {
                              e.currentTarget.style.backgroundColor = '#f8f8f8';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!selectedRows.includes(row.id) && !snapshot.isDragging) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {renderRowContent(row, rowIndex, provided.dragHandleProps, snapshot.isDragging)}
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
              {processedData.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  style={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    backgroundColor: selectedRows.includes(row.id) ? `${colors.gold}08` : 'transparent',
                  }}
                  onMouseOver={(e) => {
                    if (!selectedRows.includes(row.id)) {
                      e.currentTarget.style.backgroundColor = '#f8f8f8';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!selectedRows.includes(row.id)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {renderRowContent(row, rowIndex)}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Undo Bar */}
      {undoStack.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          backgroundColor: '#1f2937',
          color: colors.white,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px',
          zIndex: 1000,
        }}>
          <Icons.Undo />
          <span>{undoStack.length} unsaved change{undoStack.length !== 1 ? 's' : ''}</span>
          <button 
            onClick={handleUndo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: colors.gold,
              color: colors.white,
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = colors.goldHover)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = colors.gold)}
          >
            Undo (Ctrl+Z)
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          backgroundColor: colors.olive,
          color: colors.white,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '14px',
          zIndex: 1000,
        }}>
          <Icons.Check /> {toast}
        </div>
      )}
    </div>
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
