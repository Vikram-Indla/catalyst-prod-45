// ============================================================================
// TASK DETAIL MODAL V10 — TYPE DEFINITIONS
// ============================================================================

export type TaskStatus = 'Backlog' | 'Planned' | 'In Progress' | 'In Review' | 'Done';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskWorkstream = 'Catalyst' | 'Data & AI' | 'Delivery' | 'MIM' | 'Senaei';

export interface Assignee {
  id: string;
  name: string;
  initials: string;
  color: string;
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

export interface Task {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  workstream: TaskWorkstream;
  assignee?: Assignee;
  dueDate?: string;
  startDate?: string;
  labels?: string[];
  checklist?: ChecklistItem[];
  links?: TaskLink[];
  files?: TaskFile[];
  comments?: Comment[];
  history?: HistoryEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export type TabId = 'description' | 'notes' | 'checklist' | 'links' | 'files' | 'activity';

export interface Tab {
  id: TabId;
  label: string;
  badge?: number;
}
