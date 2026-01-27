/**
 * Type definitions for Create Task Modal
 */

import type { TaskPriority } from '../../types';

// Workstream definition per V4 spec
export interface Workstream {
  id: string;
  name: string;
  color: string;
}

export const WORKSTREAMS: Workstream[] = [
  { id: 'ws-senaie', name: 'Senaie', color: '#06b6d4' },
  { id: 'ws-catalyst', name: 'Catalyst', color: '#8b5cf6' },
  { id: 'ws-tahommona', name: 'Tahommona', color: '#6366f1' },
  { id: 'ws-delivery', name: 'Delivery', color: '#f97316' },
  { id: 'ws-mim', name: 'MIM', color: '#ec4899' },
  { id: 'ws-standalone', name: 'Standalone', color: '#84cc16' },
  { id: 'ws-data-ai', name: 'Data & AI', color: '#14b8a6' },
];

// Priority definition per V4 spec
export interface Priority {
  value: TaskPriority;
  label: string;
  color: string;
}

export const PRIORITIES: Priority[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'low', label: 'Low', color: '#6b7280' },
];
