/**
 * WorkHub CRUD Types — DYNAMITE V2
 * Core interfaces for Story Backlog, Epic Backlog, and All Work Items views
 */

// ═══ WORK ITEM TYPES ═══
export type WorkItemType = 'epic' | 'story' | 'bug' | 'task' | 'subtask' | 'improvement' | 'new_feature' | 'incident' | 'changes' | 'question';

export type WorkItemStatus =
  | 'backlog' | 'in_requirements' | 'to_do' | 'open'
  | 'in_progress' | 'in_review' | 'in_development' | 'in_beta' | 'in_uat' | 'in_qa' | 'ready_for_qa'
  | 'done' | 'closed' | 'in_production' | 'released';

export type StatusCategory = 'to_do' | 'in_progress' | 'done';

export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface WorkItem {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  type: WorkItemType;
  status: WorkItemStatus;
  status_category: StatusCategory;
  priority: Priority;
  assignee_id: string | null;
  reporter_id: string | null;
  parent_id: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  project_id: string;
  sprint_id: string | null;
  labels: string[];
  story_points: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  source: 'jira' | 'manual';
  sort_order: number;
  subtask_count: number;
  child_count: number;
  completed_child_count: number;
}

// ═══ TABLE STATE ═══
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface FilterConfig {
  statuses: WorkItemStatus[];
  types: WorkItemType[];
  priorities: Priority[];
  assignee_ids: string[];
  has_due_date: boolean | null;
  search_query: string;
}

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
}

export type GroupByField = 'status_category' | 'assignee_id' | 'priority' | 'parent_key' | 'type' | 'none';

export type ViewMode = 'backlog' | 'board' | 'list' | 'all_work';

// ═══ BULK OPERATIONS ═══
export interface BulkOperation {
  type: 'status_change' | 'assignee_change' | 'priority_change' | 'delete';
  item_ids: string[];
  value?: string;
}

// ═══ SIDE PANEL ═══
export interface SidePanelState {
  isOpen: boolean;
  itemId: string | null;
  mode: 'view' | 'edit' | 'create';
}

// ═══ INLINE EDIT ═══
export interface InlineEditState {
  itemId: string | null;
  field: string | null;
  value: any;
}

// ═══ TEAM MEMBER (for assignee picker) ═══
export interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  initials: string;
  role: string;
}

// ═══ ACTIVITY LOG ═══
export interface ActivityEntry {
  id: string;
  work_item_id: string;
  actor_id: string;
  actor_name: string;
  action: 'status_changed' | 'assigned' | 'commented' | 'created' | 'updated' | 'deleted';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  comment_text: string | null;
  created_at: string;
}

// ═══ LEGACY COMPAT — preserved for existing imports ═══

export type WhPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type WhSeverity = 'Critical' | 'Major' | 'Minor' | 'Trivial';
export type WhStatusCategory = 'todo' | 'in_progress' | 'done';
export type WhViewType = 'list' | 'board' | 'timeline' | 'calendar';
export type WhStatusColorKey = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'teal' | 'purple';

export interface WhWorkType {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export interface WhStatus {
  id: string;
  name: string;
  category: WhStatusCategory;
  colorKey: WhStatusColorKey;
  order: number;
}

export interface WhValidTransition {
  fromStatusId: string;
  toStatusId: string;
}

export interface WhFixVersion {
  id: string;
  name: string;
  releaseDate?: string;
  released: boolean;
}

export interface WhLabel {
  id: string;
  name: string;
  color?: string;
}

export interface WhLinkType {
  id: string;
  name: string;
  inwardLabel: string;
  outwardLabel: string;
}

export interface WhWorkItemListRow {
  id: string;
  item_key: string;
  summary: string;
  status: string;
  status_category: WhStatusCategory;
  status_color_key: WhStatusColorKey;
  priority: WhPriority;
  work_type: string;
  project_key: string;
  project_name: string;
  assignee_id?: string;
  assignee_display_name?: string;
  assignee_avatar_url?: string;
  reporter_id?: string;
  reporter_display_name?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  resolution?: string;
  story_points?: number;
  labels?: string[];
  components?: string[];
  fix_versions?: string[];
  epic_key?: string;
  epic_name?: string;
  parent_key?: string;
  sprint_name?: string;
}

export interface WhWorkItemDetail extends WhWorkItemListRow {
  description?: string;
  assignee_avatar_url?: string;
  reporter_avatar_url?: string;
  environment?: string;
  time_estimate_seconds?: number;
  time_spent_seconds?: number;
  subtask_count: number;
  subtask_done_count: number;
  link_count: number;
  comment_count: number;
  attachment_count: number;
  worklog_count: number;
}

export interface WhComment {
  id: string;
  work_item_id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url?: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface WhWorkLog {
  id: string;
  work_item_id: string;
  author_id: string;
  author_display_name: string;
  time_spent_seconds: number;
  started_at: string;
  comment?: string;
  created_at: string;
}

export interface WhAttachment {
  id: string;
  work_item_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  author_display_name: string;
  created_at: string;
}

export interface WhHistory {
  id: string;
  work_item_id: string;
  field: string;
  from_value?: string;
  to_value?: string;
  author_display_name: string;
  changed_at: string;
}

export interface WhWorkItemLink {
  id: string;
  link_type: string;
  inward_key: string;
  inward_summary: string;
  inward_status: string;
  outward_key: string;
  outward_summary: string;
  outward_status: string;
}

export interface WhDashboardStats {
  totalItems: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  criticalOpen: number;
  createdThisWeek: number;
  updatedToday: number;
}

export interface WhCreateWorkItemPayload {
  summary: string;
  work_type: string;
  project_key: string;
  priority: WhPriority;
  assignee_id?: string;
  description?: string;
  due_date?: string;
  labels?: string[];
  fix_versions?: string[];
  parent_key?: string;
  story_points?: number;
}

export interface WhUpdateWorkItemPayload {
  id: string;
  summary?: string;
  status?: string;
  priority?: WhPriority;
  assignee_id?: string | null;
  description?: string;
  due_date?: string | null;
  labels?: string[];
  fix_versions?: string[];
  story_points?: number | null;
}

export interface WhFilterConfig {
  search: string;
  statuses: string[];
  priorities: WhPriority[];
  workTypes: string[];
  projectKeys: string[];
  assigneeIds: string[];
  labels: string[];
  hasFixVersion: boolean | null;
  dueDateRange: { from?: string; to?: string } | null;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const WH_STATUS_COLORS: Record<WhStatusColorKey, { bg: string; text: string; dot: string }> = {
  gray:   { bg: '#dddee1', text: '#44546f', dot: '#8c8f96' },
  blue:   { bg: '#8fb8f6', text: '#0c3578', dot: '#1868db' },
  green:  { bg: '#b3df72', text: '#1b4d1b', dot: '#22863a' },
  red:    { bg: '#f87168', text: '#601e16', dot: '#ef4444' },
  yellow: { bg: '#f5cd47', text: '#5c4813', dot: '#d97706' },
  teal:   { bg: '#82c7c2', text: '#0d4e48', dot: '#0d9488' },
  purple: { bg: '#c597f4', text: '#3b1761', dot: '#7c3aed' },
};

export const WH_PRIORITY_CONFIG: Record<WhPriority, { bars: number; color: string; label: string }> = {
  Highest: { bars: 4, color: '#ef4444', label: 'Highest' },
  High:    { bars: 3, color: '#f97316', label: 'High' },
  Medium:  { bars: 2, color: '#3b82f6', label: 'Medium' },
  Low:     { bars: 1, color: '#22c55e', label: 'Low' },
  Lowest:  { bars: 0, color: '#8c8f96', label: 'Lowest' },
};

// ═══ STATUS TRANSITIONS (Jira changelog) ═══
export interface StatusTransition {
  id: string;
  work_item_id: string;
  from_status: string | null;
  to_status: string;
  from_status_category: string | null;
  to_status_category: string;
  transitioned_by: string;
  transitioned_by_avatar: string | null;
  transitioned_at: string;
  time_in_from_status_ms: number | null;
  jira_changelog_id: string | null;
}

// ═══ JIRA COMMENTS ═══
export interface WorkItemComment {
  id: string;
  work_item_id: string;
  jira_comment_id: string | null;
  author_name: string;
  author_avatar: string | null;
  author_email: string | null;
  body_text: string;
  body_html: string | null;
  comment_created_at: string;
  comment_updated_at: string | null;
  is_internal: boolean;
}

// ═══ FULL CHANGELOG ENTRY ═══
export interface ChangelogEntry {
  id: string;
  work_item_id: string;
  field_name: string;
  field_type: string;
  from_value: string | null;
  from_display: string | null;
  to_value: string | null;
  to_display: string | null;
  changed_by: string;
  changed_by_avatar: string | null;
  changed_at: string;
}

// ═══ CYCLE TIME ═══
export interface CycleTimeEntry {
  work_item_id: string;
  status: string;
  status_category: string;
  entered_at: string;
  exited_at: string;
  seconds_in_status: number;
  duration_formatted: string;
  days_in_status: number;
}

export interface CycleSummary {
  work_item_id: string;
  status_category: string;
  total_seconds: number;
  times_entered: number;
  first_entered: string;
  last_exited: string;
  total_days: number;
}

export const whQueryKeys = {
  all: ['workhub'] as const,
  lists: () => [...whQueryKeys.all, 'list'] as const,
  list: (filters: Partial<WhFilterConfig>) => [...whQueryKeys.lists(), filters] as const,
  details: () => [...whQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...whQueryKeys.details(), id] as const,
  comments: (itemId: string) => [...whQueryKeys.all, 'comments', itemId] as const,
  worklogs: (itemId: string) => [...whQueryKeys.all, 'worklogs', itemId] as const,
  attachments: (itemId: string) => [...whQueryKeys.all, 'attachments', itemId] as const,
  history: (itemId: string) => [...whQueryKeys.all, 'history', itemId] as const,
  links: (itemId: string) => [...whQueryKeys.all, 'links', itemId] as const,
  stats: () => [...whQueryKeys.all, 'stats'] as const,
  statuses: () => [...whQueryKeys.all, 'statuses'] as const,
  workTypes: () => [...whQueryKeys.all, 'work-types'] as const,
  fixVersions: () => [...whQueryKeys.all, 'fix-versions'] as const,
  labels: () => [...whQueryKeys.all, 'labels'] as const,
};
