// ─────────────────────────────────────────────────────────────────────────────
// Notifications Feature — Types
// Generic. No Jira/Confluence product concepts. No real ticket keys.
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationTab = 'direct' | 'watching';

export interface NotificationActor {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface NotificationTarget {
  id: string;
  key?: string;        // e.g. "ITEM-1024"
  title: string;
  statusLabel?: string;
  statusAppearance?: 'default' | 'inprogress' | 'success' | 'moved' | 'removed';
  icon?: 'bug' | 'task' | 'story' | 'epic' | 'generic';
}

export type NotificationVerb =
  | 'assigned'
  | 'updated'
  | 'mentioned'
  | 'commented'
  | 'status_changed'
  | 'resolved'
  | 'created';

export interface NotificationAggregation {
  count: number;
  label: string;       // e.g. "+1 update from …"
  fromActorId: string;
}

export interface NotificationReaction {
  emoji: string;
  count: number;
}

/** Thread metadata — present on 'commented' | 'mentioned' notifications */
export interface NotificationThread {
  id: string;            // thread identifier (entity_key or metadata.thread_id)
  previewText?: string;  // truncated comment body for preview card
  attachmentCount?: number;
  reactions?: NotificationReaction[];
}

export interface NotificationItem {
  id: string;
  tab: NotificationTab;
  createdAt: string;   // ISO
  readAt: string | null;
  actor: NotificationActor;
  verb: NotificationVerb;
  target: NotificationTarget;
  aggregation?: NotificationAggregation;
  thread?: NotificationThread;  // populated for 'commented' | 'mentioned' verbs
  url?: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  nextCursor?: string | null;
}

export type DateGroup = {
  label: 'TODAY' | 'YESTERDAY' | 'OLDER' | string;
  items: NotificationItem[];
};
