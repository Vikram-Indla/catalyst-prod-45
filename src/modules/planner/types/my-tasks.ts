// ============================================================
// MY TASKS MODULE - TYPE DEFINITIONS
// Planner V9: Personal Task Management Types
// ============================================================

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TimeSection = 'overdue' | 'today' | 'this_week' | 'upcoming' | 'someday' | 'completed';

export interface MyTask {
  id: string;
  task_key: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  start_date: string | null;
  time_estimate_minutes: number | null;
  time_logged_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assignee_id: string;
  parent_task_id: string | null;
  // Status fields
  status_id: string;
  status_name: string;
  status_slug: string;
  status_color: string;
  status_is_done: boolean;
  // Workstream fields
  workstream_id: string | null;
  workstream_name: string | null;
  workstream_slug: string | null;
  workstream_color: string | null;
  // Computed fields
  subtask_total: number;
  subtask_completed: number;
  blocking_count: number;
  blocked_by_count: number;
  time_section: TimeSection;
}

export interface TaskSummary {
  overdue_count: number;
  today_count: number;
  this_week_count: number;
  upcoming_count: number;
  someday_count: number;
  completed_today: number;
  total_tasks: number;
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
}

export interface BulkUpdatePayload {
  task_ids: string[];
  updates: Partial<Pick<UpdateTaskPayload, 'status_id' | 'priority' | 'workstream_id' | 'due_date'>>;
}

// Priority configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bgColor: '#fef2f2' },
  high: { label: 'High', color: '#f59e0b', bgColor: '#fffbeb' },
  medium: { label: 'Medium', color: '#8b5cf6', bgColor: '#f5f3ff' },
  low: { label: 'Low', color: '#94a3b8', bgColor: '#f8fafc' },
};

// Time section configuration
export const TIME_SECTION_CONFIG: Record<TimeSection, { label: string; icon: string; color: string }> = {
  overdue: { label: 'Overdue', icon: 'alert-circle', color: '#ef4444' },
  today: { label: 'Today', icon: 'calendar', color: '#f59e0b' },
  this_week: { label: 'This Week', icon: 'calendar-days', color: '#3b82f6' },
  upcoming: { label: 'Upcoming', icon: 'calendar-plus', color: '#8b5cf6' },
  someday: { label: 'Someday', icon: 'cloud', color: '#94a3b8' },
  completed: { label: 'Completed', icon: 'check-circle', color: '#10b981' },
};
