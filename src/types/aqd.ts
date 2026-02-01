// Aqd¹⁰ Module Types - Executive Priority Management
// Weekly top 10 priorities with checkout workflow

// Enums
export type AqdItemStatus = 'not_started' | 'in_progress' | 'completed';
export type AqdWeekStatus = 'active' | 'checkout_pending' | 'archived';
export type AqdCheckoutDecision = 'resolved' | 'carry' | 'leave';

// Label colors (outline style)
export const AQD_LABEL_COLORS = {
  blue: { border: '#3b82f6', text: '#3b82f6' },
  purple: { border: '#8b5cf6', text: '#8b5cf6' },
  pink: { border: '#ec4899', text: '#ec4899' },
  red: { border: '#ef4444', text: '#ef4444' },
  orange: { border: '#f97316', text: '#f97316' },
  yellow: { border: '#eab308', text: '#eab308' },
  green: { border: '#22c55e', text: '#22c55e' },
  teal: { border: '#14b8a6', text: '#14b8a6' },
  gray: { border: '#6b7280', text: '#6b7280' },
} as const;

export type AqdLabelColor = keyof typeof AQD_LABEL_COLORS;

// Base types
export interface AqdLabel {
  id: string;
  list_id: string;
  name: string;
  color: AqdLabelColor;
  created_at: string;
}

export interface AqdItemNote {
  id: string;
  item_id: string;
  content: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface AqdItemHistory {
  id: string;
  item_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_by_name?: string;
  changed_at: string;
}

export interface AqdItem {
  id: string;
  list_id: string;
  week_id: string;
  rank: number;
  title: string;
  description?: string;
  status: AqdItemStatus;
  assignee_id?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  due_date?: string;
  taskhub_key?: string;
  taskhub_title?: string;
  is_carryover: boolean;
  carryover_from_week_id?: string;
  carryover_confirmed: boolean;
  checkout_decision?: AqdCheckoutDecision;
  labels: AqdLabel[];
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AqdWeek {
  id: string;
  list_id: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: AqdWeekStatus;
  checkout_completed_at?: string;
  checkout_completed_by?: string;
  performance_summary?: {
    resolved_count: number;
    carried_count: number;
    unresolved_count: number;
    item_decisions?: { title: string; decision: AqdCheckoutDecision }[];
  };
  created_at: string;
}

export interface AqdList {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_by_name?: string;
  created_by_avatar?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_pinned: boolean;
  settings?: Record<string, unknown>;
  // From view
  current_week_id?: string;
  current_week_number?: number;
  current_week_start?: string;
  current_week_end?: string;
  current_week_status?: AqdWeekStatus;
  item_count?: number;
  completed_count?: number;
  last_checkout_at?: string;
}

// Form/Input types
export interface CreateAqdListInput {
  name: string;
  description?: string;
}

export interface CreateAqdItemInput {
  list_id: string;
  week_id: string;
  title: string;
  taskhub_key?: string;
}

export interface UpdateAqdItemInput {
  id: string;
  title?: string;
  status?: AqdItemStatus;
  assignee_id?: string | null;
  due_date?: string | null;
  description?: string;
}

export interface ReorderAqdItemsInput {
  items: { id: string; rank: number }[];
}

export interface CheckoutDecisionInput {
  item_id: string;
  decision: AqdCheckoutDecision;
}

export interface CheckoutWeekInput {
  week_id: string;
  decisions: CheckoutDecisionInput[];
}

// TaskHub lookup response
export interface TaskHubLookupResult {
  task_key: string;
  title: string;
  assignee_id?: string;
  assignee_name?: string;
  labels?: string[];
}

// Week performance (from view)
export interface AqdWeekPerformance {
  id: string;
  list_id: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: AqdWeekStatus;
  resolved_count: number;
  carried_count: number;
  unresolved_count: number;
  item_decisions?: { title: string; decision: AqdCheckoutDecision }[];
}

// Status cycle order
export const STATUS_CYCLE: AqdItemStatus[] = ['not_started', 'in_progress', 'completed'];

export function getNextStatus(current: AqdItemStatus): AqdItemStatus {
  const currentIndex = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
}

// Status display config
export const STATUS_CONFIG: Record<AqdItemStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'To Do', color: '#6b7280', bgColor: 'transparent' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bgColor: '#f59e0b' },
  completed: { label: 'Completed', color: '#10b981', bgColor: '#10b981' },
};
