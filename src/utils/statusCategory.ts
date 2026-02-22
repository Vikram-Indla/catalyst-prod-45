// src/utils/statusCategory.ts — Normalizes any raw status string → 3-bucket category
export type StatusCategory = 'todo' | 'progress' | 'done';

const STATUS_MAP: Record<string, StatusCategory> = {
  // Todo
  'in requirements': 'todo', 'in design': 'todo', 'ready for dev': 'todo',
  'to do': 'todo', 'todo': 'todo', 'open': 'todo', 'reported': 'todo',
  'new': 'todo', 'backlog': 'todo', 'ready for test': 'todo',
  // Progress
  'in development': 'progress', 'in qa': 'progress', 'in progress': 'progress',
  'under implementation': 'progress', 'in investigation': 'progress',
  'in fix': 'progress', 'in execution': 'progress', 'in beta': 'progress',
  'in review': 'progress', 'in testing': 'progress', 'reopened': 'progress',
  // Done
  'done': 'done', 'resolved': 'done', 'closed': 'done',
  'in production': 'done', 'released': 'done', 'verified': 'done',
};

/**
 * Maps a raw Jira status_category ("To Do", "In Progress", "Done")
 * or a raw status string to our 3-bucket model.
 */
export function getStatusCategory(statusOrCategory: string | null | undefined): StatusCategory {
  if (!statusOrCategory) return 'progress';
  const key = statusOrCategory.toLowerCase().trim();
  // Direct match on Jira status_category values
  if (key === 'to do') return 'todo';
  if (key === 'in progress') return 'progress';
  if (key === 'done') return 'done';
  return STATUS_MAP[key] ?? 'progress';
}

export const SC_COLORS = {
  todo:     { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  progress: { dot: '#2563EB', bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
  done:     { dot: '#059669', bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
};
