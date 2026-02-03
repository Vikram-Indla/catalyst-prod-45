// ═══════════════════════════════════════════════════════════════════════════════
// TYPES: Completed Lists
// Task¹⁰ Priority Management Module
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Summary stats for the completed section header
 */
export interface T10CompletedSummaryStats {
  total_lists_completed: number;
  total_weeks_completed: number;
  avg_completion_rate: number;
  total_items_completed: number;
  total_carried_forward: number;
  total_dropped: number;
}

/**
 * Completed week row in the main table
 */
export interface T10CompletedWeek {
  week_id: string;
  list_id: string;
  list_key: string;
  list_name: string;
  week_start: string;
  week_end: string;
  week_status: string;
  checkout_at: string | null;
  checkout_by: string | null;
  checkout_by_name: string | null;
  checkout_by_avatar: string | null;
  total_count: number;
  completed_count: number;
  carried_forward_count: number;
  dropped_count: number;
  completion_rate: number;
  week_number: number;
  total_weeks_in_list: number;
}

/**
 * Item detail for expanded row verification
 */
export interface T10CompletedItem {
  item_id: string;
  week_id: string;
  rank: number;
  title: string;
  description: string | null;
  taskhub_key: string | null;
  due_date: string | null;
  item_status: 'completed' | 'carried_forward' | 'dropped';
  completed_at: string | null;
  carryover_count: number;
  is_buffer: boolean;
  carried_from_week_id: string | null;
  item_created_at: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  list_key: string;
  list_name: string;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

/**
 * List performance data for modal
 */
export interface T10ListPerformance {
  list_id: string;
  list_key: string;
  list_name: string;
  total_weeks: number;
  avg_completion_rate: number;
  total_completed: number;
  total_carried_forward: number;
  weeks_breakdown: Array<{
    week_id: string;
    week_start: string;
    week_end: string;
    total: number;
    completed: number;
    carried_forward: number;
    rate: number;
  }>;
  recurring_carryovers: Array<{
    title: string;
    carry_count: number;
  }> | null;
}

/**
 * Filter options for completed view
 */
export interface T10CompletedFiltersState {
  dateRange: 'last7' | 'last30' | 'last90' | 'thisYear' | 'custom';
  startDate?: string;
  endDate?: string;
  listId?: string;
  minRate?: number;
}

// Alias for backward compatibility
export type T10CompletedFilters = T10CompletedFiltersState;

/**
 * Checkout result from RPC
 */
export interface T10CheckoutResult {
  week_id: string;
  completed_count: number;
  carried_forward_count: number;
  dropped_count: number;
  total_count: number;
  next_week_id: string | null;
  checkout_at: string;
}
