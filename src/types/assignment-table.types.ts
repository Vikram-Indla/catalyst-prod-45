/**
 * Type definitions for Test Assignment Table View
 */

export type TestStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'blocked';
export type TestPriority = 'critical' | 'high' | 'medium' | 'low';
export type TestType = 'functional' | 'integration' | 'e2e' | 'performance';
export type AutomationStatus = 'automated' | 'manual' | 'partial';
export type SortDirection = 'asc' | 'desc';

export interface CycleAssignment {
  id: string;
  cycleId: string;
  testCaseId: string;
  testCaseCode: string; // TC-XXX format
  title: string;
  status: TestStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  priority: TestPriority;
  dueDate: string | null;
  module: string;
  testType: TestType;
  estimatedDurationMinutes: number | null;
  executionTimeMinutes: number | null;
  executedAt: string | null;
  automationStatus: AutomationStatus;
  defectCount: number;
  createdAt: string;
}

export interface TableColumn {
  id: string;
  label: string;
  width: number;
  sortable?: boolean;
  sticky?: 'left' | 'right';
  visible?: boolean;
}

export interface TableFilters {
  search: string;
  status: TestStatus[];
  assignee: string[];
  priority: TestPriority[];
  module: string[];
  testType: TestType[];
}

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface TableState {
  filters: TableFilters;
  sort: SortConfig;
  page: number;
  pageSize: number;
  selectedIds: Set<string>;
  visibleColumns: string[];
}

export interface InlineEditParams {
  assignmentId: string;
  field: keyof CycleAssignment;
  value: any;
}

export interface BulkUpdateParams {
  ids: string[];
  updates: Partial<Pick<CycleAssignment, 'assigneeId' | 'priority' | 'status' | 'dueDate'>>;
}

export interface TeamMemberOption {
  id: string;
  name: string;
  avatar: string | null;
  workload: number; // Current test count
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export const DEFAULT_COLUMNS: TableColumn[] = [
  { id: 'select', label: '', width: 40, sticky: 'left' },
  { id: 'testId', label: 'ID', width: 100, sortable: true },
  { id: 'title', label: 'Test Case', width: 300, sortable: true },
  { id: 'status', label: 'Status', width: 130, sortable: true },
  { id: 'assignee', label: 'Assignee', width: 160, sortable: true },
  { id: 'priority', label: 'Priority', width: 100, sortable: true },
  { id: 'dueDate', label: 'Due Date', width: 120, sortable: true },
  { id: 'module', label: 'Module', width: 140, sortable: true },
  { id: 'type', label: 'Type', width: 100, sortable: true },
  { id: 'duration', label: 'Est. Time', width: 90, sortable: true },
  { id: 'defects', label: 'Defects', width: 80, sortable: true },
  { id: 'automation', label: 'Auto', width: 60 },
  { id: 'actions', label: '', width: 50, sticky: 'right' },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  'select', 'testId', 'title', 'status', 'assignee', 'priority', 'dueDate', 'module', 'actions'
];

export const DEFAULT_FILTERS: TableFilters = {
  search: '',
  status: [],
  assignee: [],
  priority: [],
  module: [],
  testType: [],
};
