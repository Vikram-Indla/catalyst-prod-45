/**
 * Subtask Types and Configurations
 */

export type SubtaskType = 'frontend' | 'backend' | 'integration' | 'technical';
export type SubtaskStatus = 'todo' | 'in_progress' | 'done';

export interface Subtask {
  id: string;
  story_id: string;
  name: string; // DB uses 'name' instead of 'title'
  description: string | null;
  type: SubtaskType;
  status: SubtaskStatus;
  assignee_id: string | null;
  release_id: string | null;
  change_number_id: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  release?: {
    id: string;
    name: string;
  } | null;
  change_number?: {
    id: string;
    number: string;
  } | null;
}

export const SUBTASK_TYPE_CONFIG = {
  frontend: {
    label: 'Frontend',
    icon: 'Palette',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  backend: {
    label: 'Backend',
    icon: 'Server',
    color: '#5c7c5c',
    bgColor: 'rgba(92, 124, 92, 0.15)',
  },
  integration: {
    label: 'Integration',
    icon: 'Plug',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  technical: {
    label: 'Technical',
    icon: 'Cog',
    color: '#8b7355',
    bgColor: 'rgba(139, 115, 85, 0.15)',
  },
} as const;

export const SUBTASK_STATUS_CONFIG = {
  todo: {
    label: 'To Do',
    color: '#c8ccd0',
    bgColor: 'rgba(200, 204, 208, 0.15)',
  },
  in_progress: {
    label: 'In Progress',
    color: '#c69c6d',
    bgColor: 'rgba(198, 156, 109, 0.15)',
  },
  done: {
    label: 'Done',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
} as const;
