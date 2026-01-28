/**
 * Planner Boards Types - V9
 */

export interface BoardColumn {
  id: string;
  name: string;
  slug: 'backlog' | 'planned' | 'progress' | 'review' | 'done';
  color: string;
  position: number;
  is_completed_status: boolean;
  task_count: number;
}

export interface BoardTask {
  id: string;
  key: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date: string | null;
  progress: number;
  position: number;
  blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
  // Status
  status_id: string;
  status_name: string;
  status_slug: string;
  status_color: string;
  status_position: number;
  is_completed_status: boolean;
  // Workstream
  workstream_id: string | null;
  workstream_name: string | null;
  workstream_slug: string | null;
  workstream_color: string | null;
  // Assignee
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  // Computed
  due_status: 'overdue' | 'today' | 'tomorrow' | 'upcoming' | null;
  days_until_due: number | null;
}

export interface BoardData {
  columns: BoardColumn[];
  tasks: BoardTask[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status_id: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  workstream_id?: string;
  assignee_id?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status_id?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  workstream_id?: string;
  assignee_id?: string;
  due_date?: string;
  progress?: number;
  position?: number;
  blocked?: boolean;
  blocked_reason?: string;
}

export interface MoveTaskInput {
  task_id: string;
  target_status_id: string;
  target_position: number;
}

export interface BoardFilters {
  search?: string;
  workstream_id?: string;
  assignee_id?: string;
  priority?: string;
  status?: string;
  due_status?: string;
  blocked?: boolean;
}
