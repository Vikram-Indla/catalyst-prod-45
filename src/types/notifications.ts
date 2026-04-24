export type NotificationType =
  | 'assigned_work_item' | 'assigned_story' | 'assigned' | 'mentioned_in_comment'
  | 'commented_on_work_item' | 'commented' | 'updated_work_item' | 'status_changed'
  | 'reassigned_work_item' | 'created_work_item' | 'release_approval_requested'
  | 'incident_escalated' | 'test_case_failed' | 'risk_threshold_breached'
  | 'budget_exceeded' | 'okr_milestone_achieved' | 'document_shared'
  | 'ai_insight_generated' | 'due_date_approaching' | 'sla_breach_warning'
  | 'tester_assigned' | 'unassigned';

export type NotificationEntityType =
  | 'work_item' | 'project' | 'release' | 'incident'
  | 'test_case' | 'okr' | 'document' | 'risk' | 'issue';

// As of the 2026-04-24 For You migration, the notifications drawer is a
// two-tab surface: Direct + Watching. The former 'ai' and 'ageing' tabs
// have been relocated to /for-you (AI Recap = first tab, Ageing = last).
// The DB `notifications.tab` column may still carry 'ai' for pre-existing
// rows, but the UI never surfaces them — `useNotificationsQuery` only
// filters by `{ direct | watching }`. If backfill is required, handle it
// as a one-off migration; do not widen this union.
export type NotificationTab = 'direct' | 'watching';

export type WorkItemIconType =
  | 'bug' | 'qa bug' | 'story' | 'task' | 'epic' | 'subtask'
  | 'new_feature' | 'improvement' | 'incident' | 'question';

export type StatusType = 'gray' | 'blue' | 'green';

export interface NotificationActor {
  id: string;
  full_name: string;
  initials: string;
  avatar_url?: string | null;
  color: string; // ALWAYS from getAvatarColor(id) — never hardcode
}

export interface NotificationMetadata {
  comment_preview?: string;
  comment_id?: string;
  attachment_filename?: string;
  status_from?: string;
  status_to?: string;
  reassigned_from_name?: string;
  reassigned_to_name?: string;
  due_date?: string;
  priority_score?: number;
  ai_summary?: string;
  reactions?: Record<string, number>;
  expanded?: boolean;
}

export interface Notification {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  actor?: NotificationActor | null;
  notification_type: NotificationType;
  entity_type: NotificationEntityType;
  entity_id: string;
  entity_title: string;
  entity_key: string;
  entity_icon_type: WorkItemIconType;
  hub_source: string;
  status: string;
  status_type: StatusType;
  tab: NotificationTab;
  metadata: NotificationMetadata;
  read_at: string | null;
  delivered_at: string | null;
  snoozed_until: string | null;
  entity_deleted: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  toast_enabled: boolean;
  show_unread_only: boolean;
}

export interface ToastNotification {
  id: string;
  notification: Notification;
  dismissAfterMs: number;
  isPaused: boolean;
  startTime: number;
  remainingMs: number;
}

export interface NotificationPanelState {
  isOpen: boolean;
  activeTab: NotificationTab;
  unreadOnly: boolean;
  scrollPosition: number;
}
