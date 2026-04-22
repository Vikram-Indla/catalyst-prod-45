export type DirectVerb =
  | 'assigned'
  | 'updated'
  | 'mentioned'
  | 'commented'
  | 'status_changed'
  | 'resolved'
  | 'approved'
  | 'reassigned';

export type DirectWorkItemIconType = 'bug' | 'story' | 'task' | 'epic' | 'incident';

export type DirectStatusAppearance = 'default' | 'inprogress' | 'success';

export interface DirectActor {
  id: string;
  displayName: string;
}

export interface DirectTarget {
  id: string;
  key: string;
  title: string;
  statusLabel: string;
  statusAppearance: DirectStatusAppearance;
  iconType: DirectWorkItemIconType;
}

export interface DirectAggregation {
  count: number;
  actor: DirectActor;
}

export interface DirectNotification {
  id: string;
  createdAt: string;
  readAt: string | null;
  actor: DirectActor | null;
  verb: DirectVerb;
  target: DirectTarget;
  aggregation?: DirectAggregation;
}
