export type DirectVerb =
  | 'assigned'
  | 'updated'
  | 'mentioned'
  | 'commented'
  | 'status_changed'
  | 'resolved'
  | 'approved'
  | 'reassigned'
  | 'archive'
  | 'archive_warning'
  | 'deleted'
  | 'shredding_warning';

export type DirectWorkItemIconType =
  | 'bug' | 'story' | 'task' | 'epic' | 'incident'
  // Subtask family — subtask/integration share icon; backend/frontend have distinct SVGs
  | 'subtask' | 'backend' | 'frontend';

export type DirectStatusAppearance = 'default' | 'inprogress' | 'success';

export interface DirectActor {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  /** 'user' = known person, 'system' = Jira Sync/automated, 'unknown' = no data */
  actorType: 'user' | 'system' | 'unknown';
  initials: string;
}

export interface DirectTarget {
  id: string;
  key: string;
  title: string;
  statusLabel: string;
  statusAppearance: DirectStatusAppearance;
  iconType: DirectWorkItemIconType;
  /** Exact Jira issue type name (e.g. "Frontend", "Integration", "Sub-task").
   *  When present, used for the sentence display label instead of the icon-type fallback. */
  issueTypeName?: string | null;
}

export interface DirectAggregation {
  count: number;
  actor: DirectActor;
}

export interface DirectNotificationThread {
  commentPreview: string;
  reactions: Record<string, number>;
  replyCount: number;
}

export interface DirectNotification {
  id: string;
  createdAt: string;
  readAt: string | null;
  actor: DirectActor | null;
  verb: DirectVerb;
  target: DirectTarget;
  aggregation?: DirectAggregation;
  thread?: DirectNotificationThread;
}
