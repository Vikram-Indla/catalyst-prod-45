import { useMemo, useState, useCallback } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useNotificationsQuery, useMarkAsRead } from '@/hooks/useNotificationsNew';
import { useActorProfiles } from '@/hooks/useActorProfiles';
import type { Notification, WorkItemIconType, StatusType } from '@/types/notifications';
import type { DirectNotification, DirectVerb, DirectWorkItemIconType } from './types';
import { groupByDate } from './utils/date';
import DirectNotificationRow from './components/DirectNotificationRow';

interface DirectPanelProps {
  unreadOnly: boolean;
  isDark: boolean;
  /** Optional: externally managed read-state (e.g. from NotificationPanel) */
  readIds?: Set<string>;
  onMarkRead?: (id: string) => void;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

function mapVerb(notificationType: string): DirectVerb {
  switch (notificationType) {
    case 'assigned':
    case 'assigned_work_item':
    case 'assigned_story':
    case 'tester_assigned':
      return 'assigned';
    case 'mentioned_in_comment':
      return 'mentioned';
    case 'commented_on_work_item':
    case 'commented':
      return 'commented';
    case 'updated_work_item':
      return 'updated';
    case 'status_changed':
      return 'status_changed';
    case 'reassigned_work_item':
      return 'reassigned';
    case 'okr_milestone_achieved':
      return 'approved';
    default:
      return 'updated';
  }
}

function mapIconType(iconType: WorkItemIconType): DirectWorkItemIconType {
  switch (iconType) {
    case 'bug':
    case 'qa bug':   return 'bug';
    case 'story':    return 'story';
    case 'task':     return 'task';
    case 'epic':     return 'epic';
    case 'incident': return 'incident';
    case 'subtask':  return 'task';
    case 'new_feature': return 'story';
    case 'improvement': return 'task';
    default:         return 'task';
  }
}

function mapStatusAppearance(statusType: StatusType) {
  switch (statusType) {
    case 'blue':  return 'inprogress' as const;
    case 'green': return 'success' as const;
    default:      return 'default' as const;
  }
}

function mapNotification(
  n: Notification,
  profiles: Map<string, { full_name: string; avatar_url: string | null }>
): DirectNotification {
  const profile = n.actor_user_id ? profiles.get(n.actor_user_id) : null;
  // Show thread card if: there's a comment preview OR the notification is a comment verb.
  // This ensures "View thread" is always visible on comment-type notifications,
  // not only when metadata.comment_preview is populated in the DB.
  const isCommentVerb = ['commented', 'mentioned'].includes(mapVerb(n.notification_type));
  const hasThread = !!(n.metadata?.comment_preview) || isCommentVerb;

  return {
    id: n.id,
    createdAt: n.created_at,
    readAt: n.read_at,
    actor: n.actor_user_id
      ? {
          id: n.actor_user_id,
          displayName: profile?.full_name ?? (n.actor?.full_name ?? 'Unknown'),
          avatarUrl: profile?.avatar_url ?? n.actor?.avatar_url ?? null,
        }
      : null,
    verb: mapVerb(n.notification_type),
    target: {
      id: n.entity_id,
      key: n.entity_key,
      title: n.entity_title,
      statusLabel: n.status,
      statusAppearance: mapStatusAppearance(n.status_type),
      iconType: mapIconType(n.entity_icon_type),
    },
    thread: hasThread
      ? {
          // commentPreview may be empty string for comment-verb notifications
          // that haven't stored a preview yet — the thread card still renders
          // with the "View thread" link so the user can navigate to it.
          commentPreview: n.metadata?.comment_preview ?? '',
          reactions: n.metadata?.reactions ?? {},
          replyCount: 0,
        }
      : undefined,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const panelXcss = xcss({
  display: 'flex',
  flexDirection: 'column',
  flex: '1',
});

const sectionHeaderXcss = xcss({
  paddingBlock: 'space.100',
  paddingInline: 'space.200',
});

const emptyXcss = xcss({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'space.600',
  gap: 'space.100',
});

function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Box xcss={sectionHeaderXcss}>
      <span
        style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 12,
          fontWeight: 600,
          color: isDark
            ? 'var(--ds-text-subtlest, #878787)'
            : token('color.text.subtlest', '#8590A2'),
        }}
      >
        {label}
      </span>
    </Box>
  );
}

function LoadingState({ isDark }: { isDark: boolean }) {
  const skeletonBg = isDark ? 'var(--ds-surface-overlay, #1F1F1F)' : token('color.background.neutral', '#F4F5F7');
  return (
    <Box xcss={panelXcss}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: `1px solid ${isDark ? 'var(--ds-border, #2E2E2E)' : token('color.border', '#DFE1E6')}`,
          }}
          aria-hidden="true"
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: skeletonBg, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: '70%', height: 12, borderRadius: 3, background: skeletonBg }} />
            <div style={{ width: '40%', height: 10, borderRadius: 3, background: skeletonBg }} />
          </div>
        </div>
      ))}
      <span style={{ position: 'absolute', left: -9999 }} role="status" aria-live="polite">
        Loading notifications…
      </span>
    </Box>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <Box xcss={emptyXcss}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill={isDark ? 'var(--ds-border, #292929)' : token('color.background.neutral', '#F4F5F7')} />
        <path d="M16 24l5 5 11-11" stroke={isDark ? 'var(--ds-text-subtlest, #878787)' : token('color.text.subtlest', '#8590A2')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span
        style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 14,
          fontWeight: 600,
          color: isDark ? 'var(--ds-text, #EDEDED)' : token('color.text', '#292A2E'),
        }}
      >
        You're all caught up
      </span>
      <span
        style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 13,
          color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : token('color.text.subtle', '#626F86'),
          textAlign: 'center',
        }}
      >
        No unread notifications right now.
      </span>
    </Box>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DirectPanel({ unreadOnly, isDark, readIds: externalReadIds, onMarkRead }: DirectPanelProps) {
  const { data, isLoading } = useNotificationsQuery('direct', unreadOnly);
  const markAsReadMutation = useMarkAsRead();

  // Optimistic local read state — avoids waiting for query refetch after marking read
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  // Flatten paginated pages into a flat list of raw Notification rows
  const rawNotifications = useMemo<Notification[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flat() as Notification[];
  }, [data]);

  // Collect all actor IDs so we can batch-fetch their profiles (with avatar_url)
  const actorIds = useMemo(
    () => rawNotifications.map(n => n.actor_user_id).filter((id): id is string => !!id),
    [rawNotifications]
  );

  const { data: profilesMap } = useActorProfiles(actorIds);
  const profiles = profilesMap ?? new Map();

  // Map raw DB rows → DirectNotification display shape
  const notifications = useMemo<DirectNotification[]>(
    () => rawNotifications.map(n => mapNotification(n, profiles)),
    [rawNotifications, profiles]
  );

  // Read-state: merge DB read_at, local optimistic state, and external state
  const resolvedReadIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>(localReadIds);
    if (externalReadIds) {
      externalReadIds.forEach(id => ids.add(id));
    }
    for (const n of notifications) {
      if (n.readAt) ids.add(n.id);
    }
    return ids;
  }, [externalReadIds, localReadIds, notifications]);

  // handleMarkRead: optimistic update + real Supabase write + badge invalidation
  const handleMarkRead = useCallback((id: string) => {
    // Optimistic: mark read immediately in UI
    setLocalReadIds(prev => new Set(prev).add(id));
    // Real write to DB — onSuccess invalidates ['notifications'] + ['notifications-unread-count']
    markAsReadMutation.mutate(id);
    // Also bubble up if parent needs to know
    onMarkRead?.(id);
  }, [markAsReadMutation, onMarkRead]);

  if (isLoading) return <LoadingState isDark={isDark} />;

  const visible = unreadOnly
    ? notifications.filter(n => !resolvedReadIds.has(n.id))
    : notifications;

  if (visible.length === 0) {
    return <EmptyState isDark={isDark} />;
  }

  const groups = groupByDate(visible);
  const dividerColor = isDark ? 'var(--ds-border, #2E2E2E)' : token('color.border', '#DFE1E6');

  return (
    <Box xcss={panelXcss}>
      {groups.map((group, gi) => (
        <Box key={group.label}>
          {gi > 0 && (
            <div
              style={{ height: 1, background: dividerColor, marginInline: 16, marginBlock: 4 }}
              role="separator"
              aria-hidden="true"
            />
          )}
          <SectionLabel label={group.label} isDark={isDark} />
          {group.items.map(n => (
            <DirectNotificationRow
              key={n.id}
              notification={n}
              isRead={resolvedReadIds.has(n.id)}
              onMarkRead={handleMarkRead}
              isDark={isDark}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

