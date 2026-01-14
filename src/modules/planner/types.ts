// ============================================================
// PLANNER MODULE - TYPE DEFINITIONS
// Enhanced with Resources and AI Insights types
// ============================================================

export type PlannerView = 
  | 'boards' 
  | 'task-list' 
  | 'timeline' 
  | 'calendar' 
  | 'weekly-report' 
  | 'workstream-performance' 
  | 'ai-insights'
  | 'workstreams'
  | 'resources'
  | 'settings';

export type TaskStatus = 'backlog' | 'planned' | 'in-progress' | 'review' | 'done';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskType = 'project' | 'task' | 'general';

export type GroupByOption = 'status' | 'assignee' | 'priority' | 'reporter' | 'dueDate';

export interface PlannerTask {
  id: string;
  key: string;                    // e.g., "PLN-001"
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeOnline?: boolean;
  reporterId?: string;            // Who created/reported it
  reporterName?: string;
  reporterInitials?: string;
  teamId?: string;
  teamName?: string;
  teamEmoji?: string;
  teamColor?: string;
  startDate?: string;             // Required for timeline
  dueDate?: string;
  blocked: boolean;
  blockedReason?: string;
  progress: number;               // 0-100, manually set
  comments: number;
  attachments?: number;
  storyPoints?: number;
  tags?: string[];
  linkedItemId?: string;
  linkedItemTitle?: string;
  blockedByCount?: number;
  blocksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerUser {
  id: string;
  name: string;
  initials: string;
  role: string;
  team: string;
  teamId?: string;
  online: boolean;
  avatarUrl?: string;
  email?: string;
}

export interface PlannerWorkstream {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  emoji?: string;
  leadId?: string;
  memberCount: number;
  color: string;
}

// Alias for backward compatibility
export type PlannerTeam = PlannerWorkstream;

// ============================================================
// AI INSIGHTS TYPES
// ============================================================

export interface AIInsightMeta {
  sprint?: string;
  updated?: string;
  confidence?: string;
  members?: string;
  date?: string;
  dependencies?: string;
}

export interface AIInsight {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  taskId?: string;
  createdAt: string;
  meta?: AIInsightMeta;
}

export interface AIInsightsSummary {
  overdue: number;
  dueSoon: number;
  stale: number;
  totalActive: number;
  unassigned: number;
}

export interface TaskInsight {
  id: string;
  taskId: string;
  taskKey: string;
  title: string;
  type: 'overdue' | 'due-soon' | 'stale';
  dueInfo: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeColor?: string;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  status: TaskStatus;
}

export interface ResourceInsight {
  userId: string;
  name: string;
  initials: string;
  color: string;
  totalTasks: number;
  overdueCount: number;
  dueSoonCount: number;
}

export interface TeamInsight {
  teamId: string;
  teamName: string;
  teamColor: string;
  activeCount: number;
  overdueCount: number;
  dueSoonCount: number;
  members: ResourceInsight[];
}

export interface UnassignedTask {
  id: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  teamId?: string;
  teamName?: string;
}

export interface AIInsightsResult {
  summary: AIInsightsSummary;
  overdueTasks: TaskInsight[];
  dueSoonTasks: TaskInsight[];
  staleTasks: TaskInsight[];
  byTeam: TeamInsight[];
  unassignedTasks: UnassignedTask[];
  legacyInsights: AIInsight[];
  isLoading: boolean;
  refresh: () => void;
}

// ============================================================
// RESOURCE TYPES
// ============================================================

export interface ResourceTeam {
  teamId: string;
  teamName: string;
  teamColor: string;
  role: 'lead' | 'member';
  taskCount: number;
}

export interface PlannerResource {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  avatarColor: string;
  role: string | null;
  teams: ResourceTeam[];
  taskCount: number;
  overdueCount: number;
  dueSoonCount: number;
  staleCount: number;
}

export interface ResourceWithTasks extends PlannerResource {
  tasks: PlannerTask[];
  tasksByStatus: Record<TaskStatus, number>;
}

// ============================================================
// COLUMN CONFIGURATION
// ============================================================

export interface ColumnConfig {
  id: TaskStatus | string;
  title: string;
  color: string;
  order: number;
}

// Column configuration following spec - Catalyst V5 softer colors
export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: '#64748b', order: 0 },       // slate-500 - neutral gray
  { id: 'planned', title: 'Planned', color: '#3b82f6', order: 1 },       // blue-500 - primary blue
  { id: 'in-progress', title: 'In Progress', color: '#0d9488', order: 2 }, // teal-600 - teal accent
  { id: 'review', title: 'Review', color: '#6366f1', order: 3 },         // indigo-500 - soft indigo
  { id: 'done', title: 'Done', color: '#10b981', order: 4 },             // emerald-500 - success green
];

// Priority configuration - Catalyst V5 unified palette (no emoji circles)
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; emoji: string }> = {
  critical: { label: 'Critical', color: '#dc2626', emoji: '' },   // red-600
  high: { label: 'High', color: '#ea580c', emoji: '' },           // orange-600
  medium: { label: 'Medium', color: '#3b82f6', emoji: '' },       // blue-500
  low: { label: 'Low', color: '#64748b', emoji: '' },             // slate-500
};

// Due date groups for grouping
export const DUE_DATE_GROUPS = [
  { id: 'overdue', title: 'Overdue', color: '#dc2626' },
  { id: 'today', title: 'Due Today', color: '#ea580c' },
  { id: 'thisWeek', title: 'This Week', color: '#3b82f6' },
  { id: 'nextWeek', title: 'Next Week', color: '#0d9488' },
  { id: 'later', title: 'Later', color: '#64748b' },
  { id: 'noDueDate', title: 'No Due Date', color: '#94a3b8' },
];

// Status colors for insights - Catalyst V5 palette
export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#94a3b8',
  planned: '#3b82f6',
  'in-progress': '#0d9488',
  review: '#6366f1',
  done: '#10b981',
};

// Avatar colors for resources
export const AVATAR_COLORS = [
  '#2563eb', '#10b981', '#8b5cf6', '#d97706', '#ef4444', '#0d9488', '#ec4899', '#06b6d4',
];
