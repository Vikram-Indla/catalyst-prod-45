import type { Notification } from '@/hooks/useNotifications';

export type AtlassianNotificationItem = {
  id: string;
  actor: { name: string; avatarUrl: string | null };
  action: string;
  timestamp: string;
  workItem: { key: string; type: string; summary: string; status: string };
  unread: boolean;
  link: string | null;
  comment?: { text: string; link: string | null; reactions?: string[] };
  rollup?: { count: number };
  source: Notification;
};

function deriveAction(type: Notification['type']) {
  if (type === 'assignment') return 'assigned a work item to you';
  if (type === 'mention') return 'mentioned you in a comment';
  if (type === 'comment') return 'commented on a work item';
  if (type === 'status_change') return 'updated a work item';
  return 'updated a work item';
}

function parseKey(text: string, link: string | null) {
  const value = `${text} ${link ?? ''}`;
  return value.match(/[A-Z][A-Z0-9]+-\d+/)?.[0] ?? 'CAT';
}

export function mapJiraEventToNotification(notification: Notification): AtlassianNotificationItem {
  const key = parseKey(`${notification.title} ${notification.message}`, notification.link);
  return {
    id: notification.id,
    actor: {
      name: notification.actor?.full_name ?? 'Catalyst',
      avatarUrl: notification.actor?.avatar_url ?? null,
    },
    action: deriveAction(notification.type),
    timestamp: notification.created_at,
    workItem: {
      key,
      type: notification.entity_type ?? notification.type,
      summary: notification.title,
      status: notification.severity === 'critical' ? 'Needs attention' : notification.is_read ? 'Seen' : 'Unread',
    },
    unread: !notification.is_read,
    link: notification.link,
    comment: notification.type === 'mention' || notification.type === 'comment'
      ? { text: notification.message, link: notification.link }
      : undefined,
    source: notification,
  };
}
