/**
 * Goals & Key Results Module — TypeScript Types
 * Aligned with es_goals, es_key_results, es_kr_checkins, es_goal_dependencies schema
 * 
 * NOTE: Column name mapping from spec → actual DB:
 *   baseline → start_value
 *   target → target_value
 *   metric_unit → unit
 *   checked_by → author_id
 *   new_value → value
 *   note → notes
 */

// ── Enums ──

export type GoalStatus = 'draft' | 'active' | 'at_risk' | 'off_track' | 'on_track' | 'completed' | 'cancelled' | 'not_started' | 'in_progress' | 'achieved';
export type KRStatus = 'not_started' | 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'in_progress' | 'achieved' | 'cancelled';
export type MetricType = 'count' | 'percentage' | 'currency' | 'number' | 'binary' | 'nps' | 'decimal_scale';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type BSCPerspective = 'Financial' | 'Customer' | 'Internal Process' | 'Learning & Growth';
export type DependencyType = 'depends_on' | 'blocks' | 'related';

// ── Core Interfaces ──

export interface Goal {
  id: string;
  goal_key: string;
  title: string;
  description?: string | null;
  theme_id: string;
  owner_id?: string | null;
  status: GoalStatus;
  priority: Priority;
  progress_pct: number;
  confidence_level: number;
  weight: number;
  score_override?: number | null;
  fiscal_quarter?: string | null;
  bsc_perspective?: BSCPerspective | null;
  start_date?: string | null;
  target_date?: string | null;
  sort_order: number;
  is_archived: boolean;
  tags: string[];
  kr_count: number;
  check_in_count: number;
  last_check_in_at?: string | null;
  ai_health_score?: number | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface GoalTreeItem extends Goal {
  // Joined from es_goals_tree_view
  theme_title: string;
  theme_color: string;
  theme_status: string;
  owner_name?: string | null;
  owner_avatar?: string | null;
  kr_completed: number;
  avg_kr_progress: number;
  weighted_kr_progress: number;
  kr_on_track: number;
  kr_at_risk: number;
  kr_off_track: number;
  kr_overdue: number;
  dependency_count: number;
  // Client-side
  key_results?: KeyResult[];
  is_expanded?: boolean;
}

export interface KeyResult {
  id: string;
  kr_key: string;
  goal_id: string;
  title: string;
  description?: string | null;
  metric_type: MetricType;
  unit?: string | null;         // DB column: unit (spec called it metric_unit)
  start_value: number;          // DB column: start_value (spec called it baseline)
  target_value: number;         // DB column: target_value (spec called it target)
  current_value: number;
  progress_pct: number;
  status: KRStatus;
  owner_id?: string | null;
  weight: number;
  start_date?: string | null;
  due_date?: string | null;
  sort_order: number;
  check_in_count: number;
  last_check_in_at?: string | null;
  confidence_level?: string | null; // DB stores as text ('high','medium','low')
  scoring_method?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  // Joined
  owner_name?: string;
  owner_avatar?: string;
}

export interface KRCheckin {
  id: string;
  key_result_id: string;
  author_id?: string | null;     // DB column: author_id (spec called it checked_by)
  previous_value?: number | null;
  value: number;                  // DB column: value (spec called it new_value)
  confidence_level?: number | null;
  notes?: string | null;          // DB column: notes (spec called it note)
  check_in_date: string;
  created_at: string;
  // Joined
  checker_name?: string;
}

export interface GoalDependency {
  id: string;
  source_goal_id: string;
  target_goal_id: string;
  dependency_type: DependencyType;
  note?: string | null;
  created_at: string;
  created_by?: string | null;
}

// ── Form / Input Types ──

export interface CreateGoalInput {
  title: string;
  description?: string;
  theme_id: string;
  owner_id?: string;
  status?: GoalStatus;
  priority?: Priority;
  confidence_level?: number;
  fiscal_quarter?: string;
  bsc_perspective?: BSCPerspective;
  start_date?: string;
  target_date?: string;
  weight?: number;
  tags?: string[];
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
  score_override?: number | null;
  is_archived?: boolean;
  sort_order?: number;
}

export interface CreateKRInput {
  goal_id: string;
  title: string;
  metric_type: MetricType;
  unit?: string;
  start_value?: number;
  target_value: number;
  owner_id?: string;
  weight?: number;
  due_date?: string;
}

export interface UpdateKRInput extends Partial<CreateKRInput> {
  id: string;
  current_value?: number;
  status?: KRStatus;
}

export interface CreateCheckinInput {
  key_result_id: string;
  value: number;           // maps to DB 'value' column
  confidence_level?: number;
  notes?: string;          // maps to DB 'notes' column
}

// ── Stats ──

export interface GoalsStats {
  total_goals: number;
  on_track_pct: number;
  avg_progress: number;
  total_krs: number;
  overdue_krs: number;
}
