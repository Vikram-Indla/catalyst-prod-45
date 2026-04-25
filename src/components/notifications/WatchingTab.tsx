/**
 * WatchingTab — notifications where the user is a watcher (not a direct recipient).
 * Uses the same notifications table + DirectPanel infrastructure as the Direct tab.
 * Renders with DirectNotificationRow so both tabs look identical.
 */
import { useMemo, useState, useCallback } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useNotificationsQuery, useMarkAsRead } from '@/hooks/useNotificationsNew';
import { useActorProfiles } from '@/hooks/useActorProfiles';
import type { Notification, WorkItemIconType, StatusType } from '@/types/notifications';
import type { DirectNotification, DirectVerb, DirectWorkItemIconType } from '@/features/notifications/types';
import { groupByDate } from '@/features/notifications/utils/date';
import DirectNotificationRow from '@/features/notifications/components/DirectNotificationRow';

interface WatchingTabProps {
  unreadOnly: boolean;
  isDark: boolean;
}

// ─── Same mapping helpers as DirectPanel ────────────────────────────────────

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
    case 'qa bug':    return 'bug';
    case 'story':     return 'story';
    case 'task':      return 'task';
    case 'epic':      return 'epic';
    case 'incident':  return 'incident';
    case 'subtask':   return 'task';
    case 'new_feature': return 'story';
    case 'improvement': return 'task';
    default:          return 'task';
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
          commentPreview: n.metadata?.comment_preview ?? '',
          reactions: n.metadata?.reactions ?? {},
          replyCount: 0,
        }
      : undefined,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const panelXcss = xcss({ display: 'flex', flexDirection: 'column', flex: '1' });

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
      <span style={{
        fontFamily: 'var(--ds-font-family-body)',
        fontSize: 12,
        fontWeight: 600,
        color: isDark ? '#878787' : token('color.text.subtlest', '#8590A2'),
      }}>
        {label}
      </span>
    </Box>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <Box xcss={emptyXcss}>
      {/* Eye icon */}
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill={isDark ? '#292929' : token('color.background.neutral', '#F4F5F7')} />
        <ellipse cx="24" cy="24" rx="9" ry="6" stroke={isDark ? '#878787' : token('color.text.subtlest', '#8590A2')} strokeWidth="2" fill="none"/>
        <circle cx="24" cy="24" r="3" fill={isDark ? '#878787' : token('color.text.subtlest', '#8590A2')} />
      </svg>
      <span style={{
        fontFamily: 'var(--ds-font-family-body)',
        fontSize: 14,
        fontWeight: 600,
        color: isDark ? '#EDEDED' : token('color.text', '#172B4D'),
      }}>
        Nothing watched yet
      </span>
      <span style={{
        fontFamily: 'var(--ds-font-family-body)',
        fontSize: 13,
        color: isDark ? '#A1A1A1' : token('color.text.subtle', '#626F86'),
        textAlign: 'center',
      }}>
        Watch an issue to see its activity here.
      </span>
    </Box>
  );
}

function LoadingState({ isDark }: { isDark: boolean }) {
  const shimmerBg = isDark ? '#1F1F1F' : '#F4F5F7';
  const shimmerHighlight = isDark ? '#2E2E2E' : '#E9EBEE';
  return (
    <Box xcss={panelXcss}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 16px', alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: shimmerBg, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, borderRadius: 4, background: shimmerHighlight, width: '60%' }} />
            <div style={{ height: 14, borderRadius: 4, background: shimmerBg, width: '90%' }} />
            <div style={{ height: 12, borderRadius: 4, background: shimmerBg, width: '40%' }} />
          </div>
        </div>
      ))}
    </Box>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WatchingTab({ unreadOnly, isDark }: WatchingTabProps) {
  const { data, isLoading } = useNotificationsQuery('watching', unreadOnly);
  const markAsReadMutation = useMarkAsRead();
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  const rawNotifications = useMemo<Notification[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flat() as Notification[];
  }, [data]);

  const actorIds = useMemo(
    () => rawNotifications.map(n => n.actor_user_id).filter((id): id is string => !!id),
    [rawNotifications]
  );
  const { data: profilesMap } = useActorProfiles(actorIds);
  const profiles = profilesMap ?? new Map();

  const notifications = useMemo<DirectNotification[]>(
    () => rawNotifications.map(n => mapNotification(n, profiles)),
    [rawNotifications, profiles]
  );

  const resolvedReadIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>(localReadIds);
    for (const n of notifications) {
      if (n.readAt) ids.add(n.id);
    }
    return ids;
  }, [localReadIds, notifications]);

  const handleMarkRead = useCallback((id: string) => {
    setLocalReadIds(prev => new Set(prev).add(id));
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  if (isLoading) return <LoadingState isDark={isDark} />;

  const visible = unreadOnly
    ? notifications.filter(n => !resolvedReadIds.has(n.id))
    : notifications;

  if (visible.length === 0) return <EmptyState isDark={isDark} />;

  const groups = groupByDate(visible);
  const dividerColor = isDark ? '#2E2E2E' : token('color.border', '#DFE1E6');

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
