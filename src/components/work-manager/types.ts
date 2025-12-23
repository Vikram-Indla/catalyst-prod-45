// src/components/work-manager/types.ts
// Work Manager TypeScript Interfaces

export type TaskType = 'Project' | 'Task' | 'General';
export type TaskStatus = 'Backlog' | 'Planned' | 'In Progress' | 'Waiting' | 'Done';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type RecurrenceType = 'None' | 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly';
export type LinkedItemType = 'Epic' | 'Feature' | 'Story' | 'BusinessRequest';
export type DueBucket = 'overdue' | 'today' | 'next7' | 'future' | 'none';
export type AttentionLevel = 'neutral' | 'warning' | 'danger';
export type GroupByOption = 'status' | 'team' | 'assignee' | 'dueDate';

export interface LinkedItem {
  type: LinkedItemType;
  key: string;
  title?: string;
}

export interface Task {
  id: string;
  key: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  status: TaskStatus;
  assigneeId: string;
  reporterId?: string;
  teamId: string;
  boardId: string;
  columnPosition: number;
  dueDate?: string;
  blocked: boolean;
  blockedReason?: string;
  blockedAt?: string;
  linkedItem?: LinkedItem | null;
  recurrence: RecurrenceType;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Extended task with computed semantic fields
export interface TaskExtended extends Task {
  isOverdue: boolean;
  daysOverdue: number;
  dueBucket: DueBucket;
  attentionLevel: AttentionLevel;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  avatarColor?: string;
  teamId?: string;
  teamName?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  color?: string;
}

export interface Board {
  id: string;
  name: string;
  teamId: string;
  isDefault: boolean;
}

export interface BoardColumn {
  id: string;
  name: string;
  status: TaskStatus;
  position: number;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  type: 'created' | 'status_changed' | 'assigned' | 'commented' | 'edited' | 'blocked' | 'unblocked';
  field?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  createdAt: string;
}

export interface WeeklyInsight {
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  summary: {
    totalTasks: number;
    completed: number;
    inProgress: number;
    overdue: number;
    blocked: number;
  };
  status: 'on_track' | 'needs_attention' | 'at_risk';
  achieved: Task[];
  inProgress: Task[];
  notAchieved: Task[];
  blockers: Array<{ task: Task; reason: string; daysSinceBlocked: number }>;
  followUpNotes?: string;
}

export interface TeamWeeklyInsight {
  teamId: string;
  weekStartDate: string;
  weekEndDate: string;
  overallSummary: string;
  achievements: string[];
  attentionRequired: Array<{ userId: string; reason: string }>;
  individualHighlights: Array<{ userId: string; highlight: string }>;
  managerActions: string[];
}

// Column configuration for Kanban
export interface KanbanColumn {
  id: string;
  name: string;
  status: TaskStatus;
  color?: string;
}

// Filter state
export interface TaskFilters {
  search: string;
  teamId: string | null;
  assigneeId: string | null;
  status: TaskStatus | null;
  priority: Priority | null;
  type: TaskType | null;
  dueBucket: DueBucket | null;
  showBlocked: boolean | null;
}

// Drawer state
export interface TaskDrawerState {
  isOpen: boolean;
  taskId: string | null;
  activeTab: 'overview' | 'activity' | 'comments';
}