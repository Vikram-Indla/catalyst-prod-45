// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE v2 — TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';

// ─── Sort & Filter Types ────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  id: string;
  desc: boolean;
}

export interface FilterState {
  id: string;
  value: any;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in' | 'notIn';
}

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface EditOption {
  value: string | number | boolean;
  label: string;
  color?: string;
  disabled?: boolean;
}

// ─── Row Actions ────────────────────────────────────────────────────────────

export interface RowAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  disabled?: boolean | ((row: T) => boolean);
  hidden?: boolean | ((row: T) => boolean);
  danger?: boolean;
  divider?: boolean;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (rows: T[]) => Promise<void>;
  disabled?: boolean | ((rows: T[]) => boolean);
  confirmMessage?: string;
  danger?: boolean;
}

// ─── Table View / Preset ────────────────────────────────────────────────────

export interface TableView {
  id: string;
  name: string;
  isDefault?: boolean;
  isSystem?: boolean;
  filters?: FilterState[];
  sort?: SortState[];
  columnVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  columnPinning?: { left?: string[]; right?: string[] };
  groupBy?: string;
}

// ─── Table State ────────────────────────────────────────────────────────────

export interface TableState {
  sorting: SortState[];
  filters: FilterState[];
  pagination: { pageIndex: number; pageSize: number };
  selection: string[];
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnPinning: { left: string[]; right: string[] };
  columnSizing: Record<string, number>;
  expanded: string[];
  grouping: string[];
}

// ─── Cell Context ───────────────────────────────────────────────────────────

export interface CellContext<T> {
  row: T;
  rowIndex: number;
  column: CatalystColumn<T>;
  value: any;
  isSelected: boolean;
  isExpanded: boolean;
  isEditing: boolean;
}

export interface HeaderContext<T> {
  column: CatalystColumn<T>;
  isSorted: boolean;
  sortDirection: 'asc' | 'desc' | null;
  isFiltered: boolean;
}

export interface FooterContext<T> {
  column: CatalystColumn<T>;
  rows: T[];
}

export interface AggregateContext<T> {
  column: CatalystColumn<T>;
  rows: T[];
  value: any;
}

// ─── Aggregation Type ───────────────────────────────────────────────────────

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'unique' | ((values: any[]) => any);

// ─── Column Definition ──────────────────────────────────────────────────────

export interface CatalystColumn<T> {
  // Identity
  id: string;
  header: string | React.ReactNode | ((props: HeaderContext<T>) => React.ReactNode);
  footer?: string | React.ReactNode | ((props: FooterContext<T>) => React.ReactNode);
  
  // Data Access
  accessor: keyof T | ((row: T) => any);
  
  // Rendering
  cell?: (props: CellContext<T>) => React.ReactNode;
  render?: (value: any, row: T) => React.ReactNode; // Legacy support
  aggregateCell?: (props: AggregateContext<T>) => React.ReactNode;
  
  // Sizing
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  
  // Sorting
  sortable?: boolean;
  sortDescFirst?: boolean;
  sortingFn?: 'alphanumeric' | 'datetime' | 'basic' | ((a: T, b: T) => number);
  sortUndefined?: 'first' | 'last';
  
  // Filtering
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'multi-select' | 'date' | 'date-range' | 'number-range' | 'boolean';
  filterOptions?: FilterOption[];
  filterFn?: (row: T, columnId: string, filterValue: any) => boolean;
  
  // Editing
  editable?: boolean | ((row: T) => boolean);
  editType?: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'datetime' | 'textarea' | 'checkbox';
  type?: 'text' | 'number' | 'select'; // Legacy support
  options?: EditOption[];
  editOptions?: EditOption[];
  editValidation?: (value: any, row: T) => string | null;
  
  // Column Behavior
  pinnable?: boolean;
  hidable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  
  // Grouping
  groupable?: boolean;
  aggregationFn?: AggregationType;
  
  // Styling
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  className?: string | ((row: T) => string);
  headerClassName?: string;
  
  // Meta
  meta?: Record<string, any>;
}

// ─── Main Table Props ───────────────────────────────────────────────────────

export interface CatalystEnterpriseTableProps<T extends { id: string }> {
  // Core Data
  data: T[];
  columns: CatalystColumn<T>[];
  
  // Loading & Error States
  loading?: boolean;
  error?: Error | null;
  emptyState?: React.ReactNode;
  loadingState?: 'skeleton' | 'spinner' | 'overlay';
  
  // Selection
  selectable?: boolean | 'single' | 'multiple';
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  rowSelectionMode?: 'checkbox' | 'click' | 'both';
  showCheckboxes?: boolean; // Legacy support
  
  // Sorting
  sortable?: boolean;
  multiSort?: boolean;
  defaultSort?: SortState[];
  onSortChange?: (sort: SortState[]) => void;
  serverSort?: boolean;
  
  // Filtering
  filterable?: boolean;
  defaultFilters?: FilterState[];
  onFilterChange?: (filters: FilterState[]) => void;
  serverFilter?: boolean;
  globalSearch?: boolean;
  
  // Pagination
  pagination?: boolean | 'client' | 'server';
  pageSize?: number;
  pageSizeOptions?: number[];
  currentPage?: number;
  totalRows?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  
  // Virtualization
  virtualized?: boolean;
  rowHeight?: number | ((row: T) => number);
  overscan?: number;
  
  // Column Features
  resizableColumns?: boolean;
  reorderableColumns?: boolean;
  pinnableColumns?: boolean;
  hidableColumns?: boolean;
  defaultColumnVisibility?: Record<string, boolean>;
  defaultColumnOrder?: string[];
  defaultColumnPinning?: { left?: string[]; right?: string[] };
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  onColumnOrderChange?: (order: string[]) => void;
  onColumnPinningChange?: (pinning: { left?: string[]; right?: string[] }) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  
  // Row Features
  expandable?: boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;
  expandedRowIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  
  groupable?: boolean;
  groupBy?: keyof T | ((row: T) => string);
  defaultExpandedGroups?: string[];
  renderGroupHeader?: (group: string, rows: T[]) => React.ReactNode;
  
  // Drag & Drop
  enableDragDrop?: boolean;
  draggable?: boolean;
  onReorder?: (data: T[], from: number, to: number) => void;
  dropZoneId?: string;
  droppableId?: string; // Legacy support
  
  // Inline Editing
  editable?: boolean;
  onRowUpdate?: (rowId: string, columnId: string, value: any, oldValue?: any) => Promise<void>;
  onCellEdit?: (rowId: string, columnId: string, value: any, oldValue: any) => Promise<void>;
  editMode?: 'cell' | 'row' | 'modal';
  validateCell?: (rowId: string, columnId: string, value: any) => string | null;
  
  // Row Actions
  rowActions?: RowAction<T>[] | ((row: T) => RowAction<T>[]);
  showActionsColumn?: boolean; // Legacy support
  onRowClick?: (row: T, event?: React.MouseEvent) => void;
  onRowDoubleClick?: (row: T, event: React.MouseEvent) => void;
  onRowContextMenu?: (row: T, event: React.MouseEvent) => void;
  
  // Bulk Actions
  bulkActions?: BulkAction<T>[];
  onBulkAction?: (action: string, selectedRows: T[]) => Promise<void>;
  
  // Export
  exportable?: boolean;
  exportFormats?: ('csv' | 'excel' | 'pdf' | 'json')[];
  onExport?: (format: string, data: T[]) => void;
  
  // Views / Presets
  views?: TableView[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  onViewSave?: (view: TableView) => void;
  
  // Aggregations
  showAggregateRow?: boolean;
  aggregations?: Record<string, AggregationType>;
  
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  keyboardNavigation?: boolean;
  
  // Styling
  density?: 'compact' | 'normal' | 'comfortable';
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
  className?: string;
  
  // Callbacks
  onStateChange?: (state: TableState) => void;
}

// ─── Component Sub-Props ────────────────────────────────────────────────────

export interface TableToolbarProps<T> {
  globalSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterState[];
  onFiltersChange?: (filters: FilterState[]) => void;
  views?: TableView[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  columns?: CatalystColumn<T>[];
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  exportable?: boolean;
  onExport?: (format: string) => void;
}

export interface BulkActionsBarProps<T> {
  selectedCount: number;
  bulkActions: BulkAction<T>[];
  onAction: (actionId: string) => void;
  onClearSelection: () => void;
}

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalRows: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface TableEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export interface TableLoadingStateProps {
  type: 'skeleton' | 'spinner' | 'overlay';
  columnCount?: number;
  rowCount?: number;
}
