import { useCallback, useMemo } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { groupByDate } from './utils/date';
import DirectNotificationRow from './components/DirectNotificationRow';
import { useNotificationsQuery, useMarkAsRead } from '@/hooks/useNotificationsNew';
import { useActorProfiles } from '@/hooks/useActorProfiles';
import type {
  DirectNotification,
  DirectVerb,
  DirectWorkItemIconType,
  DirectStatusAppearance,
} from './types';
import type { Notification, NotificationType, StatusType, WorkItemIconType } from '@/types/notifications';

interface DirectPanelProps {
  unreadOnly: boolean;
  isDark: boolean;
}

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
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: isDark
            ? '#878787'
            : token('color.text.subtlest', '#8590A2'),
        }}
      >
        {label}
      </span>
    </Box>
  );
}

function LoadingState({ isDark }: { isDark: boolean }) {
  const skeletonBg = isDark ? '#1F1F1F' : token('color.background.neutral', '#F4F5F7');
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
            borderBottom: `1px solid ${isDark ? '#2E2E2E' : token('color.border', '#DFE1E6')}`,
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

function EmptyUnread({ isDark }: { isDark: boolean }) {
  return (
    <Box xcss={emptyXcss}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill={isDark ? '#292929' : token('color.background.neutral', '#F4F5F7')} />
        <path d="M16 24l5 5 11-11" stroke={isDark ? '#878787' : token('color.text.subtlest', '#8590A2')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: isDark ? '#EDEDED' : token('color.text', '#172B4D'),
        }}
      >
        You're all caught up
      </span>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: isDark ? '#A1A1A1' : token('color.text.subtle', '#626F86'),
          textAlign: 'center',
        }}
      >
        No unread notifications right now.
      </span>
    </Box>
  );
}

// ───────── Mappers: live Notification → DirectNotification ─────────

function mapVerb(t: NotificationType): DirectVerb {
  switch (t) {
    case 'assigned':
    case 'assigned_work_item':
    case 'assigned_story':
    case 'tester_assigned':
      return 'assigned';
    case 'unassigned':
    case 'reassigned_work_item':
      return 'reassigned';
    case 'mentioned_in_comment':
      return 'mentioned';
    case 'commented':
    case 'commented_on_work_item':
      return 'commented';
    case 'status_changed':
      return 'status_changed';
    case 'updated_work_item':
    case 'created_work_item':
      return 'updated';
    case 'release_approval_requested':
      return 'approved';
    default:
      return 'updated';
  }
}

function mapIcon(t: WorkItemIconType | string): DirectWorkItemIconType {
  switch (t) {
    case 'bug':
    case 'qa bug':
    case 'defect':
      return 'bug';
    case 'story':
      return 'story';
    case 'epic':
      return 'epic';
    case 'incident':
    case 'production incident':
      return 'incident';
    default:
      return 'task';
  }
}

function mapAppearance(s: StatusType): DirectStatusAppearance {
  switch (s) {
    case 'blue':  return 'inprogress';
    case 'green': return 'success';
    default:      return 'default';
  }
}

function toDirect(n: Notification, displayName: string | null): DirectNotification {
  return {
    id: n.id,
    createdAt: n.created_at,
    readAt: n.read_at,
    actor: n.actor_user_id
      ? { id: n.actor_user_id, displayName: displayName ?? 'Someone' }
      : null,
    verb: mapVerb(n.notification_type),
    target: {
      id: n.entity_id,
      key: n.entity_key,
      title: n.entity_title,
      statusLabel: n.status,
      statusAppearance: mapAppearance(n.status_type),
      iconType: mapIcon(n.entity_icon_type),
    },
  };
}

export default function DirectPanel({ unreadOnly, isDark }: DirectPanelProps) {
  const { data: pages, isLoading } = useNotificationsQuery('direct', unreadOnly);
  const markAsRead = useMarkAsRead();

  const rawNotifications = useMemo(
    () => (pages?.pages.flat() ?? []) as Notification[],
    [pages]
  );

  const actorIds = useMemo(
    () => rawNotifications.map(n => n.actor_user_id).filter((x): x is string => !!x),
    [rawNotifications]
  );
  const { data: profiles } = useActorProfiles(actorIds);

  const items = useMemo(
    () => rawNotifications.map(n => {
      const profile = n.actor_user_id ? profiles?.get(n.actor_user_id) : null;
      return toDirect(n, profile?.full_name ?? null);
    }),
    [rawNotifications, profiles]
  );

  const handleMarkRead = useCallback((id: string) => {
    markAsRead.mutate(id);
  }, [markAsRead]);

  if (isLoading && items.length === 0) {
    return <LoadingState isDark={isDark} />;
  }

  if (items.length === 0) {
    return <EmptyUnread isDark={isDark} />;
  }

  const groups = groupByDate(items);
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
              isRead={!!n.readAt}
              onMarkRead={handleMarkRead}
              isDark={isDark}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
