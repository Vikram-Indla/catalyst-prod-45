// Table View Types

export interface TableColumn {
  key: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  sortable?: boolean;
  visible?: boolean;
  sticky?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TableFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  owner?: string;
  quarter?: string;
}

export interface BulkAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'danger';
  action: (selectedIds: string[]) => void | Promise<void>;
}

export const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'checkbox', label: '', width: 44, sortable: false, visible: true },
  { key: 'rank', label: 'Rank', width: 70, sortable: true, visible: true },
  { key: 'id', label: 'ID', width: 100, sortable: true, visible: true },
  { key: 'priority', label: 'Priority', width: 100, sortable: true, visible: true },
  { key: 'title', label: 'Summary', minWidth: 200, sortable: true, visible: true },
  { key: 'kickoff_date', label: 'Kickoff Date', width: 110, sortable: true, visible: true },
  { key: 'target_date', label: 'Target Date', width: 110, sortable: true, visible: true },
  { key: 'reporter', label: 'Reporter', width: 140, sortable: true, visible: true },
  { key: 'assignee', label: 'Assignee', width: 140, sortable: true, visible: true },
  { key: 'business_owner', label: 'Business Owner', width: 140, sortable: true, visible: true },
  { key: 'delivery_platform', label: 'Delivery Platform', width: 140, sortable: true, visible: true },
  { key: 'quarter', label: 'Planned Quarter', width: 120, sortable: true, visible: true },
];
