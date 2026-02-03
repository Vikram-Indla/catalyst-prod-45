// ═══════════════════════════════════════════════════════════════════════════════
// TYPES: Task¹⁰ List Cards (Vertical Implementation)
// Purpose: Types for the new t10_list_cards view
// ═══════════════════════════════════════════════════════════════════════════════

export interface T10ListCardView {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  created_by: string;
  archived_at: string | null;
  archived_by: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  current_week_id: string | null;
  week_start: string | null;
  week_end: string | null;
  total_count: number;
  completed_count: number;
  slots_available: number;
  completion_percent: number;
  past_weeks_count: number;
  past_weeks: T10PastWeekView[];
}

export interface T10PastWeekView {
  id: string;
  week_start: string;
  week_end: string;
  completed_count: number;
  total_count: number;
  is_complete: boolean;
}

export interface T10CompletedWeekView {
  week_id: string;
  list_id: string;
  list_key: string;
  list_name: string;
  week_start: string;
  week_end: string;
  total_count: number;
  completed_count: number;
  carried_forward_count: number;
  dropped_count: number;
  completion_rate: number;
  status_badge: 'full' | 'partial' | 'low';
  checkout_at: string | null;
  checkout_by_name: string | null;
}

export interface T10WeekItemView {
  id: string;
  week_id: string;
  rank: number;
  title: string;
  description: string | null;
  status: 'todo' | 'done' | 'carried_forward' | 'dropped';
  taskhub_key: string | null;
  due_date: string | null;
  completed_at: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  list_id: string;
  list_key: string;
  list_name: string;
  labels: { id: string; name: string; color: string }[];
}

export type T10TabFilter = 'all' | 'active' | 'completed' | 'archived';
