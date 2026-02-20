/**
 * Goals & Key Results — TypeScript Types
 */

export type GoalStatus = 'draft' | 'active' | 'at_risk' | 'off_track' | 'completed' | 'cancelled';
export type KRStatus = 'not_started' | 'on_track' | 'at_risk' | 'off_track' | 'completed';
export type MetricType = 'count' | 'percentage' | 'currency' | 'nps' | 'decimal_scale';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type BSCPerspective = 'Financial' | 'Customer' | 'Internal Process' | 'Learning & Growth';

export interface Goal {
  id: string;
  goal_key: string;
  title: string;
  description?: string;
  theme_id: string;
  owner_id?: string;
  status: GoalStatus;
  priority: Priority;
  progress_pct: number;
  confidence_level: number;
  weight: number;
  score_override?: number;
  fiscal_quarter?: string;
  bsc_perspective?: BSCPerspective;
  start_date?: string;
  target_date?: string;
  sort_order: number;
  is_archived: boolean;
  tags: string[];
  kr_count: number;
  ai_health_score?: number;
  created_at: string;
  updated_at: string;
  // Joined owner data
  owner_name?: string;
  owner_avatar?: string;
}

export interface GoalTreeItem extends Goal {
  theme_title: string;
  theme_color: string;
  theme_status: string;
  avg_kr_progress: number;
  weighted_kr_progress: number;
  kr_on_track: number;
  kr_at_risk: number;
  kr_off_track: number;
  kr_overdue: number;
  key_results?: KeyResult[];
  is_expanded?: boolean;
}

export interface KeyResult {
  id: string;
  kr_key: string;
  goal_id: string;
  title: string;
  description?: string;
  metric_type: MetricType;
  metric_unit?: string;
  baseline: number;
  target: number;
  current_value: number;
  progress_pct: number;
  status: KRStatus;
  owner_id?: string;
  weight: number;
  due_date?: string;
  sort_order: number;
  check_in_count: number;
  last_check_in_at?: string;
  confidence_level: number;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

export interface KRCheckin {
  id: string;
  key_result_id: string;
  checked_by?: string;
  previous_value: number;
  new_value: number;
  delta_value: number;
  confidence_level?: number;
  note?: string;
  created_at: string;
}

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

export interface CreateKRInput {
  goal_id: string;
  title: string;
  metric_type: MetricType;
  metric_unit?: string;
  baseline?: number;
  target: number;
  owner_id?: string;
  weight?: number;
  due_date?: string;
}

export interface CreateCheckinInput {
  key_result_id: string;
  new_value: number;
  confidence_level?: number;
  note?: string;
}
