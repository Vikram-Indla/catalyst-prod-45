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

// Display labels for DirectWorkItemIconType fallback (when no issueTypeName available).
// Values are capitalized display strings, not internal keys.
function iconTypeToLabel(iconType?: string): string {
  switch (iconType) {
    case 'story':    return 'Story';
    case 'bug':      return 'Bug';
    case 'epic':     return 'Epic';
    case 'incident': return 'Incident';
    case 'subtask':  return 'Sub-task';
    case 'task':     return 'Task';
    case 'backend':  return 'Backend';
    case 'frontend': return 'Frontend';
    default:         return 'work item';
  }
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/**
 * Builds the verb sentence for a notification row.
 * @param issueTypeName  Exact Jira type name (e.g. "Frontend", "Integration", "Sub-task").
 *                       When present, used as display label with correct article.
 *                       When absent, falls back to iconTypeToLabel(iconType).
 */
export function getVerbText(
  verb: string,
  actorName: string | null,
  iconType?: string,
  issueTypeName?: string | null,
): string {
  const displayType = issueTypeName?.trim() || iconTypeToLabel(iconType);
  const art = article(displayType);

  if (!actorName) {
    switch (verb) {
      case 'assigned':       return `${art.charAt(0).toUpperCase() + art.slice(1)} ${displayType} was assigned to you`;
      case 'status_changed': return 'Status updated on';
      default:               return 'Update on';
    }
  }
  switch (verb) {
    case 'assigned':      return `${actorName} assigned ${art} ${displayType} to you`;
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
