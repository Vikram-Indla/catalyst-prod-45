// ═══════════════════════════════════════════════════════════════════════════════
// TASK¹⁰ TYPE DEFINITIONS
// Module: Task¹⁰ Priority Management
// Version: 3.0 (Complete Rebuild)
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export type T10ListStatus = 'active' | 'inactive' | 'archived';
export type T10WeekStatus = 'active' | 'completed' | 'archived';
export type T10ItemStatus = 'todo' | 'done';

export const T10_STATUS_COLORS = {
  active: '#22c55e',    // Green
  inactive: '#6b7280',  // Gray
  archived: '#94a3b8',  // Light gray
  completed: '#3b82f6', // Blue
} as const;

export const T10_RANK_COLORS = {
  top5: '#2563eb',      // Blue with glow for ranks 1-5
  standard: '#64748b',  // Gray for ranks 6-10
  buffer: '#94a3b8',    // Light gray dashed for 11+
} as const;

// Label color palette (15 colors)
export const T10_LABEL_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CORE ENTITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User entity (from profiles table)
 * Used for assignee dropdowns
 */
export interface T10User {
  id: string;
  email?: string;
  full_name: string | null;
  avatar_url: string | null;
  initials?: string;
}

/**
 * Label entity (from t10_labels table)
 */
export interface T10Label {
  id: string;
  name: string;
  color: string;                  // Hex color
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
}

/**
 * Base list entity (from t10_lists table)
 */
export interface T10List {
  id: string;
  key: string;                    // T10-001, T10-002, etc.
  name: string;
  description?: string | null;
  status: T10ListStatus;
  created_by: string | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * List with summary data (from t10_list_summary view)
 * Used on landing page cards
 */
export interface T10ListSummary extends T10List {
  creator_name: string | null;
  creator_avatar: string | null;
  current_week_id: string | null;
  week_start: string | null;      // ISO date string
  week_end: string | null;        // ISO date string
  week_status: T10WeekStatus | null;
  completed_count: number;
  total_count: number;
  total_weeks: number;
}

/**
 * Week entity (from t10_weeks table)
 */
export interface T10Week {
  id: string;
  list_id: string;
  week_start: string;             // ISO date string (Monday)
  week_end: string;               // ISO date string (Sunday)
  status: T10WeekStatus;
  is_current: boolean;
  completed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
  // Backward compatibility aliases
  week_start_date?: string;       // Alias for week_start
  is_checked_out?: boolean;       // Alias for status === 'completed'
  checked_out_by?: string;
  checked_out_by_name?: string;
  checked_out_at?: string;
  closed_count?: number;          // Alias for completed_count
  carried_count?: number;
}

/**
 * Week with items (for week view)
 */
export interface T10WeekWithItems extends T10Week {
  items: T10ItemFull[];
  buffer_items: T10ItemFull[];    // Items ranked 11+
}

/**
 * Base item entity (from t10_items table)
 */
export interface T10Item {
  id: string;
  week_id: string;
  rank: number;
  title: string;
  description?: string | null;
  taskhub_key?: string | null;     // TSK-123 reference
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_initials?: string;
  due_date?: string | null;        // ISO date string
  label?: string;
  status: T10ItemStatus;
  carryover_count: number;
  is_buffer?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Item with full details (from t10_items_full view)
 * Used in week view and side panel
 */
export interface T10ItemFull extends T10Item {
  assignee_avatar?: string | null;
  labels: T10Label[];
}

/**
 * Activity log entry
 */
export interface T10Activity {
  id: string;
  item_id: string;
  type: 'created' | 'updated' | 'completed' | 'ranked' | 'assigned' | 'carried';
  description: string;
  actor_name: string;
  created_at: string;
}

/**
 * Checkout decision for week completion
 */
export interface T10CheckoutDecision {
  itemId: string;
  rank: number;
  title: string;
  decision: 'resolved' | 'carry' | 'remove';
}

/**
 * AI suggested task
 */
export interface T10AITask {
  id: string;
  key: string;
  title: string;
  priority: 'critical' | 'high';
  assignee_name: string;
  due_date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPES (for mutations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create new list
 */
export interface T10ListCreateInput {
  name: string;
  description?: string;
  status?: T10ListStatus;
}

/**
 * Update existing list
 */
export interface T10ListUpdateInput {
  id: string;
  name?: string;
  description?: string;
  status?: T10ListStatus;
}

/**
 * Create new week
 */
export interface T10WeekCreateInput {
  list_id: string;
  week_start: string;             // ISO date string
  week_end: string;               // ISO date string
  is_current?: boolean;
}

/**
 * Create new item
 */
export interface T10ItemCreateInput {
  week_id: string;
  rank: number;
  title: string;
  description?: string;
  taskhub_key?: string;
  assignee_id?: string;
  due_date?: string;
  is_buffer?: boolean;
}

/**
 * Update existing item
 */
export interface T10ItemUpdateInput {
  id: string;
  rank?: number;
  title?: string;
  description?: string;
  taskhub_key?: string;
  assignee_id?: string | null;
  due_date?: string | null;
  status?: T10ItemStatus;
  is_buffer?: boolean;
}

/**
 * Reorder items (drag-drop)
 */
export interface T10ItemReorderInput {
  week_id: string;
  item_id: string;
  new_rank: number;
}

/**
 * Create new label
 */
export interface T10LabelCreateInput {
  name: string;
  color: string;
  description?: string;
}

/**
 * Add/remove labels from item
 */
export interface T10ItemLabelsInput {
  item_id: string;
  label_ids: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Date range filter options
 */
export type T10DateRangePreset = 
  | 'today'
  | 'tomorrow'
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'overdue'
  | 'custom';

/**
 * Filter state for landing page
 */
export interface T10FilterState {
  search: string;
  labels: string[];               // Label IDs
  assignees: string[];            // User IDs
  dateRange: {
    preset: T10DateRangePreset | null;
    start: string | null;         // ISO date string
    end: string | null;           // ISO date string
  };
  status: T10ListStatus | 'all';
}

/**
 * Default filter state
 */
export const T10_DEFAULT_FILTERS: T10FilterState = {
  search: '',
  labels: [],
  assignees: [],
  dateRange: {
    preset: null,
    start: null,
    end: null,
  },
  status: 'all',
};

// ─────────────────────────────────────────────────────────────────────────────
// UI STATE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Side panel state
 */
export interface T10SidePanelState {
  isOpen: boolean;
  itemId: string | null;
  mode: 'view' | 'edit';
}

/**
 * Checkout modal state
 */
export interface T10CheckoutState {
  isOpen: boolean;
  selectedItems: string[];        // Item IDs
}

/**
 * Drag state for reordering
 */
export interface T10DragState {
  isDragging: boolean;
  activeId: string | null;
  overId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic API response wrapper
 */
export interface T10ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

/**
 * Paginated response
 */
export interface T10PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED VIEW TYPES (re-export)
// ─────────────────────────────────────────────────────────────────────────────

export * from './completed';
