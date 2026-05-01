// Priorities10 Module Constants
export const T10_MODULE_SLUG = 'task10';
export const T10_ROUTE_PREFIX = '/task10';
export const T10_TOP_NAV_LABEL = 'Priorities¹⁰';
export const T10_SIDEBAR_LABEL = 'Priority Lists';

// Status
export const T10_LIST_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const T10_ITEM_STATUS = {
  TODO: 'todo',
  DONE: 'done',
} as const;

// Rank Tiers
export const T10_RANK_TIERS = {
  TOP: [1, 2, 3, 4, 5],
  MID: [6, 7, 8, 9, 10],
  BUFFER: 'buffer',
} as const;

// Colors
export const T10_COLORS = {
  brand: '#0d9488',
  brandDark: '#0f766e',
  blue: 'var(--ds-text-brand, #2563eb)',
  blueDark: 'var(--ds-background-brand-bold-hovered, #1d4ed8)',
  success: '#10b981',
  warning: 'var(--ds-text-warning, #f59e0b)',
  danger: 'var(--ds-text-danger, #ef4444)',
  purple: '#8b5cf6',
} as const;

// Activity Types - must match t10_activity_activity_type_check constraint
export const T10_ACTIVITY_TYPES = {
  CREATED: 'created',
  COMPLETED: 'completed',
  REOPENED: 'reopened',
  RANK_CHANGED: 'rank_changed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  TITLE_UPDATED: 'title_updated',
  DUE_DATE_CHANGED: 'due_date_changed',
  LABEL_CHANGED: 'label_changed',
  DESCRIPTION_UPDATED: 'description_updated',
  CARRIED_OVER: 'carried_over',
  REMOVED: 'removed',
  RESOLVED: 'resolved',
} as const;

// Labels - no defaults, user creates their own
export const T10_DEFAULT_LABELS = [] as const;
