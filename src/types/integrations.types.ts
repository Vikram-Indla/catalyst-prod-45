// Integrations & Advanced Features Types
// Catalyst V5 Design System

// ============ NOTIFICATION TYPES ============

export type NotificationType = 
  | 'assignment'
  | 'status_change'
  | 'cycle_complete'
  | 'deadline'
  | 'mention'
  | 'defect_linked';

export type NotificationChannel = 'in_app' | 'email' | 'slack';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  reference_type: 'cycle' | 'test_case' | 'defect' | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  event_type: NotificationType;
  is_enabled: boolean;
}

export interface NotificationTypeInfo {
  type: NotificationType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeInfo> = {
  assignment: {
    type: 'assignment',
    label: 'Assignment',
    icon: 'UserPlus',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  status_change: {
    type: 'status_change',
    label: 'Status Change',
    icon: 'RefreshCw',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  cycle_complete: {
    type: 'cycle_complete',
    label: 'Cycle Complete',
    icon: 'CheckCircle',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  deadline: {
    type: 'deadline',
    label: 'Deadline',
    icon: 'Clock',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  mention: {
    type: 'mention',
    label: 'Mention',
    icon: 'AtSign',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  defect_linked: {
    type: 'defect_linked',
    label: 'Defect Linked',
    icon: 'Bug',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
};

// ============ ACTIVITY LOG TYPES ============

export type ActivityAction = 
  | 'cycle_created'
  | 'cycle_started'
  | 'cycle_completed'
  | 'test_added'
  | 'test_removed'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'comment_added'
  | 'defect_linked'
  | 'priority_changed'
  | 'due_date_changed'
  | 'bulk_assigned'
  | 'smart_assignment_run';

export type EntityType = 'cycle' | 'test_case' | 'defect' | 'comment' | 'assignment';

export interface ActivityLogEntry {
  id: string;
  project_id: string;
  cycle_id: string | null;
  user_id: string | null;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ActivityFilters {
  userId?: string;
  action?: ActivityAction;
  entityType?: EntityType;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityActionInfo {
  action: ActivityAction;
  label: string;
  pastTense: string;
  icon: string;
  color: string;
}

export const ACTIVITY_ACTIONS: Record<ActivityAction, ActivityActionInfo> = {
  cycle_created: {
    action: 'cycle_created',
    label: 'Create Cycle',
    pastTense: 'created cycle',
    icon: 'Plus',
    color: 'text-teal-600',
  },
  cycle_started: {
    action: 'cycle_started',
    label: 'Start Cycle',
    pastTense: 'started cycle',
    icon: 'Play',
    color: 'text-teal-600',
  },
  cycle_completed: {
    action: 'cycle_completed',
    label: 'Complete Cycle',
    pastTense: 'completed cycle',
    icon: 'CheckCircle',
    color: 'text-teal-600',
  },
  test_added: {
    action: 'test_added',
    label: 'Add Test',
    pastTense: 'added test',
    icon: 'Plus',
    color: 'text-teal-600',
  },
  test_removed: {
    action: 'test_removed',
    label: 'Remove Test',
    pastTense: 'removed test',
    icon: 'Trash2',
    color: 'text-red-600',
  },
  status_changed: {
    action: 'status_changed',
    label: 'Change Status',
    pastTense: 'changed status of',
    icon: 'RefreshCw',
    color: 'text-primary',
  },
  assigned: {
    action: 'assigned',
    label: 'Assign',
    pastTense: 'assigned',
    icon: 'UserPlus',
    color: 'text-primary',
  },
  unassigned: {
    action: 'unassigned',
    label: 'Unassign',
    pastTense: 'unassigned',
    icon: 'UserMinus',
    color: 'text-slate-600',
  },
  comment_added: {
    action: 'comment_added',
    label: 'Add Comment',
    pastTense: 'commented on',
    icon: 'MessageSquare',
    color: 'text-primary',
  },
  defect_linked: {
    action: 'defect_linked',
    label: 'Link Defect',
    pastTense: 'linked defect to',
    icon: 'Bug',
    color: 'text-red-600',
  },
  priority_changed: {
    action: 'priority_changed',
    label: 'Change Priority',
    pastTense: 'changed priority of',
    icon: 'Flag',
    color: 'text-amber-600',
  },
  due_date_changed: {
    action: 'due_date_changed',
    label: 'Change Due Date',
    pastTense: 'rescheduled',
    icon: 'Calendar',
    color: 'text-primary',
  },
  bulk_assigned: {
    action: 'bulk_assigned',
    label: 'Bulk Assign',
    pastTense: 'bulk assigned tests',
    icon: 'Users',
    color: 'text-primary',
  },
  smart_assignment_run: {
    action: 'smart_assignment_run',
    label: 'Smart Assignment',
    pastTense: 'ran smart assignment for',
    icon: 'Zap',
    color: 'text-teal-600',
  },
};

// ============ ANALYTICS TYPES ============

export interface CycleAnalyticsSummary {
  total_tests: number;
  passed: number;
  failed: number;
  blocked: number;
  in_progress: number;
  not_started: number;
  pass_rate: number;
  execution_rate: number;
  avg_execution_minutes: number;
  defect_count: number;
}

export interface DailyTrendData {
  date: string;
  passed: number;
  failed: number;
  executed: number;
}

export interface ModuleData {
  module: string;
  total: number;
  passed: number;
  failed: number;
}

export interface TeamPerformanceData {
  user_id: string;
  name: string;
  avatar_url?: string;
  assigned: number;
  completed: number;
  pass_rate: number;
  avg_time: number;
}

export interface CycleAnalytics {
  summary: CycleAnalyticsSummary;
  daily_trend: DailyTrendData[];
  by_module: ModuleData[];
  team_performance: TeamPerformanceData[];
}

export interface CycleComparisonData {
  cycle_id: string;
  cycle_name: string;
  duration_days: number;
  total_tests: number;
  pass_rate: number;
  defects_found: number;
  team_velocity: number;
}

// ============ INTEGRATION TYPES ============

export type IntegrationType = 
  | 'jira'
  | 'azure_devops'
  | 'github'
  | 'gitlab'
  | 'slack'
  | 'teams'
  | 'webhook';

export interface IntegrationConfig {
  id: string;
  project_id: string;
  integration_type: IntegrationType;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationTypeInfo {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  category: 'defect_tracking' | 'cicd' | 'notifications' | 'custom';
}

export const INTEGRATION_TYPES: Record<IntegrationType, IntegrationTypeInfo> = {
  jira: {
    type: 'jira',
    name: 'Jira',
    description: 'Link tests to Jira issues and sync defect status',
    icon: 'Trello',
    category: 'defect_tracking',
  },
  azure_devops: {
    type: 'azure_devops',
    name: 'Azure DevOps',
    description: 'Connect with Azure DevOps work items',
    icon: 'Cloud',
    category: 'defect_tracking',
  },
  github: {
    type: 'github',
    name: 'GitHub',
    description: 'Trigger tests from CI/CD pipelines',
    icon: 'Github',
    category: 'cicd',
  },
  gitlab: {
    type: 'gitlab',
    name: 'GitLab',
    description: 'Integrate with GitLab CI/CD',
    icon: 'Gitlab',
    category: 'cicd',
  },
  slack: {
    type: 'slack',
    name: 'Slack',
    description: 'Send test notifications to Slack channels',
    icon: 'MessageSquare',
    category: 'notifications',
  },
  teams: {
    type: 'teams',
    name: 'Microsoft Teams',
    description: 'Send notifications to Teams channels',
    icon: 'Users',
    category: 'notifications',
  },
  webhook: {
    type: 'webhook',
    name: 'Custom Webhook',
    description: 'Send data to custom endpoints',
    icon: 'Webhook',
    category: 'custom',
  },
};

// ============ DEFECT LINK TYPES ============

export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type DefectSeverity = 'critical' | 'major' | 'minor' | 'trivial';

export interface DefectLink {
  id: string;
  cycle_id: string;
  test_case_id: string;
  external_id: string;
  external_url: string | null;
  status: DefectStatus;
  severity: DefectSeverity | null;
  title: string | null;
  synced_at: string;
  created_at: string;
}

export interface DefectLinkInput {
  cycle_id: string;
  test_case_id: string;
  external_id: string;
  external_url?: string;
  status?: DefectStatus;
  severity?: DefectSeverity;
  title?: string;
}

// ============ WEBHOOK TYPES ============

export type WebhookTrigger = 
  | 'cycle_started'
  | 'cycle_completed'
  | 'pass_rate_below_threshold'
  | 'all_tests_passed'
  | 'test_failed';

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  payload_template: string;
  secret?: string;
  triggers: WebhookTrigger[];
  threshold?: number; // For pass_rate_below_threshold
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  trigger: WebhookTrigger;
  status: 'success' | 'failed';
  response_code: number | null;
  response_body: string | null;
  delivered_at: string;
}

// ============ SLACK TYPES ============

export interface SlackConfig {
  workspace_id: string;
  workspace_name: string;
  channel_id: string;
  channel_name: string;
  access_token: string;
  bot_user_id: string;
  notifications: {
    cycle_start: boolean;
    daily_summary: boolean;
    cycle_complete: boolean;
    failure_alerts: boolean;
  };
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

// ============ EXPORT TYPES ============

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface AuditLogExportOptions {
  format: ExportFormat;
  dateFrom: string;
  dateTo: string;
  includeFiltered: boolean;
  fields: string[];
}
