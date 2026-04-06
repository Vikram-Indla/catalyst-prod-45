// =====================================================
// CATALYST VIEWS - CORE TYPE DEFINITIONS
// =====================================================

// -----------------------------------------------------
// Workflow Status (10-stage)
// -----------------------------------------------------
export type WorkflowStatus = 
  | 'backlog'
  | 'design'
  | 'ready_for_dev'
  | 'in_development'
  | 'qa_testing'
  | 'uat_testing'
  | 'in_beta'
  | 'ready_for_prod'
  | 'in_production'
  | 'on_hold';

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  'backlog',
  'design',
  'ready_for_dev',
  'in_development',
  'qa_testing',
  'uat_testing',
  'in_beta',
  'ready_for_prod',
  'in_production',
  'on_hold'
];

export const STATUS_CONFIG: Record<WorkflowStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  wipLimit?: number;
}> = {
  backlog: {
    label: 'Backlog',
    color: 'hsl(210, 6%, 80%)',
    bgColor: 'hsl(210, 6%, 80%, 0.15)',
    textColor: 'hsl(0, 0%, 45%)'
  },
  design: {
    label: 'Design',
    color: 'hsl(28, 22%, 44%)',
    bgColor: 'hsl(28, 22%, 44%, 0.15)',
    textColor: 'hsl(28, 22%, 44%)',
    wipLimit: 3
  },
  ready_for_dev: {
    label: 'Ready for Dev',
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    textColor: 'hsl(217, 91%, 60%)',
    wipLimit: 5
  },
  in_development: {
    label: 'In Development',
    color: 'hsl(32, 45%, 60%)',
    bgColor: 'hsl(32, 45%, 60%, 0.15)',
    textColor: 'hsl(32, 45%, 60%)',
    wipLimit: 4
  },
  qa_testing: {
    label: 'QA Testing',
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'hsl(38, 92%, 50%, 0.1)',
    textColor: 'hsl(28, 80%, 36%)',
    wipLimit: 3
  },
  uat_testing: {
    label: 'UAT Testing',
    color: 'hsl(34, 42%, 71%)',
    bgColor: 'hsl(34, 42%, 71%, 0.2)',
    textColor: 'hsl(26, 90%, 27%)',
    wipLimit: 2
  },
  in_beta: {
    label: 'In Beta',
    color: 'hsl(120, 15%, 42%)',
    bgColor: 'hsl(120, 15%, 42%, 0.15)',
    textColor: 'hsl(120, 15%, 42%)'
  },
  ready_for_prod: {
    label: 'Ready for Prod',
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'hsl(142, 71%, 45%, 0.1)',
    textColor: 'hsl(142, 76%, 28%)'
  },
  in_production: {
    label: 'In Production',
    color: 'hsl(142, 72%, 29%)',
    bgColor: 'hsl(142, 72%, 29%, 0.1)',
    textColor: 'hsl(142, 72%, 29%)'
  },
  on_hold: {
    label: 'On Hold',
    color: 'hsl(0, 0%, 45%)',
    bgColor: 'hsl(0, 0%, 45%, 0.1)',
    textColor: 'hsl(0, 0%, 45%)'
  }
};

// -----------------------------------------------------
// Priority
// -----------------------------------------------------
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export const PRIORITY_CONFIG: Record<Priority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  critical: {
    label: 'Critical',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'hsl(0, 84%, 60%, 0.1)'
  },
  high: {
    label: 'High',
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'hsl(38, 92%, 50%, 0.1)'
  },
  medium: {
    label: 'Medium',
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)'
  },
  low: {
    label: 'Low',
    color: 'hsl(210, 6%, 80%)',
    bgColor: 'hsl(210, 6%, 80%, 0.15)'
  }
};

// -----------------------------------------------------
// Work Item Types
// -----------------------------------------------------
export type WorkItemType = 'epic' | 'feature' | 'story';

export const WORK_ITEM_CONFIG: Record<WorkItemType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  epic: {
    label: 'Epic',
    color: 'hsl(120, 15%, 42%)',
    bgColor: 'hsl(120, 15%, 42%, 0.15)',
    icon: 'Zap'
  },
  feature: {
    label: 'Feature',
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    icon: 'Package'
  },
  story: {
    label: 'Story',
    color: 'hsl(28, 22%, 44%)',
    bgColor: 'hsl(28, 22%, 44%, 0.15)',
    icon: 'FileText'
  }
};

// -----------------------------------------------------
// Link Types
// -----------------------------------------------------
export type LinkType = 
  | 'blocks'
  | 'blocked_by'
  | 'relates_to'
  | 'parent_of'
  | 'child_of'
  | 'duplicates';

export const LINK_TYPE_CONFIG: Record<LinkType, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  inverse: LinkType;
}> = {
  blocks: {
    label: 'Blocks',
    description: 'This item blocks another',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'hsl(0, 84%, 60%, 0.1)',
    icon: 'Ban',
    inverse: 'blocked_by'
  },
  blocked_by: {
    label: 'Blocked By',
    description: 'This item is blocked by another',
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'hsl(38, 92%, 50%, 0.1)',
    icon: 'AlertTriangle',
    inverse: 'blocks'
  },
  relates_to: {
    label: 'Relates To',
    description: 'Related work item',
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    icon: 'Link2',
    inverse: 'relates_to'
  },
  parent_of: {
    label: 'Parent Of',
    description: 'This is the parent',
    color: 'hsl(120, 15%, 42%)',
    bgColor: 'hsl(120, 15%, 42%, 0.15)',
    icon: 'ChevronUp',
    inverse: 'child_of'
  },
  child_of: {
    label: 'Child Of',
    description: 'This is a child item',
    color: 'hsl(28, 22%, 44%)',
    bgColor: 'hsl(28, 22%, 44%, 0.15)',
    icon: 'ChevronDown',
    inverse: 'parent_of'
  },
  duplicates: {
    label: 'Duplicates',
    description: 'Duplicate of another',
    color: 'hsl(0, 0%, 45%)',
    bgColor: 'hsl(0, 0%, 45%, 0.1)',
    icon: 'Copy',
    inverse: 'duplicates'
  }
};

// -----------------------------------------------------
// Dependency Types
// -----------------------------------------------------
export type DependencyType = 
  | 'finish_to_start'
  | 'start_to_start'
  | 'finish_to_finish'
  | 'start_to_finish';

// -----------------------------------------------------
// Data Interfaces
// -----------------------------------------------------
export interface WorkItemLink {
  id: string;
  from_work_item_type: WorkItemType;
  from_work_item_id: string;
  to_work_item_type: WorkItemType;
  to_work_item_id: string;
  link_type: LinkType;
  program_id?: string;
  pi_id?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkItemDependency {
  id: string;
  dependent_type: WorkItemType;
  dependent_id: string;
  blocker_type: WorkItemType;
  blocker_id: string;
  dependency_type: DependencyType;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ViewPreference {
  id: string;
  user_id: string;
  project_id: string;
  view_type: 'board' | 'timeline' | 'feature_map';
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------
// View-specific interfaces
// -----------------------------------------------------
export interface BoardViewPreferences {
  collapsedColumns: WorkflowStatus[];
  groupBy: 'status' | 'release' | 'assignee' | 'priority';
  filters: {
    releases?: string[];
    assignees?: string[];
    priorities?: Priority[];
    search?: string;
  };
}

export interface TimelineViewPreferences {
  zoom: 'week' | 'month' | 'quarter';
  showDependencies: boolean;
  collapsedReleases: string[];
  showMilestones: boolean;
}

export interface FeatureMapPreferences {
  showSubtasks: boolean;
  showDependencies: boolean;
  collapsedFeatures: string[];
}

// -----------------------------------------------------
// API Response types
// -----------------------------------------------------
export interface FeatureWithDetails {
  id: string;
  feature_id: string;
  title: string;
  description: string | null;
  workflow_status: WorkflowStatus;
  priority: Priority;
  release_id: string | null;
  release?: {
    id: string;
    version: string;
    name: string;
    target_date: string | null;
  };
  assignee_id: string | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  story_count: number;
  completed_story_count: number;
  total_story_points: number;
  completed_story_points: number;
  dependency_counts: {
    blocks: number;
    blocked_by: number;
  };
  progress_percentage: number;
}

export interface StoryWithDetails {
  id: string;
  story_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: Priority;
  feature_id: string;
  release_id: string | null;
  assignee_id: string | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  story_points: number | null;
  subtasks: {
    id: string;
    title: string;
    type: string;
    status: string;
  }[];
  dependency_counts: {
    blocks: number;
    blocked_by: number;
  };
}

// -----------------------------------------------------
// Utility functions
// -----------------------------------------------------
export function getStatusColor(status: WorkflowStatus): string {
  return STATUS_CONFIG[status]?.color || 'hsl(210, 6%, 80%)';
}

export function getPriorityColor(priority: Priority): string {
  return PRIORITY_CONFIG[priority]?.color || 'hsl(210, 6%, 80%)';
}

export function getLinkTypeColor(linkType: LinkType): string {
  return LINK_TYPE_CONFIG[linkType]?.color || 'hsl(0, 0%, 45%)';
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// ═══════════════════════════════════════════════════════════
// SDLC View Types — Board, List, Backlog
// ═══════════════════════════════════════════════════════════

export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low' | 'none';

export const WORK_ITEM_PRIORITY_CONFIG: Record<WorkItemPriority, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  sortWeight: number;
}> = {
  critical: { label: 'Critical', color: '#DC2626', bgColor: 'rgba(248,113,113,0.06)', borderColor: '#FECACA', icon: 'AlertTriangle', sortWeight: 1 },
  high:     { label: 'High',     color: '#D97706', bgColor: '#FFFBEB', borderColor: '#FDE68A', icon: 'ArrowUp',       sortWeight: 2 },
  medium:   { label: 'Medium',   color: '#2563EB', bgColor: 'rgba(59,130,246,0.06)', borderColor: '#BFDBFE', icon: 'Minus',         sortWeight: 3 },
  low:      { label: 'Low',      color: 'rgba(237,237,237,0.40)', bgColor: 'var(--bg-1, #1A1A1A)', borderColor: 'var(--bd-default, rgba(255,255,255,0.10))', icon: 'ArrowDown',     sortWeight: 4 },
  none:     { label: 'None',     color: 'rgba(237,237,237,0.40)', bgColor: 'var(--bg-1, #1A1A1A)', borderColor: 'var(--bd-default, rgba(255,255,255,0.10))', icon: 'Minus',         sortWeight: 5 },
};

export interface WorkItemFull {
  id: string;
  item_key: string;
  title: string;
  item_type: string;
  status: string;
  priority: WorkItemPriority;
  sort_order: number;
  due_date: string | null;
  estimate: number | null;
  labels: string[];
  description: string | null;
  parent_id: string | null;
  project_id: string;
  release_id: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  department: string | null;
  team: string | null;
  environment: string | null;
  security_level: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  cycle_time_days: number | null;
  status_changed_at: string | null;
  resolved_at: string | null;
  on_hold_reason: string | null;
  backlog_order: number | null;
  // Joined
  release_name: string | null;
  release_status: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  reporter_name: string | null;
  parent_key: string | null;
  parent_title: string | null;
  // Computed
  days_in_status: number;
  is_overdue: boolean;
  days_overdue: number | null;
  sub_issue_count: number;
}

export interface BoardColumn {
  id: string;
  project_id: string;
  status_key: string;
  column_label: string;
  column_order: number;
  wip_limit: number | null;
  is_visible: boolean;
  color_group: 'gray' | 'blue' | 'green' | 'amber';
}

export interface BoardColumnWithCounts extends BoardColumn {
  item_count: number;
  wip_status: 'ok' | 'at_limit' | 'exceeded';
}

export type ListColumnKey =
  | 'release' | 'key' | 'type' | 'title' | 'status'
  | 'priority' | 'assignee' | 'due_date' | 'estimate'
  | 'created' | 'updated' | 'days_in_status' | 'parent' | 'reporter';

export type GroupByKey = 'status' | 'release' | 'type' | 'priority' | 'assignee' | null;
export type SortDirection = 'asc' | 'desc';

export interface ListConfig {
  id: string;
  project_id: string;
  user_id: string;
  visible_columns: ListColumnKey[];
  column_order: ListColumnKey[];
  sort_column: string;
  sort_direction: SortDirection;
  group_by: GroupByKey;
  rows_per_page: 25 | 50 | 100;
  show_subtasks: boolean;
}

export type QuickFilterKey = 'my_items' | 'bugs' | 'unassigned' | 'overdue' | 'on_hold';

export interface BacklogConfig {
  id: string;
  project_id: string;
  user_id: string;
  group_by: GroupByKey;
  show_completed: boolean;
  show_subtasks: boolean;
  show_empty_groups: boolean;
  quick_filters: QuickFilterKey[];
  visible_columns: ListColumnKey[];
}

export interface ViewFilterState {
  statuses: string[];
  types: string[];
  priorities: WorkItemPriority[];
  assigneeIds: string[];
  releaseIds: string[];
  searchQuery: string;
  quickFilters: QuickFilterKey[];
}

export const EMPTY_FILTER_STATE: ViewFilterState = {
  statuses: [],
  types: [],
  priorities: [],
  assigneeIds: [],
  releaseIds: [],
  searchQuery: '',
  quickFilters: [],
};

export interface BulkAction {
  type: 'assign' | 'status' | 'priority' | 'release' | 'delete';
  itemIds: string[];
  value?: string;
}

export interface DragResult {
  itemId: string;
  fromStatus: string;
  toStatus: string;
  newSortOrder: number;
}

export interface ItemDetailUpdate {
  status?: string;
  assignee_id?: string | null;
  priority?: WorkItemPriority;
  release_id?: string | null;
  due_date?: string | null;
  title?: string;
  description?: string | null;
  estimate?: number | null;
  labels?: string[];
}
