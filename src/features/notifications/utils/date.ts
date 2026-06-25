import type { DirectNotification } from '../types';

export interface NotificationGroup {
  label: string;
  items: DirectNotification[];
}

export function groupByDate(items: DirectNotification[]): NotificationGroup[] {
  const now = new Date();
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const groups: NotificationGroup[] = [
    { label: 'Today',     items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Older',     items: [] },
  ];

  for (const n of items) {
    const d = new Date(n.createdAt);
    if      (d >= todayStart)     groups[0].items.push(n);
    else if (d >= yesterdayStart) groups[1].items.push(n);
    else                          groups[2].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

export function formatRelativeTime(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime();
  const mins    = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function iconTypeToLabel(iconType?: string): string {
  switch (iconType) {
    case 'story':    return 'story';
    case 'bug':      return 'bug';
    case 'epic':     return 'epic';
    case 'incident': return 'incident';
    case 'subtask':  return 'subtask';
    case 'task':     return 'task';
    default:         return 'work item';
  }
}

export function getVerbText(verb: string, actorName: string | null, iconType?: string): string {
  const type = iconTypeToLabel(iconType);
  if (!actorName) {
    switch (verb) {
      case 'assigned':       return `A ${type} was assigned to you`;
      case 'status_changed': return 'Status updated on';
      default:               return 'Update on';
    }
  }
  switch (verb) {
    case 'assigned':      return `${actorName} assigned a ${type} to you`;
    case 'mentioned':     return `${actorName} mentioned you in`;
    case 'commented':     return `${actorName} commented on`;
    case 'updated':       return `${actorName} updated`;
    case 'status_changed':return `${actorName} transitioned`;
    case 'resolved':      return `${actorName} resolved`;
    case 'approved':      return `${actorName} approved`;
    case 'reassigned':    return `${actorName} reassigned`;
    default:              return `${actorName} updated`;
  }
}
