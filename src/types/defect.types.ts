// =====================================================
// DEFECT MODULE TYPE DEFINITIONS
// Power-user focused defect tracking types
// =====================================================

export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DefectPriority = 'critical' | 'high' | 'medium' | 'low';
export type DefectStatus = 
  | 'new' 
  | 'triaged' 
  | 'in_progress' 
  | 'fixed' 
  | 'verified' 
  | 'closed' 
  | 'rejected' 
  | 'reopened';

// =====================================================
// DEFECT SUMMARY (List View)
// =====================================================
export interface DefectSummary {
  id: string;
  defect_id: string;
  title: string;
  description?: string;
  severity: DefectSeverity;
  priority: DefectPriority;
  status: DefectStatus;
  component: string | null;
  is_blocker: boolean;
  is_regression: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  due_date: string | null;
  reporter: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  assignee: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  release: {
    id: string;
    name: string;
  } | null;
  comments_count: number;
  attachments_count: number;
}

// =====================================================
// FILTER TYPES
// =====================================================
export interface DefectFilters {
  statuses: DefectStatus[];
  severities: DefectSeverity[];
  priorities: DefectPriority[];
  assigneeIds: string[];
  reporterIds: string[];
  components: string[];
  search: string;
  isBlocker: boolean | null;
  isRegression: boolean | null;
  sortBy: 'newest' | 'oldest' | 'updated' | 'severity' | 'priority';
  page: number;
  pageSize: number;
}

export type FilterType = 
  | 'status' 
  | 'severity' 
  | 'priority' 
  | 'assignee' 
  | 'reporter' 
  | 'component'
  | 'blocker'
  | 'regression';

export interface FilterToken {
  type: FilterType;
  values: string[];
  label: string;
}

// =====================================================
// SAVED VIEWS
// =====================================================
export interface SavedView {
  id: string;
  name: string;
  filters: Partial<DefectFilters>;
  isDefault: boolean;
  count?: number;
}

// =====================================================
// QUICK FILTERS (View Tabs)
// =====================================================
export type QuickFilterType = 'all' | 'open' | 'my_defects' | 'critical' | 'blockers';

export const QUICK_FILTER_CONFIG: Record<QuickFilterType, { label: string; filters: Partial<DefectFilters> }> = {
  all: { label: 'All', filters: {} },
  open: { 
    label: 'Open', 
    filters: { statuses: ['new', 'triaged', 'in_progress', 'reopened'] } 
  },
  my_defects: { 
    label: 'My Issues', 
    filters: { assigneeIds: ['CURRENT_USER'] } 
  },
  critical: { 
    label: 'Critical', 
    filters: { severities: ['critical'] } 
  },
  blockers: { 
    label: 'Blockers', 
    filters: { isBlocker: true } 
  },
};

// =====================================================
// COLUMN CONFIGURATION
// =====================================================
export interface DefectColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  sortable: boolean;
  fixed?: boolean;
}

export const DEFAULT_DEFECT_COLUMNS: DefectColumnConfig[] = [
  { id: 'defect_id', label: 'ID', width: 90, visible: true, sortable: true, fixed: true },
  { id: 'title', label: 'Title', width: 300, visible: true, sortable: true },
  { id: 'severity', label: 'Severity', width: 100, visible: true, sortable: true },
  { id: 'status', label: 'Status', width: 100, visible: true, sortable: true },
  { id: 'assignee', label: 'Assignee', width: 120, visible: true, sortable: true },
  { id: 'component', label: 'Component', width: 100, visible: true, sortable: true },
  { id: 'age', label: 'Age', width: 80, visible: true, sortable: true },
];

// =====================================================
// STATUS LABELS & CONFIG
// =====================================================
export const STATUS_CONFIG: Record<DefectStatus, { label: string; emoji?: string }> = {
  new: { label: 'New' },
  triaged: { label: 'Triaged' },
  in_progress: { label: 'In Progress' },
  fixed: { label: 'Fixed' },
  verified: { label: 'Verified' },
  closed: { label: 'Closed' },
  rejected: { label: 'Rejected' },
  reopened: { label: 'Reopened', emoji: '🔄' },
};

export const SEVERITY_CONFIG: Record<DefectSeverity, { label: string; emoji: string }> = {
  critical: { label: 'Critical', emoji: '🔴' },
  high: { label: 'High', emoji: '🟠' },
  medium: { label: 'Medium', emoji: '🔵' },
  low: { label: 'Low', emoji: '⚪' },
};

export const PRIORITY_CONFIG: Record<DefectPriority, { label: string; emoji: string }> = {
  critical: { label: 'Critical', emoji: '⚠️' },
  high: { label: 'High', emoji: '🔥' },
  medium: { label: 'Medium', emoji: '●' },
  low: { label: 'Low', emoji: '○' },
};

// =====================================================
// VALID STATUS TRANSITIONS
// =====================================================
export const VALID_STATUS_TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
  new: ['triaged', 'rejected', 'closed'],
  triaged: ['in_progress', 'rejected', 'closed'],
  in_progress: ['fixed', 'closed', 'triaged'],
  fixed: ['verified', 'reopened', 'closed'],
  verified: ['closed', 'reopened'],
  closed: ['reopened'],
  rejected: ['reopened'],
  reopened: ['triaged', 'in_progress', 'closed'],
};
