// Objectives Module - TypeScript Types (Centralized)
// OKR Module ONLY supports Portfolio and Program tiers
// Team and Solution tiers are explicitly NOT supported per governance

export type ObjectiveTier = 'portfolio' | 'program';

export type ObjectiveStatus = 
  | 'pending'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'off_track'
  | 'paused'
  | 'completed'
  | 'canceled'
  | 'missed';

export type ObjectiveHealth = 'good' | 'fair' | 'poor' | 'at_risk';

export type ObjectiveCategory = 'critical_path' | 'stretch_goal';

export type ObjectiveType = 
  | 'feature_finisher'
  | 'non_code'
  | 'incremental_delivery'
  | 'event';

export interface ObjectiveBase {
  id: string;
  name: string; // Database requires 'name' column
  summary?: string; // Optional alias
  description?: string;
  tier: ObjectiveTier;
  status: ObjectiveStatus;
  health?: ObjectiveHealth;
  category?: ObjectiveCategory;
  type?: ObjectiveType;
  owner_id?: string;
  portfolio_id?: string;
  program_id?: string;
  parent_objective_id?: string;
  parent_key_result_id?: string;
  theme_id?: string;
  anchor_sprint_id?: string;
  start_date?: string;
  due_date?: string;
  program_increment_ids: string[];
  contributors: string[];
  planned_value?: number;
  delivered_value?: number;
  is_blocked: boolean;
  notes?: string;
  tags: string[];
  score?: number;
  confidence_score?: number;
  work_progress: number;
  key_result_progress: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ObjectiveWithRelations extends ObjectiveBase {
  profiles?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
  keyResults?: any[];
  themes?: any[];
  epics?: any[];
  features?: any[];
  stories?: any[];
  risks?: any[];
  dependencies?: any[];
  impediments?: any[];
  childObjectives?: ObjectiveBase[];
}

export interface CreateObjectiveInput {
  name: string; // Required - maps to DB 'name' column
  summary?: string;
  description?: string;
  tier: ObjectiveTier;
  status?: ObjectiveStatus;
  health?: ObjectiveHealth;
  category?: ObjectiveCategory;
  type?: ObjectiveType;
  owner_id?: string;
  portfolio_id?: string;
  program_id?: string;
  parent_objective_id?: string;
  parent_key_result_id?: string;
  theme_id?: string;
  anchor_sprint_id?: string;
  start_date?: string;
  due_date?: string;
  program_increment_ids?: string[];
  contributors?: string[];
  planned_value?: number;
  delivered_value?: number;
  is_blocked?: boolean;
  notes?: string;
  tags?: string[];
}

export interface UpdateObjectiveInput {
  name?: string;
  summary?: string;
  description?: string;
  status?: ObjectiveStatus;
  health?: ObjectiveHealth;
  category?: ObjectiveCategory;
  type?: ObjectiveType;
  owner_id?: string;
  parent_objective_id?: string;
  parent_key_result_id?: string;
  theme_id?: string;
  anchor_sprint_id?: string;
  start_date?: string;
  due_date?: string;
  program_increment_ids?: string[];
  contributors?: string[];
  planned_value?: number;
  delivered_value?: number;
  is_blocked?: boolean;
  notes?: string;
  tags?: string[];
  score?: number;
  confidence_score?: number;
  work_progress?: number;
  key_result_progress?: number;
}

export interface ObjectiveFilters {
  tier?: ObjectiveTier[];
  portfolioIds?: string[];
  programIds?: string[];
  piIds?: string[];
  statuses?: ObjectiveStatus[];
  ownerIds?: string[];
  search?: string;
  myObjectives?: boolean;
  blockedOnly?: boolean;
}

export interface WorkItemAlignment {
  id: string;
  objective_id: string;
  work_item_id: string;
  work_item_type: 'epic' | 'feature' | 'story' | 'task' | 'defect';
  alignment_type: 'direct' | 'inherited';
  created_at: string;
  created_by_user_id?: string;
}

export interface ObjectiveContributor {
  id: string;
  objective_id: string;
  user_id: string;
  created_at: string;
}

export interface ObjectiveProgramIncrement {
  id: string;
  objective_id: string;
  program_increment_id: string;
  created_at: string;
}

export interface ObjectiveLinkedItem {
  id: string;
  objective_id: string;
  link_name: string;
  link_url: string;
  created_at: string;
  created_by_user_id?: string;
}
