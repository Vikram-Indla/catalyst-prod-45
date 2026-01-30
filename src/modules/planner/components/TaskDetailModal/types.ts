/**
 * TASK DETAIL MODAL — TypeScript Interfaces
 * Based on specification document
 */

export interface TaskModalData {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  status_id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  workstream: string | null;
  workstream_id: string | null;
  workstream_color: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  due_date: string | null;
  start_date: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface Assignee {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_url?: string | null;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  createdAt: string;
  isEdited: boolean;
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
  uploadedAt: string;
  url: string;
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  createdAt: string;
}

export interface HistoryEvent {
  id: string;
  action: string;
  author: string;
  timestamp: string;
}

export interface TaskModalTab {
  id: string;
  label: string;
  badge?: number;
}

// Color mappings
export const STATUS_COLORS: Record<string, string> = {
  'Backlog': '#94a3b8',
  'Planned': '#3b82f6',
  'In Progress': '#f59e0b',
  'In Review': '#8b5cf6',
  'Done': '#16a34a',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308',
  'low': '#94a3b8',
};

export const WORKSTREAM_COLORS: Record<string, string> = {
  'Catalyst': '#6366f1',
  'Data & AI': '#8b5cf6',
  'Delivery': '#ec4899',
  'MIM': '#64748b',
  'Senaei': '#14b8a6',
};
