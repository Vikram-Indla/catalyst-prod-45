/**
 * Subtask Types and Configurations
 */

export type SubtaskType = 'frontend' | 'backend' | 'integration' | 'figma';
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
    color: 'var(--ds-background-information-bold, #3b82f6)',
    bgColor: 'var(--ds-background-information-bold, rgba(59, 130, 246, 0.1))',
  },
  backend: {
    label: 'Backend',
    icon: 'Server',
    color: 'var(--ds-chart-teal-bold, #0d9488)',
    bgColor: 'var(--ds-background-success, rgba(13, 148, 136, 0.15))',
  },
  integration: {
    label: 'Integration',
    icon: 'Plug',
    color: 'var(--ds-background-warning-bold, #f59e0b)',
    bgColor: 'var(--ds-background-warning-bold, rgba(245, 158, 11, 0.1))',
  },
  figma: {
    label: 'Figma',
    icon: 'Figma',
    color: '#a259ff',
    bgColor: 'rgba(162, 89, 255, 0.12)',
  },
} as const;

export const SUBTASK_STATUS_CONFIG = {
  todo: {
    label: 'To Do',
    color: 'var(--ds-border, #DFE1E6)',
    bgColor: 'rgba(200, 204, 208, 0.15)',
  },
  in_progress: {
    label: 'In Progress',
    color: 'var(--cp-workstream-catalyst-primary, #2563eb)',
    bgColor: 'var(--ds-background-information, rgba(37, 99, 235, 0.15))',
  },
  done: {
    label: 'Done',
    color: 'var(--ds-chart-teal-bold, #0d9488)',
    bgColor: 'var(--ds-background-success, rgba(13, 148, 136, 0.1))',
  },
} as const;
