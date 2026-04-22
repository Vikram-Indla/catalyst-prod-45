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
    { label: 'TODAY',     items: [] },
    { label: 'YESTERDAY', items: [] },
    { label: 'OLDER',     items: [] },
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

export function getVerbText(verb: string, actorName: string | null): string {
  if (!actorName) {
    return verb === 'assigned' ? 'You were assigned to' : 'System update on';
  }
  switch (verb) {
    case 'assigned':      return `${actorName} assigned you to`;
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
