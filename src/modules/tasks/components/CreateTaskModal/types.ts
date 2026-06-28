/**
 * Type definitions for Create Task Modal
 */

import type { TaskPriority } from '../../types';

// Workstream interface - data fetched from task_workstreams table
export interface Workstream {
  id: string;
  name: string;
  color: string;
}

// Priority definition per V4 spec
export interface Priority {
  value: TaskPriority;
  label: string;
  color: string;
}

export const PRIORITIES: Priority[] = [
  { value: 'critical', label: 'Critical', color: 'var(--ds-text-danger)' },
  { value: 'high', label: 'High', color: 'var(--ds-background-warning-bold)' },
  { value: 'medium', label: 'Medium', color: 'var(--ds-background-warning-bold)' },
  { value: 'low', label: 'Low', color: 'var(--ds-text-subtlest)' },
];
