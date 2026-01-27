/**
 * Planner Dashboard Types - V9
 */

export interface DashboardMetrics {
  total_tasks: number;
  overdue_count: number;
  blocked_count: number;
  completed_this_week: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export interface StatusDistribution {
  status_id: string;
  status_name: string;
  status_slug: 'backlog' | 'planned' | 'progress' | 'review' | 'done';
  status_color: string;
  position: number;
  task_count: number;
  percentage: number;
}

export interface WorkstreamHealth {
  workstream_id: string;
  workstream_name: string;
  workstream_slug: string;
  workstream_color: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  completion_percentage: number;
  health_status: 'on-track' | 'at-risk' | 'critical';
}

export interface UpcomingDeadline {
  id: string;
  key: string;
  title: string;
  due_date: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status_name: string;
  status_slug: string;
  status_color: string;
  workstream_name: string | null;
  workstream_slug: string | null;
  workstream_color: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  due_status: 'overdue' | 'today' | 'tomorrow' | 'upcoming';
  days_until_due: number;
}

export interface TeamWorkload {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  assigned_tasks: number;
  in_progress_count: number;
  overdue_count: number;
  workload_status: 'overloaded' | 'busy' | 'available';
}

export interface DashboardData {
  metrics: DashboardMetrics | null;
  statusDistribution: StatusDistribution[];
  workstreamHealth: WorkstreamHealth[];
  upcomingDeadlines: UpcomingDeadline[];
  teamWorkload: TeamWorkload[];
  unassignedCount: number;
}
