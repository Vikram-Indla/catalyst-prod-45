// ─────────────────────────────────────────────────────────────────────────────
// Date grouping utilities — mixed-case labels matching Jira exactly
// ─────────────────────────────────────────────────────────────────────────────

import type { DateGroup, NotificationItem } from '../types';

export function groupNotificationsByDay(items: NotificationItem[]): DateGroup[] {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest  = new Date(today.getTime() - 86_400_000);

  const buckets: Record<string, NotificationItem[]> = {
    Today:     [],
    Yesterday: [],
    Older:     [],
  };

  items.forEach(n => {
    const d = new Date(n.createdAt);
    if (d >= today)     buckets['Today'].push(n);
    else if (d >= yest) buckets['Yesterday'].push(n);
    else                buckets['Older'].push(n);
  });

  return (['Today', 'Yesterday', 'Older'] as const)
    .filter(label => buckets[label].length > 0)
    .map(label => ({ label, items: buckets[label] }));
}

export function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

export function getVerbLabel(verb: string, actorName: string): string {
  switch (verb) {
    case 'assigned':      return `${actorName} assigned you to`;
    case 'mentioned':     return `${actorName} mentioned you in`;
    case 'commented':     return `${actorName} commented on`;
    case 'status_changed':return `${actorName} transitioned`;
    case 'resolved':      return `${actorName} resolved`;
    case 'created':       return `${actorName} created`;
    case 'updated':       return `${actorName} updated`;
    default:              return `${actorName} updated`;
  }
}
