export interface StrategicTheme {
  id: string;
  title: string;
  vision_statement: string | null;
  description: string | null;
  color: string;
  status: 'active' | 'draft' | 'archived';
  priority: 'critical' | 'high' | 'medium' | 'low';
  bsc_perspective: 'financial' | 'customer' | 'internal_process' | 'learning_growth' | null;
  fiscal_year: number;
  start_date: string | null;
  target_completion: string | null;
  planned_budget: number;
  sort_order: number;
  owner_id: string | null;
  theme_group_id: string | null;
  success_metrics: Record<string, any>[];
  process_step: string | null;
  progress_pct: number;
  ai_health_score: number | null;
  is_major: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from es_themes_list_view:
  owner_name: string | null;
  owner_avatar: string | null;
  theme_group_name: string | null;
  goal_count: number;
  kr_count: number;
  initiative_count: number;
  milestone_count: number;
  budget_allocated: number;
  budget_spent: number;
}

export interface ThemeGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  organization_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThemeMilestone {
  id: string;
  theme_id: string;
  name: string;
  description: string | null;
  category: 'discover' | 'define' | 'design' | 'deliver';
  state: 'not_started' | 'in_progress' | 'completed' | 'missed';
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ThemeLink {
  id: string;
  source_theme_id: string;
  target_theme_id: string;
  link_type: 'predecessor' | 'successor' | 'related' | 'blocks' | 'depends_on';
  description: string | null;
  created_at: string;
}

export type ThemeView = 'list' | 'board' | 'timeline' | 'alignment';
export type ThemeStatus = StrategicTheme['status'];  // 'active' | 'draft' | 'archived'
export type ThemePriority = StrategicTheme['priority'];
export type BscPerspective = 'financial' | 'customer' | 'internal_process' | 'learning_growth';
export type MilestoneCategory = ThemeMilestone['category'];
export type MilestoneState = ThemeMilestone['state'];
