/**
 * WorkHub "All Work" — TypeScript Type Definitions
 * MARAM V3.1.1 semantic palette & complete domain model
 */

// ═══ UNION TYPES ═══

export type WhPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type WhSeverity = 'Critical' | 'Major' | 'Minor' | 'Trivial';
export type WhStatusCategory = 'todo' | 'in_progress' | 'done';
export type WhViewType = 'list' | 'board' | 'timeline' | 'calendar';
export type WhStatusColorKey = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'teal' | 'purple';

// ═══ LOOKUP / CONFIG TYPES ═══

export interface WhWorkType {
  key: string;
  label: string;
  icon: string; // lucide icon name
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

// ═══ MAIN TABLE ROW ═══

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

// ═══ DETAIL / SPLIT VIEW ═══

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

// ═══ RELATED ENTITIES ═══

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

// ═══ DASHBOARD STATS ═══

export interface WhDashboardStats {
  totalItems: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  criticalOpen: number;
  createdThisWeek: number;
  updatedToday: number;
}

// ═══ PAYLOADS ═══

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

// ═══ FILTER CONFIG ═══

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

// ═══ STATUS COLORS — MARAM V3.1.1 ═══

export const WH_STATUS_COLORS: Record<WhStatusColorKey, { bg: string; text: string; dot: string }> = {
  gray:   { bg: '#dddee1', text: '#44546f', dot: '#8c8f96' },
  blue:   { bg: '#8fb8f6', text: '#0c3578', dot: '#1868db' },
  green:  { bg: '#b3df72', text: '#1b4d1b', dot: '#22863a' },
  red:    { bg: '#f87168', text: '#601e16', dot: '#ef4444' },
  yellow: { bg: '#f5cd47', text: '#5c4813', dot: '#d97706' },
  teal:   { bg: '#82c7c2', text: '#0d4e48', dot: '#0d9488' },
  purple: { bg: '#c597f4', text: '#3b1761', dot: '#7c3aed' },
};

// ═══ PRIORITY CONFIG ═══

export const WH_PRIORITY_CONFIG: Record<WhPriority, { bars: number; color: string; label: string }> = {
  Highest: { bars: 4, color: '#ef4444', label: 'Highest' },
  High:    { bars: 3, color: '#f97316', label: 'High' },
  Medium:  { bars: 2, color: '#3b82f6', label: 'Medium' },
  Low:     { bars: 1, color: '#22c55e', label: 'Low' },
  Lowest:  { bars: 0, color: '#8c8f96', label: 'Lowest' },
};

// ═══ QUERY KEY FACTORY ═══

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
