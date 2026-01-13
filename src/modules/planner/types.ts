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
  teamId?: string;
  startDate?: string;
  dueDate?: string;
  blocked: boolean;
  blockedReason?: string;
  progress: number;               // 0-100, manually set
  comments: number;
  tags?: string[];
  linkedItemId?: string;
  linkedItemTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerUser {
  id: string;
  name: string;
  initials: string;
  role: string;
  team: string;
  online: boolean;
  avatarUrl?: string;
}

export interface PlannerTeam {
  id: string;
  name: string;
  shortName: string;
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
  id: TaskStatus;
  title: string;
  color: string;
  wipLimit?: number;
}

// Column configuration following spec
export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: '#94a3b8' },
  { id: 'planned', title: 'Planned', color: '#3b82f6' },
  { id: 'in-progress', title: 'In Progress', color: '#d97706', wipLimit: 5 },
  { id: 'review', title: 'Review', color: '#7c3aed', wipLimit: 3 },
  { id: 'done', title: 'Done', color: '#10b981' },
];

// Priority configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; emoji: string }> = {
  critical: { label: 'Critical', color: '#ef4444', emoji: '🔴' },
  high: { label: 'High', color: '#f97316', emoji: '🟠' },
  medium: { label: 'Medium', color: '#3b82f6', emoji: '🔵' },
  low: { label: 'Low', color: '#6b7280', emoji: '⚪' },
};
