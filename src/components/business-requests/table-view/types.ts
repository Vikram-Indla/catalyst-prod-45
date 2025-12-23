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
  { key: 'checkbox', label: '', width: 52, sortable: false, visible: true },
  { key: 'id', label: 'ID', width: 100, sortable: true, visible: true },
  { key: 'title', label: 'Summary', width: 220, sortable: true, visible: true },
  { key: 'status', label: 'Status', width: 130, sortable: true, visible: true },
  { key: 'business_owner', label: 'Business Owner', width: 140, sortable: true, visible: true },
  { key: 'priority', label: 'Priority', width: 100, sortable: true, visible: true },
  { key: 'quarter', label: 'Quarter', width: 100, sortable: true, visible: true },
  { key: 'department', label: 'Department', width: 150, sortable: true, visible: true },
  { key: 'reporter', label: 'Reporter', width: 130, sortable: true, visible: true },
  { key: 'assignee', label: 'Assignee', width: 130, sortable: true, visible: true },
];
