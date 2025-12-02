// Key Results Module - TypeScript Types

export type MetricType = 'count' | 'currency' | 'percentage' | 'decimal_score' | 'nps';

export interface KeyResult {
  id: string;
  summary: string;
  objective_id: string;
  metric_type: MetricType;
  baseline_value?: number;
  current_value?: number;
  goal_value: number;
  owner_user_id?: string;
  rank: number;
  score_override?: number;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
}

export interface KeyResultCheckIn {
  id: string;
  key_result_id: string;
  value: number;
  note_richtext?: string;
  checked_in_at: string;
  created_by_user_id?: string;
  created_at: string;
}

export interface KeyResultWithProfile extends KeyResult {
  profiles?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
  checkins?: KeyResultCheckIn[];
}

export interface CreateKeyResultInput {
  summary: string;
  objective_id: string;
  metric_type: MetricType;
  baseline_value?: number;
  current_value?: number;
  goal_value: number;
  owner_user_id?: string;
  rank?: number;
}

export interface UpdateKeyResultInput {
  summary?: string;
  metric_type?: MetricType;
  baseline_value?: number;
  current_value?: number;
  goal_value?: number;
  owner_user_id?: string;
  rank?: number;
  score_override?: number;
}

export interface CreateCheckInInput {
  key_result_id: string;
  value: number;
  note_richtext?: string;
  checked_in_at: string;
}
