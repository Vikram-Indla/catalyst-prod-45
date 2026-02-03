// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ ACTIVITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type T10ActivityType =
  | 'created'
  | 'completed'
  | 'uncompleted'
  | 'rank_changed'
  | 'assigned'
  | 'unassigned'
  | 'updated'
  | 'resolved'
  | 'carried'
  | 'removed'
  | 'restored';

export interface T10ActivityRow {
  id: string;
  item_id: string;
  activity_type: T10ActivityType;
  performed_by: string;
  performed_at: string;
  metadata: Record<string, unknown>;
}

export interface T10ActivityWithUser extends T10ActivityRow {
  performer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface T10ActivityInsert {
  item_id: string;
  activity_type: T10ActivityType;
  metadata?: Record<string, unknown>;
}

export type ActivityIconColor = 'blue' | 'green' | 'purple' | 'orange' | 'gray' | 'red';

export function getActivityIconColor(type: T10ActivityType): ActivityIconColor {
  switch (type) {
    case 'created':
      return 'blue';
    case 'completed':
    case 'resolved':
      return 'green';
    case 'rank_changed':
      return 'purple';
    case 'assigned':
    case 'unassigned':
      return 'orange';
    case 'removed':
      return 'red';
    default:
      return 'gray';
  }
}

export function getActivityLabel(type: T10ActivityType): string {
  switch (type) {
    case 'created':
      return 'created this item';
    case 'completed':
      return 'marked as completed';
    case 'uncompleted':
      return 'marked as incomplete';
    case 'rank_changed':
      return 'changed the priority';
    case 'assigned':
      return 'assigned this item';
    case 'unassigned':
      return 'unassigned this item';
    case 'updated':
      return 'updated this item';
    case 'resolved':
      return 'resolved this item';
    case 'carried':
      return 'carried forward';
    case 'removed':
      return 'removed from list';
    case 'restored':
      return 'restored this item';
    default:
      return 'updated this item';
  }
}
