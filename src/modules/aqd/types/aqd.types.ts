/**
 * AQD¹⁰ TYPE DEFINITIONS
 */

export type AqdItemStatus = 'not_started' | 'in_progress' | 'completed';
export type AqdWeekStatus = 'active' | 'checkout_pending' | 'archived';
export type AqdCheckoutDecision = 'resolved' | 'carry' | 'leave';

export const AQD_STATUS_CONFIG = {
  not_started: { label: 'To Do', cssClass: 'todo', color: '#d1d5db' },
  in_progress: { label: 'In Progress', cssClass: 'in-progress', color: '#f59e0b' },
  completed: { label: 'Completed', cssClass: 'completed', color: '#10b981' },
} as const;

export const AQD_STATUS_CYCLE: Record<AqdItemStatus, AqdItemStatus> = {
  not_started: 'in_progress',
  in_progress: 'completed',
  completed: 'not_started',
};

export const AQD_LIMITS = { MAX_TOP_ITEMS: 10, MAX_OVERFLOW_ITEMS: 10, MAX_TOTAL_ITEMS: 20 } as const;

export interface AqdLabel {
  id: string;
  list_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface AqdListSettings {
  max_items: number;
  overflow_max: number;
  auto_checkout: boolean;
  week_start_day: number;
  notify_carryover: boolean;
}

export interface AqdList {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  is_archived: boolean;
  is_pinned: boolean;
  settings: AqdListSettings;
  created_at: string;
  updated_at: string;
}

export interface AqdListFull extends AqdList {
  owner_name: string | null;
  owner_avatar: string | null;
  current_week: { id: string; week_number: number; year: number; start_date: string; end_date: string; status: AqdWeekStatus } | null;
  active_item_count: number;
  completed_item_count: number;
}

export interface AqdPerformanceSummary {
  resolved: number;
  carried: number;
  unresolved: number;
  completion_rate: number;
}

export interface AqdWeek {
  id: string;
  list_id: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: AqdWeekStatus;
  performance_summary: AqdPerformanceSummary;
  checkout_notes: string | null;
  checked_out_by: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AqdWeekFull extends AqdWeek {
  total_items: number;
  completed_items: number;
  in_progress_items: number;
  not_started_items: number;
  carryover_items: number;
  pending_carryover_items: number;
}

export interface AqdItem {
  id: string;
  list_id: string;
  week_id: string;
  rank: number;
  title: string;
  description: string | null;
  status: AqdItemStatus;
  assignee_id: string | null;
  taskhub_key: string | null;
  due_date: string | null;
  is_carryover: boolean;
  carryover_from_week_id: string | null;
  carryover_count: number;
  carryover_confirmed: boolean;
  checkout_decision: AqdCheckoutDecision | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AqdItemFull extends AqdItem {
  assignee_name: string | null;
  assignee_avatar: string | null;
  created_by_name: string | null;
  labels: AqdLabel[];
  note_count: number;
}

export interface AqdCreateListInput { name: string; description?: string; settings?: Partial<AqdListSettings>; }
export interface AqdUpdateListInput { id: string; name?: string; description?: string | null; is_archived?: boolean; is_pinned?: boolean; settings?: Partial<AqdListSettings>; }
export interface AqdCreateItemInput { list_id: string; week_id: string; title: string; rank?: number; description?: string; assignee_id?: string; taskhub_key?: string; due_date?: string; label_ids?: string[]; }
export interface AqdUpdateItemInput { id: string; title?: string; description?: string | null; status?: AqdItemStatus; assignee_id?: string | null; taskhub_key?: string | null; due_date?: string | null; rank?: number; carryover_confirmed?: boolean; }
export interface AqdCheckoutItemDecision { item_id: string; decision: AqdCheckoutDecision; }
export interface AqdCheckoutWeekInput { week_id: string; decisions: AqdCheckoutItemDecision[]; }
export interface AqdSplitItems { top: AqdItemFull[]; overflow: AqdItemFull[]; }

export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return startMonth === endMonth ? `${startMonth} ${start.getDate()} – ${end.getDate()}` : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

export function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getNextStatus(current: AqdItemStatus): AqdItemStatus { return AQD_STATUS_CYCLE[current]; }
export function getStatusLabel(status: AqdItemStatus): string { return AQD_STATUS_CONFIG[status].label; }
export function getStatusCssClass(status: AqdItemStatus): string { return AQD_STATUS_CONFIG[status].cssClass; }
export function isOverflow(rank: number): boolean { return rank > AQD_LIMITS.MAX_TOP_ITEMS; }
export function splitItems(items: AqdItemFull[]): AqdSplitItems {
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  return { top: sorted.filter(i => i.rank <= 10), overflow: sorted.filter(i => i.rank > 10) };
}
export function getLabelCssClass(color: string): string {
  const colors: Record<string, string> = { '#3b82f6': 'aqd-label-finance', '#ef4444': 'aqd-label-urgent', '#8b5cf6': 'aqd-label-tech', '#f97316': 'aqd-label-sales', '#ec4899': 'aqd-label-hr', '#22c55e': 'aqd-label-q1', '#06b6d4': 'aqd-label-ops', '#64748b': 'aqd-label-legal' };
  return colors[color.toLowerCase()] || '';
}
