/**
 * Type definitions for Create Task Modal
 */

import type { TaskPriority } from '../../types';

// Workstream interface - data fetched from planner_workstreams table
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
  { value: 'critical', label: 'Critical', color: 'var(--ds-text-danger, #ef4444)' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'low', label: 'Low', color: '#6b7280' },
];
