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

/**
 * STATUS_CONFIG — 10-stage Catalyst workflow status map. Values are
 * Atlaskit semantic-token fallback hexes (legacy-light). The triple
 * `color` / `bgColor` / `textColor` mirrors Atlaskit's role triad
 * (bold accent / subtle surface / bolder text on surface) and is
 * upgrade-ready: a React consumer can lift any value to
 * `token('color.*', <hex>)` without changing the config shape.
 *
 * Apr 20 2026: converted from raw HSL (§L38). Four values previously
 * decoded to banned Golden Hour palette (§7): design #896F58,
 * in_development #C79C6B, uat_testing #D4B996, in_beta #5B7B5B —
 * all replaced with Atlaskit canonical palette.
 */
export const STATUS_CONFIG: Record<WorkflowStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  wipLimit?: number;
}> = {
  backlog: {
    // neutral — StatusLozenge grey (§5)
    label: 'Backlog',
    color: '#42526E',
    bgColor: '#DFE1E6',
    textColor: '#42526E'
  },
  design: {
    // purple (was Golden Hour #896F58)
    label: 'Design',
    color: '#5243AA',
    bgColor: '#EAE6FF',
    textColor: '#403294',
    wipLimit: 3
  },
  ready_for_dev: {
    // information / StatusLozenge blue (§5)
    label: 'Ready for Dev',
    color: '#0052CC',
    bgColor: '#DEEBFF',
    textColor: '#0747A6',
    wipLimit: 5
  },
  in_development: {
    // warning / yellow (was Golden Hour #C79C6B)
    label: 'In Development',
    color: '#FF991F',
    bgColor: '#FFF0B3',
    textColor: '#974F0C',
    wipLimit: 4
  },
  qa_testing: {
    // warning
    label: 'QA Testing',
    color: '#FFAB00',
    bgColor: '#FFF0B3',
    textColor: '#974F0C',
    wipLimit: 3
  },
  uat_testing: {
    // warning (was Golden Hour #D4B996)
    label: 'UAT Testing',
    color: '#FF991F',
    bgColor: '#FFF0B3',
    textColor: '#974F0C',
    wipLimit: 2
  },
  in_beta: {
    // success (was Golden Hour #5B7B5B)
    label: 'In Beta',
    color: '#36B37E',
    bgColor: '#E3FCEF',
    textColor: '#006644'
  },
  ready_for_prod: {
    // success / StatusLozenge green (§5)
    label: 'Ready for Prod',
    color: '#00875A',
    bgColor: '#E3FCEF',
    textColor: '#006644'
  },
  in_production: {
    // success bolder
    label: 'In Production',
    color: '#006644',
    bgColor: '#E3FCEF',
    textColor: '#006644'
  },
  on_hold: {
    // neutral
    label: 'On Hold',
    color: '#42526E',
    bgColor: '#DFE1E6',
    textColor: '#42526E'
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
    // danger
    label: 'Critical',
    color: '#BF2600',
    bgColor: '#FFBDAD'
  },
  high: {
    // warning
    label: 'High',
    color: '#974F0C',
    bgColor: '#FFF0B3'
  },
  medium: {
    // information
    label: 'Medium',
    color: '#0747A6',
    bgColor: '#DEEBFF'
  },
  low: {
    // neutral
    label: 'Low',
    color: '#42526E',
    bgColor: '#DFE1E6'
  }
};

// -----------------------------------------------------
// Work Item Types
// -----------------------------------------------------
export type WorkItemType = 'epic' | 'feature' | 'story';

/**
 * WORK_ITEM_CONFIG — colours match the canonical work-item-type SVG palette
 * (§11). Epic = purple (was Golden Hour #5B7B5B), Feature = blue,
 * Story = green (was Golden Hour #896F58).
 */
export const WORK_ITEM_CONFIG: Record<WorkItemType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  epic: {
    // §11 Epic purple #904EE2
    label: 'Epic',
    color: '#904EE2',
    bgColor: '#EAE6FF',
    icon: 'Zap'
  },
  feature: {
    // information
    label: 'Feature',
    color: '#0052CC',
    bgColor: '#DEEBFF',
    icon: 'Package'
  },
  story: {
    // §11 Story green #63BA3C (canonical story type colour)
    label: 'Story',
    color: '#63BA3C',
    bgColor: '#E3FCEF',
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
    // danger
    label: 'Blocks',
    description: 'This item blocks another',
    color: '#BF2600',
    bgColor: '#FFBDAD',
    icon: 'Ban',
    inverse: 'blocked_by'
  },
  blocked_by: {
    // warning
    label: 'Blocked By',
    description: 'This item is blocked by another',
    color: '#974F0C',
    bgColor: '#FFF0B3',
    icon: 'AlertTriangle',
    inverse: 'blocks'
  },
  relates_to: {
    // information
    label: 'Relates To',
    description: 'Related work item',
    color: '#0052CC',
    bgColor: '#DEEBFF',
    icon: 'Link2',
    inverse: 'relates_to'
  },
  parent_of: {
    // success (was Golden Hour #5B7B5B)
    label: 'Parent Of',
    description: 'This is the parent',
    color: '#006644',
    bgColor: '#E3FCEF',
    icon: 'ChevronUp',
    inverse: 'child_of'
  },
  child_of: {
    // purple (was Golden Hour #896F58)
    label: 'Child Of',
    description: 'This is a child item',
    color: '#5243AA',
    bgColor: '#EAE6FF',
    icon: 'ChevronDown',
    inverse: 'parent_of'
  },
  duplicates: {
    // neutral
    label: 'Duplicates',
    description: 'Duplicate of another',
    color: '#42526E',
    bgColor: '#DFE1E6',
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
  // Neutral fallback (Atlaskit neutral.bold)
  return STATUS_CONFIG[status]?.color || '#42526E';
}

export function getPriorityColor(priority: Priority): string {
  return PRIORITY_CONFIG[priority]?.color || '#42526E';
}

export function getLinkTypeColor(linkType: LinkType): string {
  return LINK_TYPE_CONFIG[linkType]?.color || '#42526E';
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
  critical: { label: 'Critical', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA', icon: 'AlertTriangle', sortWeight: 1 },
  high:     { label: 'High',     color: '#D97706', bgColor: '#FFFBEB', borderColor: '#FDE68A', icon: 'ArrowUp',       sortWeight: 2 },
  medium:   { label: 'Medium',   color: '#2563EB', bgColor: '#EFF6FF', borderColor: '#BFDBFE', icon: 'Minus',         sortWeight: 3 },
  low:      { label: 'Low',      color: '#64748B', bgColor: 'var(--bg-1, #F8FAFC)', borderColor: 'var(--bd-default, #E2E8F0)', icon: 'ArrowDown',     sortWeight: 4 },
  none:     { label: 'None',     color: '#94A3B8', bgColor: 'var(--bg-1, #F8FAFC)', borderColor: 'var(--bd-default, #E2E8F0)', icon: 'Minus',         sortWeight: 5 },
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
