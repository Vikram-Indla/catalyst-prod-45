// Strategic Backlog Types

export type StrategyObjectStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface StrategyMission {
  id: string;
  enterprise_id?: string;
  title: string;
  statement?: string;
  owner_id?: string;
  status: StrategyObjectStatus;
  created_at: string;
  updated_at: string;
}

export interface StrategyVision {
  id: string;
  enterprise_id?: string;
  title: string;
  statement?: string;
  owner_id?: string;
  status: StrategyObjectStatus;
  created_at: string;
  updated_at: string;
}

export interface StrategyValue {
  id: string;
  enterprise_id?: string;
  title: string;
  statement?: string;
  owner_id?: string;
  status: StrategyObjectStatus;
  created_at: string;
  updated_at: string;
}

export interface StrategicGoal {
  id: string;
  snapshot_id?: string;
  title: string;
  description?: string;
  owner_id?: string;
  health_status?: 'GREEN' | 'AMBER' | 'RED';
  complete_percent?: number;
  score?: number;
  status?: string;
  tier?: string;
  parent_goal_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StrategicTheme {
  id: string;
  name: string;
  description?: string;
  owner_id?: string;
  status?: 'active' | 'draft' | 'archived';
  color_tag?: string;
  start_date?: string;
  end_date?: string;
  snapshot_id: string;
  created_at: string;
  updated_at: string;
}

export interface SnapshotStrategyLinks {
  id: string;
  snapshot_id: string;
  mission_ids: string[];
  vision_ids: string[];
  value_ids: string[];
  goal_ids: string[];
  theme_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateMissionInput {
  title: string;
  statement?: string;
  owner_id?: string;
  status?: StrategyObjectStatus;
}

export interface CreateVisionInput {
  title: string;
  statement?: string;
  owner_id?: string;
  status?: StrategyObjectStatus;
}

export interface CreateValueInput {
  title: string;
  statement?: string;
  owner_id?: string;
  status?: StrategyObjectStatus;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  owner_id?: string;
  health_status?: 'GREEN' | 'AMBER' | 'RED';
  complete_percent?: number;
  status?: string;
  snapshot_id?: string;
}

export interface CreateThemeInput {
  name: string;
  description?: string;
  owner_id?: string;
  status?: 'active' | 'draft' | 'archived';
  color_tag?: string;
  snapshot_id: string;
}
