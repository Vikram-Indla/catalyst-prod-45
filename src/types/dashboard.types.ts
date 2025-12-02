export interface ProjectMetrics {
  total_cases: number;
  total_sets: number;
  total_cycles: number;
  total_defects: number;
  draft_cases: number;
  active_cycles: number;
  open_defects: number;
}

export interface ActivityTrendData {
  date: string; // YYYY-MM-DD
  cases_created: number;
  cases_edited: number;
  executions_completed: number;
}

export interface MyWorkItem {
  id: string;
  type: 'test_case' | 'test_execution' | 'test_cycle';
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_date: string;
}

export interface ActivityFeedItem {
  id: string;
  user_name: string;
  user_avatar?: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  description: string;
  created_at: string;
}

export interface OverviewDashboardData {
  metrics: ProjectMetrics;
  activity_trends: ActivityTrendData[];
  my_work: MyWorkItem[];
  recent_activity: ActivityFeedItem[];
}

export type ActivityFilterType = 'everyone' | 'me' | 'all';
export type TrendViewType = 'cases' | 'executions' | 'sets';
export type MyWorkFilterType = 'all' | 'cases' | 'executions' | 'cycles';
