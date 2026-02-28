// ═══════════════════════════════════════════════════════════════════════════════
// G03 SCHEMA TYPES — WorkHub "All Work" Module
// SDLC PIPELINE v2.1 · Agent 3: SDLC SCHEMA
// Platform: Catalyst · Stack: React + TypeScript + Supabase + TanStack Query
// Generated: 2026-02-28
// ═══════════════════════════════════════════════════════════════════════════════

// ── ENUMS ────────────────────────────────────────────────────────────────────

export type WhPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export type WhSeverity = 'critical' | 'major' | 'moderate' | 'minor' | 'trivial';

export type WhStatusCategory = 'todo' | 'in_progress' | 'done';

export type WhViewType = 'table' | 'split' | 'board';

export type WhStatusColorKey = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'teal' | 'purple';

// ── CORE ENTITIES ────────────────────────────────────────────────────────────

export interface WhWorkType {
  id: string;
  projectId: string;
  name: string;
  iconGlyph: string;
  iconColor: string;
  description: string | null;
  isSubtask: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface WhStatus {
  id: string;
  projectId: string;
  name: string;
  category: WhStatusCategory;
  colorKey: WhStatusColorKey;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface WhValidTransition {
  projectId: string;
  fromStatusId: string;
  fromStatusName: string;
  toStatusId: string;
  toStatusName: string;
  toStatusColor: WhStatusColorKey;
  toStatusCategory: WhStatusCategory;
}

export interface WhFixVersion {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  releaseDate: string | null;
  isReleased: boolean;
  isArchived: boolean;
}

export interface WhLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface WhLinkType {
  id: string;
  name: string;
  inwardDesc: string;
  outwardDesc: string;
}

// ── WORK ITEM ────────────────────────────────────────────────────────────────

export interface WhWorkItem {
  id: string;
  projectId: string;
  workTypeId: string;
  statusId: string;
  parentId: string | null;
  fixVersionId: string | null;
  itemKey: string;
  keySequence: number;
  summary: string;
  description: string | null;
  assigneeId: string | null;
  reporterId: string | null;
  priority: WhPriority;
  severity: WhSeverity | null;
  rank: string;
  originalEstimateMinutes: number | null;
  remainingEstimateMinutes: number | null;
  timeSpentMinutes: number;
  environment: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
}

// List View Row (from wh_all_work_list view)
export interface WhWorkItemListRow {
  id: string;
  projectId: string;
  itemKey: string;
  keySequence: number;
  summary: string;
  description: string | null;
  priority: WhPriority;
  severity: WhSeverity | null;
  rank: string;
  createdAt: string;
  updatedAt: string;
  workTypeId: string;
  workTypeName: string;
  iconGlyph: string;
  iconColor: string;
  isSubtask: boolean;
  statusId: string;
  statusName: string;
  statusCategory: WhStatusCategory;
  statusColor: WhStatusColorKey;
  parentId: string | null;
  parentKey: string | null;
  parentSummary: string | null;
  fixVersionId: string | null;
  fixVersionName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  reporterId: string | null;
  reporterName: string | null;
  commentCount: number;
  attachmentCount: number;
  childCount: number;
  labels: WhLabel[];
}

// Detail View (from wh_work_item_detail view)
export interface WhWorkItemDetail extends WhWorkItem {
  workTypeName: string;
  iconGlyph: string;
  iconColor: string;
  isSubtask: boolean;
  statusName: string;
  statusCategory: WhStatusCategory;
  statusColor: WhStatusColorKey;
  fixVersionName: string | null;
  parentKey: string | null;
  parentSummary: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  reporterName: string | null;
  reporterAvatar: string | null;
}

// ── ACTIVITY ENTITIES ────────────────────────────────────────────────────────

export interface WhComment {
  id: string;
  workItemId: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhWorkLog {
  id: string;
  workItemId: string;
  authorId: string;
  authorName?: string;
  timeSpentMinutes: number;
  workDate: string;
  description: string | null;
  createdAt: string;
}

export interface WhAttachment {
  id: string;
  workItemId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploaderName?: string;
  createdAt: string;
}

export interface WhHistory {
  id: string;
  workItemId: string;
  authorId: string;
  authorName?: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  oldDisplay: string | null;
  newDisplay: string | null;
  createdAt: string;
}

export interface WhWorkItemLink {
  id: string;
  linkTypeId: string;
  linkTypeName?: string;
  inwardDesc?: string;
  outwardDesc?: string;
  sourceItemId: string;
  sourceItemKey?: string;
  sourceItemSummary?: string;
  targetItemId: string;
  targetItemKey?: string;
  targetItemSummary?: string;
  comment: string | null;
  createdAt: string;
}

// ── USER PREFERENCES ─────────────────────────────────────────────────────────

export interface WhSavedFilter {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  filterJson: WhFilterConfig;
  isShared: boolean;
  sortOrder: number;
}

export interface WhFilterConfig {
  statuses?: string[];
  assignees?: string[];
  workTypes?: string[];
  priorities?: WhPriority[];
  labels?: string[];
  fixVersions?: string[];
  search?: string;
  parentOnly?: boolean;
  dateRange?: { from: string; to: string };
}

export interface WhColumnConfig {
  id: string;
  projectId: string;
  userId: string;
  columns: WhColumnDef[];
  viewType: WhViewType;
}

export interface WhColumnDef {
  field: string;
  label: string;
  width: number;
  visible: boolean;
  order: number;
}

// ── SIDEBAR ──────────────────────────────────────────────────────────────────

export interface WhSidebarProject {
  id: string;
  name: string;
  key: string;
  iconColor: string;
  isStarred: boolean;
  lastVisited: string | null;
}

// ── DASHBOARD STATS ──────────────────────────────────────────────────────────

export interface WhDashboardStats {
  projectId: string;
  totalItems: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  criticalOpen: number;
  createdThisWeek: number;
  updatedToday: number;
}

// ── MUTATION PAYLOADS ────────────────────────────────────────────────────────

export interface WhCreateWorkItemPayload {
  projectId: string;
  workTypeId: string;
  statusId?: string;
  parentId?: string | null;
  fixVersionId?: string | null;
  summary: string;
  description?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  priority?: WhPriority;
  severity?: WhSeverity | null;
}

export interface WhUpdateWorkItemPayload {
  id: string;
  summary?: string;
  description?: string | null;
  statusId?: string;
  assigneeId?: string | null;
  reporterId?: string | null;
  priority?: WhPriority;
  severity?: WhSeverity | null;
  fixVersionId?: string | null;
  parentId?: string | null;
  rank?: string;
}

export interface WhMoveWorkItemPayload {
  id: string;
  targetProjectId: string;
  targetWorkTypeId?: string;
  targetStatusId?: string;
}

export interface WhCloneWorkItemPayload {
  sourceId: string;
  cloneLinks: boolean;
  cloneSubtasks: boolean;
}

export interface WhCreateCommentPayload {
  workItemId: string;
  body: string;
  isInternal?: boolean;
}

export interface WhCreateWorkLogPayload {
  workItemId: string;
  timeSpentMinutes: number;
  workDate: string;
  description?: string | null;
}

export interface WhCreateLinkPayload {
  linkTypeId: string;
  sourceItemId: string;
  targetItemId: string;
  comment?: string | null;
}

export interface WhBulkActionPayload {
  itemIds: string[];
  action: 'delete' | 'update_status' | 'update_assignee' | 'update_priority';
  value?: string;
}

// ── QUERY KEY FACTORY ────────────────────────────────────────────────────────

export const whQueryKeys = {
  all: ['workhub'] as const,
  workItems: (projectId: string) => ['workhub', 'items', projectId] as const,
  workItemDetail: (id: string) => ['workhub', 'items', 'detail', id] as const,
  workItemChildren: (parentId: string) => ['workhub', 'items', 'children', parentId] as const,
  statuses: (projectId: string) => ['workhub', 'statuses', projectId] as const,
  transitions: (projectId: string, statusId: string) => ['workhub', 'transitions', projectId, statusId] as const,
  workTypes: (projectId: string) => ['workhub', 'types', projectId] as const,
  fixVersions: (projectId: string) => ['workhub', 'versions', projectId] as const,
  labels: (projectId: string) => ['workhub', 'labels', projectId] as const,
  linkTypes: () => ['workhub', 'linkTypes'] as const,
  comments: (workItemId: string) => ['workhub', 'comments', workItemId] as const,
  workLogs: (workItemId: string) => ['workhub', 'workLogs', workItemId] as const,
  attachments: (workItemId: string) => ['workhub', 'attachments', workItemId] as const,
  history: (workItemId: string) => ['workhub', 'history', workItemId] as const,
  links: (workItemId: string) => ['workhub', 'links', workItemId] as const,
  dashboardStats: (projectId: string) => ['workhub', 'stats', projectId] as const,
  sidebarProjects: (userId: string) => ['workhub', 'sidebar', userId] as const,
  savedFilters: (projectId: string) => ['workhub', 'filters', projectId] as const,
  columnConfig: (projectId: string, viewType: WhViewType) => ['workhub', 'columns', projectId, viewType] as const,
} as const;

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const WH_STATUS_COLORS: Record<WhStatusColorKey, { bg: string; text: string; dot: string }> = {
  gray:   { bg: '#dddee1', text: '#44546f', dot: '#8c8f96' },
  blue:   { bg: '#8fb8f6', text: '#0c3578', dot: '#1868db' },
  green:  { bg: '#b3df72', text: '#1b4d1b', dot: '#22863a' },
  red:    { bg: '#f87168', text: '#601e16', dot: '#ef4444' },
  yellow: { bg: '#f5cd47', text: '#5c4813', dot: '#d97706' },
  teal:   { bg: '#82c7c2', text: '#0d4e48', dot: '#0d9488' },
  purple: { bg: '#c597f4', text: '#3b1761', dot: '#7c3aed' },
};

export const WH_HUB_COLORS = {
  project:  { border: '#2563EB', text: '#2563EB', bg: '#EFF6FF' },
  product:  { border: '#3F3F46', text: '#3F3F46', bg: '#F4F4F5' },
  task:     { border: '#D4D4D8', text: '#71717A', bg: '#F4F4F5' },
  incident: { border: '#DC2626', text: '#DC2626', bg: '#FEF2F2' },
} as const;

export const WH_PRIORITY_CONFIG: Record<WhPriority, { label: string; color: string; bars: number }> = {
  highest: { label: 'Highest', color: '#EF4444', bars: 4 },
  high:    { label: 'High',    color: '#F97316', bars: 3 },
  medium:  { label: 'Medium',  color: '#3B82F6', bars: 2 },
  low:     { label: 'Low',     color: '#22C55E', bars: 1 },
  lowest:  { label: 'Lowest',  color: '#94A3B8', bars: 0 },
};

export const WH_DEFAULT_COLUMNS: WhColumnDef[] = [
  { field: 'checkbox',    label: '',            width: 40,  visible: true, order: 0 },
  { field: 'itemKey',     label: 'Key',         width: 140, visible: true, order: 1 },
  { field: 'summary',     label: 'Summary',     width: 0,   visible: true, order: 2 },
  { field: 'statusName',  label: 'Status',      width: 120, visible: true, order: 3 },
  { field: 'projectName', label: 'Project',     width: 140, visible: true, order: 4 },
  { field: 'hubBadge',    label: 'Hub',         width: 95,  visible: true, order: 5 },
  { field: 'priority',    label: 'Priority',    width: 80,  visible: true, order: 6 },
  { field: 'updatedAt',   label: 'Updated',     width: 110, visible: true, order: 7 },
  { field: 'reporterName',label: 'Reported by', width: 180, visible: true, order: 8 },
];

export const WH_PAGINATION = {
  defaultPageSize: 25,
  pageSizeOptions: [25, 50, 100] as const,
} as const;
