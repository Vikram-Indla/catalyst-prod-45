// ============================================================
// MY TASKS MODULE - TYPE DEFINITIONS
// Planner V9: Personal Task Management Types
// Per Business Rules: User Involvement Tracking
// ============================================================

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TimeSection = 'overdue' | 'today' | 'this_week' | 'upcoming' | 'someday' | 'completed';
export type InvolvementType = 'assignee' | 'creator' | 'reporter' | 'reviewer' | 'watcher' | 'mentioned';

export interface MyTask {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  priority: TaskPriority | null;
  due_date: string | null;
  start_date: string | null;
  time_estimate_minutes: number | null;
  time_logged_minutes: number | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  
  // User involvement fields
  assignee_id: string | null;
  created_by: string | null;
  reporter_id: string | null;
  reviewer_id: string | null;
  
  parent_task_id: string | null;
  key: string | null;
  position: number | null;
  deleted_at: string | null;
  is_archived: boolean | null;
  is_starred: boolean | null;
  blocked: boolean | null;
  blocked_reason: string | null;
  progress: number | null;
  cover_url: string | null;
  
  // Status fields
  status_id: string | null;
  status_name: string | null;
  status_slug: string | null;
  status_color: string | null;
  status_is_done: boolean | null;
  
  // Workstream fields
  workstream_id: string | null;
  workstream_name: string | null;
  workstream_slug: string | null;
  workstream_color: string | null;
  
  // User name fields
  assignee_name: string | null;
  assignee_avatar: string | null;
  creator_name: string | null;
  reporter_name: string | null;
  reviewer_name: string | null;
  
  // Involvement tracking
  involvement_type: InvolvementType;
  involvement_priority: number;
  time_section: TimeSection;
}

export interface TaskSummary {
  user_id: string | null;
  total_tasks: number;
  overdue_count: number;
  today_count: number;
  this_week_count: number;
  upcoming_count: number;
  someday_count: number;
  completed_today: number;
  // Involvement breakdown
  assigned_count: number;
  created_count: number;
  needs_review_count: number;
  watching_count: number;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filter_config: FilterConfig;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface FilterConfig {
  statuses?: string[];
  workstreams?: string[];
  priorities?: TaskPriority[];
  timeSection?: TimeSection;
  searchQuery?: string;
  involvement?: InvolvementType | 'all';
}

export interface ActivityLogEntry {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'completed' | 'status_changed' | 'priority_changed' | 'assigned';
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  // Joined fields
  task_key?: string;
  task_title?: string;
  user_name?: string;
}

export interface CalendarTaskDay {
  due_date: string;
  task_count: number;
  priorities: TaskPriority[];
}

// Mutation payloads
export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status_id: string;
  workstream_id?: string;
  due_date?: string;
  time_estimate_minutes?: number;
  reporter_id?: string;
  reviewer_id?: string;
}

export interface UpdateTaskPayload {
  id: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status_id?: string;
  workstream_id?: string;
  due_date?: string | null;
  time_estimate_minutes?: number | null;
  sort_order?: number;
  assignee_id?: string | null;
  reporter_id?: string | null;
  reviewer_id?: string | null;
}

export interface BulkUpdatePayload {
  task_ids: string[];
  updates: Partial<Pick<UpdateTaskPayload, 'status_id' | 'priority' | 'workstream_id' | 'due_date' | 'assignee_id'>>;
}

// Watcher type
export interface TaskWatcher {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
}

// Mention type
export interface TaskMention {
  id: string;
  task_id: string;
  user_id: string;
  source: 'description' | 'comment';
  created_at: string;
}

// Priority configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'var(--ds-text-danger, #ef4444)', bgColor: 'var(--ds-background-danger, #fef2f2)' },
  high: { label: 'High', color: 'var(--ds-text-warning, #f59e0b)', bgColor: '#fffbeb' },
  medium: { label: 'Medium', color: '#8b5cf6', bgColor: '#f5f3ff' },
  low: { label: 'Low', color: 'var(--ds-text-subtlest, #94a3b8)', bgColor: 'var(--ds-surface-sunken, #f8fafc)' },
};

// Time section configuration
export const TIME_SECTION_CONFIG: Record<TimeSection, { label: string; icon: string; color: string }> = {
  overdue: { label: 'Overdue', icon: 'alert-circle', color: 'var(--ds-text-danger, #ef4444)' },
  today: { label: 'Today', icon: 'calendar', color: 'var(--ds-text-warning, #f59e0b)' },
  this_week: { label: 'This Week', icon: 'calendar-days', color: 'var(--ds-text-brand, #3b82f6)' },
  upcoming: { label: 'Upcoming', icon: 'calendar-plus', color: '#8b5cf6' },
  someday: { label: 'Someday', icon: 'cloud', color: 'var(--ds-text-subtlest, #94a3b8)' },
  completed: { label: 'Completed', icon: 'check-circle', color: '#10b981' },
};

// Involvement configuration
export const INVOLVEMENT_CONFIG: Record<InvolvementType, { label: string; icon: string; color: string }> = {
  assignee: { label: 'Assigned to you', icon: 'user', color: 'var(--ds-text-brand, #3b82f6)' },
  creator: { label: 'Created by you', icon: 'plus', color: '#8b5cf6' },
  reporter: { label: 'Reported by you', icon: 'clipboard', color: '#06b6d4' },
  reviewer: { label: 'Needs your review', icon: 'check-square', color: 'var(--ds-text-warning, #f59e0b)' },
  watcher: { label: "You're watching", icon: 'eye', color: 'var(--ds-text-subtlest, #64748b)' },
  mentioned: { label: 'You were mentioned', icon: 'at-sign', color: '#ec4899' },
};
