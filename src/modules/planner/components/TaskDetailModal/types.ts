// ============================================================
// TASK DETAIL MODAL - TYPES
// TypeScript interfaces for the modal components
// ============================================================

export interface TaskModalData {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  status_id: string;
  status_slug: string;
  priority: string;
  workstream: string;
  workstream_id: string | null;
  workstream_slug: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_initials: string | null;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
  progress: number;
  blocked: boolean;
  is_completed_status: boolean;
}

export interface TaskNote {
  id: string;
  content: string;
  author: string;
  author_initials: string;
  author_color: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskLink {
  id: string;
  url: string;
  title: string;
}

export interface TaskFile {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'doc' | 'img' | 'other';
  uploaded_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'comment' | 'history';
  author: string;
  author_initials: string;
  author_color: string;
  content: string;
  action?: string;
  created_at: string;
}

export interface TaskTab {
  id: string;
  label: string;
  badge?: number;
}

// Color mappings
export const STATUS_COLORS: Record<string, string> = {
  'backlog': '#94a3b8',
  'Backlog': '#94a3b8',
  'planned': '#3b82f6',
  'Planned': '#3b82f6',
  'in_progress': '#f59e0b',
  'In Progress': '#f59e0b',
  'in-progress': '#f59e0b',
  'in_review': '#8b5cf6',
  'In Review': '#8b5cf6',
  'in-review': '#8b5cf6',
  'done': '#16a34a',
  'Done': '#16a34a',
  'completed': '#16a34a',
  'Completed': '#16a34a',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'Critical': '#dc2626',
  'high': '#f97316',
  'High': '#f97316',
  'medium': '#eab308', // Yellow
  'Medium': '#eab308',
  'low': '#94a3b8',
  'Low': '#94a3b8',
};

export const WORKSTREAM_COLORS: Record<string, string> = {
  'catalyst': '#6366f1',
  'Catalyst': '#6366f1',
  'data-ai': '#8b5cf6',
  'Data & AI': '#8b5cf6',
  'delivery': '#ec4899',
  'Delivery': '#ec4899',
  'mim': '#64748b',
  'MIM': '#64748b',
  'senaei': '#14b8a6',
  'Senaei': '#14b8a6',
};
