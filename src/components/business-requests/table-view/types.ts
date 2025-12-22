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
  { key: 'checkbox', label: '', width: 44, sortable: false },
  { key: 'rank', label: 'Rank', width: 70, sortable: true },
  { key: 'id', label: 'ID', width: 100, sortable: true },
  { key: 'title', label: 'Title', minWidth: 220, sortable: true },
  { key: 'status', label: 'Status', width: 130, sortable: true },
  { key: 'priority', label: 'Priority', width: 100, sortable: true },
  { key: 'score', label: 'Score', width: 80, sortable: true },
  { key: 'owner', label: 'Reporter', width: 160, sortable: true },
  { key: 'quarter', label: 'Quarter', width: 100, sortable: true },
  { key: 'actions', label: 'Actions', width: 80, sortable: false, sticky: 'right' },
];
