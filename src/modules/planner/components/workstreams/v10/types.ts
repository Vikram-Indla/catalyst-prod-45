// ============================================================
// WORKSTREAMS V10 TYPES
// Type definitions for workstream cards, health, and activities
// ============================================================

export type HealthStatus = 'healthy' | 'at-risk' | 'critical' | 'locked';
export type HealthTrend = 'up' | 'down' | 'stable';
export type ViewMode = 'list' | 'grid';
export type HealthFilter = 'all' | 'healthy' | 'at-risk' | 'critical';
export type LeadFilter = 'all' | string;

export interface WorkstreamMemberV10 {
  id: string;
  user_id: string;
  role: 'lead' | 'member';
  initials: string;
  color: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  capacity_percent?: number;
  task_count?: number;
  workstream_count?: number;
}

export interface WorkstreamDataV10 {
  id: string;
  name: string;
  code: string;
  color: string;
  description: string | null;
  task_count: number;
  overdue_count: number;
  completed_count: number;
  in_progress_count: number;
  backlog_count: number;
  progress: number;
  members: WorkstreamMemberV10[];
  health: HealthStatus;
  healthTrend: HealthTrend;
  lead: WorkstreamMemberV10 | null;
  isLocked: boolean;
  isMember: boolean;
  created_at: string | null;
  start_date: string | null;
  due_date: string | null;
}

export interface WorkstreamsSummaryV10 {
  totalWorkstreams: number;
  totalTasks: number;
  overallProgress: number;
  healthyCount: number;
  atRiskCount: number;
  criticalCount: number;
}

// Activity Types
export type ActivityAction = 
  | 'created'
  | 'health_changed'
  | 'lead_changed'
  | 'member_added'
  | 'member_removed'
  | 'description_updated'
  | 'settings_updated'
  | 'archived'
  | 'unarchived';

export interface WorkstreamActivity {
  id: string;
  workstream_id: string;
  user_id: string | null;
  user_name: string;
  user_initials: string;
  user_color: string;
  action_type: ActivityAction;
  action_data: Record<string, unknown> | null;
  created_at: string;
  formatted_time: string;
}

// Health calculation logic per spec
export function calculateHealth(
  overdueCount: number,
  taskCount: number,
  completedCount: number,
  backlogCount: number
): HealthStatus {
  if (taskCount === 0) return 'healthy';
  
  const overdueRate = overdueCount / taskCount;
  const progressRate = completedCount / taskCount;
  
  // Critical: >30% overdue OR <25% progress with tasks in backlog
  if (overdueRate > 0.3 || (progressRate < 0.25 && backlogCount > 5)) {
    return 'critical';
  }
  
  // At Risk: >15% overdue OR <50% progress midway through sprint
  if (overdueRate > 0.15 || progressRate < 0.5) {
    return 'at-risk';
  }
  
  return 'healthy';
}

// Calculate health trend based on recent changes
export function calculateHealthTrend(
  currentOverdue: number,
  previousOverdue: number,
  currentProgress: number,
  previousProgress: number
): HealthTrend {
  // If progress improved or overdue decreased, trending up
  if (currentProgress > previousProgress || currentOverdue < previousOverdue) {
    return 'up';
  }
  // If progress decreased or overdue increased, trending down
  if (currentProgress < previousProgress || currentOverdue > previousOverdue) {
    return 'down';
  }
  return 'stable';
}

// Generate workstream code from name
export function getWorkstreamCode(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

// Generate consistent color from name
export function getColorFromName(name: string): string {
  const colors = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from full name
export function getInitials(fullName: string | null): string {
  if (!fullName) return '??';
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
