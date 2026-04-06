/**
 * ═══════════════════════════════════════════════════════════════════
 * CATALYST NOTIFICATION TRIGGERS — TYPE DEFINITIONS
 * Types for the admin notification trigger management system.
 * Supports notification schemes, trigger configs, recipient/channel
 * overrides, and project-level scheme assignments.
 *
 * Benchmarked against Atlassian Jira Notification Schemes.
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  HubSource,
  TriggerCategory,
  TriggerPriority,
  RecipientType,
  NotificationChannel,
  NotificationTabRoute,
} from '@/constants/notificationEvents';

// ── Re-export for convenience ───────────────────────────────────
export type {
  HubSource,
  TriggerCategory,
  TriggerPriority,
  RecipientType,
  NotificationChannel,
  NotificationTabRoute,
};

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION TRIGGER CONFIG (per-trigger admin settings)
// Maps to `notification_trigger_config` table
// ═══════════════════════════════════════════════════════════════════

export interface NotificationTriggerConfig {
  id: string;
  trigger_key: string;
  hub_source: HubSource;
  display_name: string;
  description: string;
  category: TriggerCategory;
  priority: TriggerPriority;
  recipients_config: RecipientsConfig;
  channels_config: ChannelsConfig;
  default_enabled: boolean;
  is_mandatory: boolean;
  scope: 'global' | 'project';
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipientsConfig {
  assignee: boolean;
  owner: boolean;
  reporter: boolean;
  creator: boolean;
  watchers: boolean;
  mentioned_users: boolean;
  team_members: boolean;
  project_lead: boolean;
  approvers: boolean;
  parent_owner: boolean;
  previous_assignee: boolean;
  custom_roles: string[];
}

export interface ChannelsConfig {
  in_app: boolean;
  email: boolean;
  toast: boolean;
  slack: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION SCHEME (like Jira Notification Schemes)
// Maps to `notification_scheme` table
// ═══════════════════════════════════════════════════════════════════

export interface NotificationScheme {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Populated client-side — count of rules in this scheme */
  rule_count?: number;
  /** Populated client-side — count of projects using this scheme */
  project_count?: number;
}

export interface CreateSchemeInput {
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdateSchemeInput {
  name?: string;
  description?: string;
  is_default?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION SCHEME RULES (individual trigger overrides in scheme)
// Maps to `notification_scheme_rules` table
// ═══════════════════════════════════════════════════════════════════

export interface NotificationSchemeRule {
  id: string;
  scheme_id: string;
  trigger_key: string;
  hub_source: HubSource;
  enabled: boolean;
  channels: ChannelsConfig | null;
  recipients: RecipientsConfig | null;
  created_at: string;
}

export interface CreateSchemeRuleInput {
  scheme_id: string;
  trigger_key: string;
  hub_source: HubSource;
  enabled: boolean;
  channels?: ChannelsConfig;
  recipients?: RecipientsConfig;
}

export interface UpdateSchemeRuleInput {
  enabled?: boolean;
  channels?: ChannelsConfig;
  recipients?: RecipientsConfig;
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT-SCHEME ASSIGNMENT
// Maps to `project_notification_scheme` table
// ═══════════════════════════════════════════════════════════════════

export interface ProjectNotificationScheme {
  id: string;
  project_id: string;
  scheme_id: string;
  project_name?: string;
  scheme_name?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN PAGE STATE & FILTERS
// ═══════════════════════════════════════════════════════════════════

export type AdminTriggerScope = 'global' | 'project';

export interface TriggerFilters {
  hub: HubSource | 'All';
  category: TriggerCategory | 'All';
  search: string;
  enabledOnly: boolean;
  mandatoryOnly: boolean;
}

export interface TriggerBulkAction {
  type: 'enable_all' | 'disable_all' | 'set_channel' | 'set_recipients' | 'reset_defaults';
  triggerKeys: string[];
  channel?: keyof ChannelsConfig;
  channelValue?: boolean;
  recipientType?: keyof RecipientsConfig;
  recipientValue?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// TRIGGER ROW — Combined view model for admin table
// ═══════════════════════════════════════════════════════════════════

export interface TriggerRowData {
  /** From constants registry */
  triggerKey: string;
  displayName: string;
  description: string;
  hubSource: HubSource;
  category: TriggerCategory;
  priority: TriggerPriority;
  entityType: string;
  isMandatory: boolean;
  isSilent: boolean;
  tab: NotificationTabRoute;

  /** From scheme rule (or defaults from registry) */
  enabled: boolean;
  channels: ChannelsConfig;
  recipients: RecipientsConfig;

  /** Whether this rule has been overridden from defaults */
  isOverridden: boolean;
  /** The scheme rule ID if one exists */
  ruleId: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY GROUP — For accordion display in admin UI
// ═══════════════════════════════════════════════════════════════════

export interface TriggerCategoryGroup {
  key: TriggerCategory;
  label: string;
  triggers: TriggerRowData[];
  enabledCount: number;
  totalCount: number;
  isExpanded: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Default recipients config from RecipientType array
// ═══════════════════════════════════════════════════════════════════

const RECIPIENT_KEYS: (keyof Omit<RecipientsConfig, 'custom_roles'>)[] = [
  'assignee', 'owner', 'reporter', 'creator', 'watchers',
  'mentioned_users', 'team_members', 'project_lead', 'approvers',
  'parent_owner', 'previous_assignee',
];

export function recipientTypesToConfig(types: RecipientType[]): RecipientsConfig {
  const config: RecipientsConfig = {
    assignee: false, owner: false, reporter: false, creator: false,
    watchers: false, mentioned_users: false, team_members: false,
    project_lead: false, approvers: false, parent_owner: false,
    previous_assignee: false, custom_roles: [],
  };
  for (const t of types) {
    if (RECIPIENT_KEYS.includes(t as keyof Omit<RecipientsConfig, 'custom_roles'>)) {
      (config as unknown as Record<string, boolean>)[t] = true;
    }
  }
  return config;
}

export function channelsToConfig(channels: NotificationChannel[]): ChannelsConfig {
  return {
    in_app: channels.includes('in_app'),
    email: channels.includes('email'),
    toast: channels.includes('toast'),
    slack: channels.includes('slack'),
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXTENDED NOTIFICATION TYPE (union of existing + new trigger keys)
// ═══════════════════════════════════════════════════════════════════

/**
 * Extended notification type that includes all existing types
 * from the original notifications.ts plus all new trigger keys
 * from the notification events registry.
 */
export type ExtendedNotificationType =
  // Existing types (from src/types/notifications.ts)
  | 'assigned_work_item' | 'assigned_story' | 'assigned'
  | 'mentioned_in_comment' | 'commented_on_work_item'
  | 'updated_work_item' | 'status_changed'
  | 'reassigned_work_item' | 'created_work_item'
  | 'release_approval_requested' | 'incident_escalated'
  | 'test_case_failed' | 'risk_threshold_breached'
  | 'budget_exceeded' | 'okr_milestone_achieved'
  | 'document_shared' | 'ai_insight_generated'
  | 'due_date_approaching' | 'sla_breach_warning'
  | 'tester_assigned' | 'unassigned'
  // New StrategyHub types
  | 'objective_created' | 'objective_updated' | 'objective_status_changed'
  | 'objective_health_changed' | 'objective_owner_changed' | 'objective_dates_changed'
  | 'objective_deleted' | 'key_result_created' | 'key_result_updated'
  | 'key_result_status_changed' | 'key_result_checkin' | 'key_result_deleted'
  | 'theme_created' | 'theme_updated' | 'theme_deleted'
  | 'theme_group_created' | 'theme_group_updated' | 'theme_group_deleted'
  | 'goal_initiative_linked' | 'goal_initiative_unlinked'
  | 'milestone_created' | 'milestone_updated' | 'milestone_deleted'
  // New ProductHub types
  | 'feature_created' | 'feature_status_changed' | 'feature_assigned'
  | 'feature_priority_changed' | 'feature_dates_changed' | 'feature_updated'
  | 'feature_contributor_added' | 'feature_deleted'
  | 'idea_created' | 'idea_status_changed' | 'idea_priority_changed'
  | 'idea_voted' | 'idea_converted' | 'idea_deleted'
  | 'initiative_created' | 'initiative_updated' | 'initiative_deleted'
  | 'business_request_created' | 'business_request_updated' | 'business_request_deleted'
  | 'roadmap_item_created' | 'roadmap_timeline_changed' | 'roadmap_reordered'
  // New ProjectHub types
  | 'work_item_priority_changed' | 'work_item_sprint_changed'
  | 'work_item_estimate_changed' | 'work_item_deleted' | 'work_item_bulk_updated'
  | 'dependency_created' | 'dependency_updated' | 'dependency_deleted'
  | 'comment_updated' | 'comment_deleted'
  | 'attachment_added' | 'attachment_deleted'
  | 'watcher_added' | 'watcher_removed'
  | 'label_added' | 'label_removed'
  | 'link_created' | 'link_deleted'
  | 'subtask_created' | 'subtask_updated' | 'subtask_deleted'
  | 'board_created' | 'board_updated'
  // New ReleaseHub types
  | 'release_created' | 'release_status_changed'
  | 'release_test_linked' | 'release_test_unlinked'
  | 'change_created' | 'change_status_changed'
  | 'change_work_items_linked' | 'change_release_linked'
  | 'release_approved' | 'release_rejected'
  | 'freeze_window_created' | 'freeze_window_deleted'
  | 'production_event_created' | 'triage_change_linked'
  // New TestHub types
  | 'test_case_created' | 'test_case_updated' | 'test_case_moved' | 'test_case_deleted'
  | 'test_steps_changed'
  | 'test_plan_created' | 'test_plan_status_changed' | 'test_plan_deleted'
  | 'test_cycle_created' | 'test_execution_passed' | 'test_cycle_status_changed'
  | 'tests_added_to_cycle'
  | 'test_set_created' | 'test_set_updated' | 'test_set_deleted' | 'test_set_cases_changed'
  | 'test_folder_created' | 'test_folder_renamed' | 'test_folder_deleted' | 'test_folder_moved'
  | 'defect_created' | 'defect_updated' | 'defect_test_linked'
  | 'gherkin_steps_changed' | 'requirement_linked' | 'requirement_unlinked'
  | 'test_attachment_added' | 'test_attachment_deleted'
  // New IncidentHub types
  | 'incident_created' | 'incident_status_changed' | 'incident_severity_changed'
  | 'incident_assigned' | 'incident_updated'
  | 'incident_support_level_changed' | 'incident_delivery_stage_changed'
  | 'incident_deleted'
  | 'incident_comment_update' | 'incident_root_cause_added' | 'incident_resolution_added'
  | 'incident_team_assigned' | 'incident_team_removed'
  | 'incident_watcher_added' | 'incident_attachment_added'
  | 'incident_work_item_linked' | 'incident_work_item_unlinked'
  | 'sla_created' | 'sla_breached'
  | 'committee_submitted' | 'committee_approved' | 'committee_rejected'
  // New TaskHub types
  | 'task_created' | 'task_assigned' | 'task_status_changed'
  | 'task_priority_changed' | 'task_dates_changed'
  | 'task_deleted' | 'task_restored' | 'task_bulk_updated'
  | 'task_commented' | 'task_label_changed' | 'task_view_changed'
  // New PlanHub types
  | 'planner_task_created' | 'planner_task_assigned' | 'planner_task_status_changed'
  | 'planner_task_dates_changed' | 'planner_task_workstream_changed' | 'planner_task_deleted'
  | 'workstream_created' | 'workstream_updated' | 'workstream_deleted'
  | 'allocation_created' | 'allocation_updated' | 'allocation_deleted'
  // New WikiHub types
  | 'document_created' | 'document_updated' | 'document_renamed'
  | 'document_deleted' | 'document_archived'
  | 'wiki_category_created' | 'wiki_category_updated' | 'wiki_category_deleted'
  | 'kb_document_created' | 'kb_document_updated' | 'kb_document_deleted'
  | 'document_comment_added'
  // New CrossHub types
  | 'cross_hub_mentioned_in_comment' | 'cross_hub_watcher_added' | 'cross_hub_attachment_added'
  | 'team_member_added' | 'team_member_removed' | 'team_member_role_changed'
  | 'discussion_created' | 'discussion_reply';

// ═══════════════════════════════════════════════════════════════════
// ENTITY TYPE (expanded)
// ═══════════════════════════════════════════════════════════════════

export type ExtendedEntityType =
  | 'work_item' | 'project' | 'release' | 'incident'
  | 'test_case' | 'okr' | 'document' | 'risk'
  | 'objective' | 'key_result' | 'theme' | 'theme_group'
  | 'goal_initiative' | 'milestone' | 'feature' | 'idea'
  | 'initiative' | 'business_request' | 'roadmap_item'
  | 'dependency' | 'subtask' | 'board'
  | 'change' | 'signoff' | 'freeze_window' | 'production_event'
  | 'test_plan' | 'test_cycle' | 'test_execution' | 'test_set'
  | 'test_folder' | 'defect' | 'sla' | 'view'
  | 'planner_task' | 'workstream' | 'allocation'
  | 'wiki_category' | 'team' | 'discussion'
  | 'ai_insight' | 'budget';
