/**
 * Column Configuration for Test Cases Data Table
 * Defines all available columns with their properties
 */

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
  locked: boolean;
  width: string;
  sortable: boolean;
  sortField?: string; // maps to SortField type if different from key
}

export const TEST_CASE_COLUMNS: ColumnConfig[] = [
  { key: 'checkbox', label: '', defaultVisible: true, locked: true, width: 'w-10', sortable: false },
  { key: 'key', label: 'KEY', defaultVisible: true, locked: true, width: 'w-[100px]', sortable: true, sortField: 'case_key' },
  { key: 'title', label: 'TITLE', defaultVisible: true, locked: true, width: 'flex-1 min-w-[200px]', sortable: true, sortField: 'title' },
  { key: 'folder', label: 'FOLDER', defaultVisible: false, locked: false, width: 'w-[120px]', sortable: false },
  { key: 'status', label: 'STATUS', defaultVisible: true, locked: false, width: 'w-[110px]', sortable: true, sortField: 'status' },
  { key: 'priority', label: 'PRIORITY', defaultVisible: false, locked: false, width: 'w-[100px]', sortable: true, sortField: 'priority' },
  { key: 'type', label: 'TYPE', defaultVisible: false, locked: false, width: 'w-[100px]', sortable: false },
  { key: 'assigned_to', label: 'ASSIGNED TO', defaultVisible: true, locked: false, width: 'w-[140px]', sortable: false },
  { key: 'traceability', label: 'TRACEABILITY', defaultVisible: false, locked: false, width: 'w-[160px]', sortable: false },
  { key: 'created_at', label: 'CREATED', defaultVisible: false, locked: false, width: 'w-[160px]', sortable: true, sortField: 'created_at' },
  { key: 'updated_at', label: 'UPDATED', defaultVisible: true, locked: false, width: 'w-[160px]', sortable: true, sortField: 'updated_at' },
  { key: 'created_by', label: 'CREATED BY', defaultVisible: false, locked: false, width: 'w-[130px]', sortable: false },
  { key: 'tags', label: 'TAGS', defaultVisible: false, locked: false, width: 'w-[150px]', sortable: false },
  { key: 'steps_count', label: 'STEPS', defaultVisible: false, locked: false, width: 'w-[80px]', sortable: false },
];

export const DEFAULT_VISIBLE_COLUMNS = ['checkbox', 'key', 'title', 'status', 'assigned_to', 'updated_at'];

export const STORAGE_KEY = 'catalyst_tm_visible_columns';
