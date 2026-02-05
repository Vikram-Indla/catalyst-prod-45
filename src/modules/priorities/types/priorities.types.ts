// ============================================================
// PRIORITIES MODULE — Type Definitions & Helpers
// ============================================================
// File: src/modules/priorities/types/priorities.types.ts
// ============================================================

// ======================== ENUMS ========================

export type PriItemStatus = 'todo' | 'in_progress' | 'completed';
export type PriWeekStatus = 'active' | 'checked_out' | 'archived';
export type PriListStatus = 'active' | 'archived';
export type PriCheckoutDecision = 'resolved' | 'carry' | 'leave';

export type PriWorkstream =
  | 'senaie'
  | 'catalyst'
  | 'tahommona'
  | 'delivery'
  | 'mim'
  | 'standalone'
  | 'dataai';

export type PriHistoryAction =
  | 'created'
  | 'status_changed'
  | 'rank_changed'
  | 'assigned'
  | 'title_changed'
  | 'description_changed'
  | 'label_added'
  | 'label_removed'
  | 'carried_over'
  | 'checked_out'
  | 'deleted';

// ======================== BASE TYPES ========================

export interface PriList {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  workstream: PriWorkstream | null;
  status: PriListStatus;
  created_at: string;
  updated_at: string;
}

export interface PriWeek {
  id: string;
  list_id: string;
  week_start: string;
  week_end: string;
  status: PriWeekStatus;
  checked_out_at: string | null;
  checked_out_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriItem {
  id: string;
  list_id: string;
  week_id: string;
  title: string;
  description: string | null;
  status: PriItemStatus;
  rank: number;
  assignee_id: string | null;
  task_key: string | null;
  is_carryover: boolean;
  source_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriLabel {
  id: string;
  list_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PriItemLabel {
  id: string;
  item_id: string;
  label_id: string;
  created_at: string;
}

export interface PriItemNote {
  id: string;
  item_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PriItemHistory {
  id: string;
  item_id: string;
  actor_id: string | null;
  action: PriHistoryAction;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// ======================== VIEW TYPES (Enriched) ========================

export interface PriLabelSummary {
  id: string;
  name: string;
  color: string;
}

export interface PriItemFull extends PriItem {
  assignee_name: string | null;
  assignee_avatar: string | null;
  labels: PriLabelSummary[];
  note_count: number;
}

export interface PriListFull extends PriList {
  owner_name: string | null;
  owner_avatar: string | null;
  current_week_id: string | null;
  current_week_start: string | null;
  current_week_end: string | null;
  total_weeks: number;
  active_item_count: number;
  completed_item_count: number;
}

export interface PriWeekFull extends PriWeek {
  checked_out_by_name: string | null;
  total_items: number;
  todo_count: number;
  in_progress_count: number;
  completed_count: number;
  carryover_count: number;
  top_count: number;
  overflow_count: number;
}

// ======================== INPUT TYPES ========================

export interface PriCreateListInput {
  title: string;
  description?: string;
  workstream?: PriWorkstream;
}

export interface PriUpdateListInput {
  id: string;
  title?: string;
  description?: string;
  workstream?: PriWorkstream;
  status?: PriListStatus;
}

export interface PriCreateItemInput {
  list_id: string;
  week_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  task_key?: string;
}

export interface PriUpdateItemInput {
  id: string;
  title?: string;
  description?: string;
  status?: PriItemStatus;
  rank?: number;
  assignee_id?: string | null;
  task_key?: string | null;
}

export interface PriCreateLabelInput {
  list_id: string;
  name: string;
  color: string;
}

export interface PriCreateNoteInput {
  item_id: string;
  content: string;
}

export interface PriCheckoutDecisionItem {
  item_id: string;
  decision: PriCheckoutDecision;
}

export interface PriCheckoutInput {
  week_id: string;
  decisions: PriCheckoutDecisionItem[];
}

// ======================== UI STATE TYPES ========================

export interface PriAssigneeOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface PriItemsSplit {
  top: PriItemFull[];      // rank 1-10
  overflow: PriItemFull[];  // rank 11+
  all: PriItemFull[];       // everything sorted
}

export type PriTabView = 'this_week' | 'completed' | 'archived';

export interface PriFilterState {
  labels: string[];        // label IDs
  assignees: string[];     // user IDs
  dateRange: { start: string; end: string } | null;
  status: PriListStatus | null;
}

export interface PriToast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
}
