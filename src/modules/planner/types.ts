// ============================================================
// PLANNER MODULE - TYPE DEFINITIONS
// ============================================================

export type PlannerView = 
  | 'boards' 
  | 'task-list' 
  | 'timeline' 
  | 'calendar' 
  | 'weekly-report' 
  | 'team-performance' 
  | 'ai-insights'
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

export interface PlannerTeam {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  emoji?: string;
  leadId?: string;
  memberCount: number;
  color: string;
}

export interface AIInsight {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  taskId?: string;
  createdAt: string;
}

export interface ColumnConfig {
  id: TaskStatus | string;
  title: string;
  color: string;
  order: number;
}

// Column configuration following spec
export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: '#94a3b8', order: 0 },
  { id: 'planned', title: 'Planned', color: '#3b82f6', order: 1 },
  { id: 'in-progress', title: 'In Progress', color: '#d97706', order: 2 },
  { id: 'review', title: 'Review', color: '#7c3aed', order: 3 },
  { id: 'done', title: 'Done', color: '#10b981', order: 4 },
];

// Priority configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; emoji: string }> = {
  critical: { label: 'Critical', color: '#ef4444', emoji: '🔴' },
  high: { label: 'High', color: '#f97316', emoji: '🟠' },
  medium: { label: 'Medium', color: '#3b82f6', emoji: '🔵' },
  low: { label: 'Low', color: '#6b7280', emoji: '⚪' },
};

// Due date groups for grouping
export const DUE_DATE_GROUPS = [
  { id: 'overdue', title: 'Overdue', color: '#ef4444' },
  { id: 'today', title: 'Due Today', color: '#f97316' },
  { id: 'thisWeek', title: 'This Week', color: '#3b82f6' },
  { id: 'nextWeek', title: 'Next Week', color: '#0d9488' },
  { id: 'later', title: 'Later', color: '#6b7280' },
  { id: 'noDueDate', title: 'No Due Date', color: '#94a3b8' },
];
