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

// Dashboard Gadget System Types
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  userId: string;
  programId?: string;
  layout: DashboardLayout;
  isDefault: boolean;
  visibility: 'private' | 'team' | 'public';
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  columns: number;
  gadgets: GadgetPosition[];
}

export interface GadgetPosition {
  id: string;
  gadgetType: GadgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  config: GadgetConfig;
}

export type GadgetType =
  | 'project_overview'
  | 'top_contributors'
  | 'execution_burndown'
  | 'execution_burnup'
  | 'execution_distribution'
  | 'execution_overview'
  | 'defect_summary'
  | 'traceability_summary'
  | 'traceability_detail'
  | 'case_distribution'
  | 'user_activity'
  | 'project_activity'
  | 'project_activity_advanced';

export interface GadgetConfig {
  projectId?: string;
  cycleId?: string;
  userId?: string;
  timePeriod?: '7' | '30' | '60' | '90';
  chartType?: 'pie' | 'donut' | 'bar' | 'line' | 'heatmap';
  distributionBy?: 'folder' | 'status' | 'priority' | 'type' | 'owner';
  showIdealLine?: boolean;
  showProjections?: boolean;
  topN?: number;
  refreshInterval?: number;
  [key: string]: unknown;
}

export interface DashboardGadget {
  id: string;
  dashboardId: string;
  gadgetType: GadgetType;
  position: { x: number; y: number; width: number; height: number };
  config: GadgetConfig;
  createdAt: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  layout: DashboardLayout;
  isSystem: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface DashboardShare {
  id: string;
  dashboardId: string;
  sharedWithUserId: string;
  canEdit: boolean;
  expiresAt?: string;
  createdAt: string;
}

export const GADGET_DEFINITIONS: Record<GadgetType, {
  name: string;
  description: string;
  icon: string;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
}> = {
  project_overview: {
    name: 'Project Overview',
    description: 'High-level project health metrics',
    icon: 'LayoutDashboard',
    defaultSize: { width: 4, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 6, height: 3 },
  },
  top_contributors: {
    name: 'Top Contributors',
    description: 'Leaderboard of active users',
    icon: 'Users',
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 4 },
  },
  execution_burndown: {
    name: 'Execution Burndown',
    description: 'Cycle burndown chart',
    icon: 'TrendingDown',
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 6, height: 3 },
  },
  execution_burnup: {
    name: 'Execution Burn-up',
    description: 'Cycle burn-up chart',
    icon: 'TrendingUp',
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 6, height: 3 },
  },
  execution_distribution: {
    name: 'Execution Distribution',
    description: 'Status distribution pie/bar',
    icon: 'PieChart',
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 3 },
  },
  execution_overview: {
    name: 'Execution Overview',
    description: 'Quick cycle stats',
    icon: 'Activity',
    defaultSize: { width: 2, height: 1 },
    minSize: { width: 2, height: 1 },
    maxSize: { width: 4, height: 2 },
  },
  defect_summary: {
    name: 'Defect Summary',
    description: 'Defect distribution and trends',
    icon: 'Bug',
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 6, height: 3 },
  },
  traceability_summary: {
    name: 'Traceability Summary',
    description: 'Requirements coverage overview',
    icon: 'Link',
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 3 },
  },
  traceability_detail: {
    name: 'Traceability Detail',
    description: 'Requirements-to-cases mapping',
    icon: 'Network',
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 6, height: 4 },
  },
  case_distribution: {
    name: 'Case Distribution',
    description: 'Cases by dimension',
    icon: 'BarChart3',
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 3 },
  },
  user_activity: {
    name: 'User Activity',
    description: 'Activity by user',
    icon: 'User',
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 2, height: 1 },
    maxSize: { width: 4, height: 3 },
  },
  project_activity: {
    name: 'Project Activity',
    description: 'Recent activity feed',
    icon: 'Activity',
    defaultSize: { width: 2, height: 3 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 4 },
  },
  project_activity_advanced: {
    name: 'Activity Advanced',
    description: 'Advanced activity analysis',
    icon: 'BarChart',
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 6, height: 4 },
  },
};

export const DASHBOARD_TEMPLATES: Omit<DashboardTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'QA Manager',
    description: 'Executive overview for QA managers',
    category: 'Management',
    isSystem: true,
    layout: {
      columns: 12,
      gadgets: [
        { id: '1', gadgetType: 'project_overview', x: 0, y: 0, width: 4, height: 2, config: {} },
        { id: '2', gadgetType: 'execution_burndown', x: 4, y: 0, width: 4, height: 2, config: {} },
        { id: '3', gadgetType: 'defect_summary', x: 8, y: 0, width: 4, height: 2, config: {} },
        { id: '4', gadgetType: 'top_contributors', x: 0, y: 2, width: 4, height: 2, config: {} },
        { id: '5', gadgetType: 'traceability_summary', x: 4, y: 2, width: 4, height: 2, config: {} },
      ],
    },
  },
  {
    name: 'Tester',
    description: 'Daily view for testers',
    category: 'Execution',
    isSystem: true,
    layout: {
      columns: 12,
      gadgets: [
        { id: '1', gadgetType: 'execution_overview', x: 0, y: 0, width: 4, height: 1, config: {} },
        { id: '2', gadgetType: 'execution_distribution', x: 4, y: 0, width: 4, height: 2, config: {} },
        { id: '3', gadgetType: 'user_activity', x: 8, y: 0, width: 4, height: 2, config: {} },
        { id: '4', gadgetType: 'project_activity', x: 0, y: 1, width: 4, height: 3, config: {} },
      ],
    },
  },
  {
    name: 'Admin',
    description: 'System overview for admins',
    category: 'Administration',
    isSystem: true,
    layout: {
      columns: 12,
      gadgets: [
        { id: '1', gadgetType: 'project_overview', x: 0, y: 0, width: 6, height: 2, config: {} },
        { id: '2', gadgetType: 'project_activity_advanced', x: 6, y: 0, width: 6, height: 2, config: {} },
        { id: '3', gadgetType: 'top_contributors', x: 0, y: 2, width: 4, height: 2, config: {} },
        { id: '4', gadgetType: 'user_activity', x: 4, y: 2, width: 4, height: 2, config: {} },
      ],
    },
  },
];
