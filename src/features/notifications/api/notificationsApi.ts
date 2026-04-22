// ─────────────────────────────────────────────────────────────────────────────
// Notifications API — Live Supabase implementation
// Queries the `notifications` table (populated by catalyst_notify_trigger).
// tab='direct'   → assignments, mentions, comments to this user
// tab='watching' → status updates on watched items
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';
import { NOTIFICATIONS_PER_PAGE } from '@/constants/notificationConstants';
import type {
  NotificationItem,
  NotificationTab,
  NotificationVerb,
  NotificationThread,
  NotificationReaction,
  NotificationsResponse,
} from '../types';

// ── Status-type mapper (DB enum → ADS appearance) ────────────────────────────
function mapStatusAppearance(
  statusType: string | null,
): NonNullable<NotificationItem['target']['statusAppearance']> {
  switch (statusType) {
    case 'blue':  return 'inprogress';
    case 'green': return 'success';
    default:      return 'default';
  }
}

// ── Verb mapper (DB notification_type → feature NotificationVerb) ─────────────
function mapVerb(notificationType: string): NotificationVerb {
  switch (notificationType) {
    case 'assigned':      return 'assigned';
    case 'mentioned':     return 'mentioned';
    case 'commented':     return 'commented';
    case 'status_changed':return 'status_changed';
    case 'resolved':      return 'resolved';
    case 'created':       return 'created';
    default:              return 'updated';
  }
}

// ── Thread mapper — metadata JSON → NotificationThread ───────────────────────
// The `metadata` column (JSONB) stores comment/thread payloads written by the
// catalyst_notify_trigger. Gracefully handles missing/null keys.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapThread(verb: string, entityKey: string, metadata: any): NotificationThread | undefined {
  if (verb !== 'commented' && verb !== 'mentioned') return undefined;
  // metadata may be null or not a plain object
  const m = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};

  const previewText: string | undefined =
    typeof m.comment_body === 'string' && m.comment_body.trim().length > 0
      ? m.comment_body.trim()
      : undefined;

  const attachmentCount: number | undefined =
    typeof m.attachment_count === 'number' ? m.attachment_count : undefined;

  // reactions — array of { emoji: string; count: number }
  const reactions: NotificationReaction[] | undefined =
    Array.isArray(m.reactions) && m.reactions.length > 0
      ? m.reactions
      : undefined;

  // threadId: prefer metadata.thread_id, fall back to entityKey (e.g. "BAU-5613")
  const threadId: string = (typeof m.thread_id === 'string' && m.thread_id) || entityKey || '';

  // Only surface as thread-capable when we have at least one signal
  if (!previewText && !threadId) return undefined;

  return { id: threadId, previewText, attachmentCount, reactions };
}

// ── Row mapper — DB row → NotificationItem ────────────────────────────────────
// Actor displayName is seeded as '' here; the hook hydrates it via useActorProfiles.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): NotificationItem {
  const verb = mapVerb(row.notification_type);
  return {
    id:        row.id,
    tab:       row.tab as NotificationTab,
    createdAt: row.created_at,
    readAt:    row.read_at ?? null,
    actor: {
      id:          row.actor_user_id ?? 'system',
      displayName: '',           // hydrated in useNotificationsInfinite
      avatarUrl:   undefined,    // hydrated in useNotificationsInfinite
    },
    verb,
    target: {
      id:               row.entity_id    ?? '',
      key:              row.entity_key   ?? undefined,
      title:            row.entity_title ?? '(unknown)',
      icon:             row.entity_icon_type as NotificationItem['target']['icon'],
      statusLabel:      row.status       ?? undefined,
      statusAppearance: mapStatusAppearance(row.status_type),
    },
    thread: mapThread(verb, row.entity_key ?? '', row.metadata),
    url: undefined, // Unused in current DirectTab — can be constructed from entity_key if needed
  };
}

// ── getNotifications ──────────────────────────────────────────────────────────
export async function getNotifications(params: {
  tab: NotificationTab;
  onlyUnread: boolean;
  cursor?: string;
}): Promise<NotificationsResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { items: [], nextCursor: null };

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_user_id', user.id)
    .eq('tab', params.tab)
    .eq('entity_deleted', false)
    .eq('is_dismissed', false)
    .or(`snoozed_until.is.null,snoozed_until.lt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_PER_PAGE);

  if (params.onlyUnread) query = query.is('read_at', null);
  if (params.cursor)     query = query.lt('created_at', params.cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const items = rows.map(mapRow);

  return {
    items,
    nextCursor: rows.length === NOTIFICATIONS_PER_PAGE
      ? rows[rows.length - 1].created_at
      : null,
  };
}

// ── markNotificationRead ──────────────────────────────────────────────────────
export async function markNotificationRead(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_user_id', user!.id);
  if (error) throw error;
}

// ── markNotificationUnread ────────────────────────────────────────────────────
export async function markNotificationUnread(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: null })
    .eq('id', id)
    .eq('recipient_user_id', user!.id);
  if (error) throw error;
}

// ── markAllRead ───────────────────────────────────────────────────────────────
export async function markAllRead({ tab }: { tab: NotificationTab }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', user!.id)
    .eq('tab', tab)
    .is('read_at', null);
  if (error) throw error;
}
