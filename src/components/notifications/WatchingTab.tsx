/**
 * WatchingTab — notifications where the user is a watcher (not a direct recipient).
 * Uses the same notifications table + DirectPanel infrastructure as the Direct tab.
 * Renders with DirectNotificationRow so both tabs look identical.
 */
import { useMemo, useState, useCallback } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useNotificationsQuery, useMarkAsRead } from '@/hooks/useNotificationsNew';
import { useApprovedProfiles, useApprovedProfilesByJiraId } from '@/hooks/useApprovedProfiles';
import type { Notification, WorkItemIconType, StatusType } from '@/types/notifications';
import type { DirectNotification, DirectVerb, DirectWorkItemIconType } from '@/features/notifications/types';
import { groupByDate } from '@/features/notifications/utils/date';
import DirectNotificationRow from '@/features/notifications/components/DirectNotificationRow';
import { resolveActorIdentity, type ActorResolutionMaps } from '@/features/notifications/resolveActorIdentity';

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
    case 'qa bug':              return 'bug';
    case 'story':
    case 'new_feature':
    case 'feature':             return 'story';
    case 'task':
    case 'improvement':
    case 'change_request':
    case 'business_gap':        return 'task';
    case 'epic':                return 'epic';
    case 'incident':
    case 'production_incident': return 'incident';
    case 'backend':             return 'backend';
    case 'frontend':            return 'frontend';
    case 'subtask':             return 'subtask';
    default:                    return 'task';
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
  maps: ActorResolutionMaps
): DirectNotification {
  const meta = n.metadata as Record<string, unknown> | undefined;
  const isJiraSync = !!(meta?.is_jira_sync);
  const isCommentVerb = ['commented', 'mentioned'].includes(mapVerb(n.notification_type));
  const hasThread = !!(n.metadata?.comment_preview) || isCommentVerb;

  const identity = resolveActorIdentity(n.actor_user_id, meta, maps, isJiraSync);

  return {
    id: n.id,
    createdAt: n.created_at,
    readAt: n.read_at,
    actor: identity.actorType !== 'unknown'
      ? {
          id: n.actor_user_id ?? `${identity.source}:${n.id}`,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl ?? null,
          actorType: identity.actorType,
          initials: identity.initials,
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
        fontFamily: 'var(--cp-font-body)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 600,
        color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : token('color.text.subtlest', 'var(--ds-text-disabled)'),
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
        <circle cx="24" cy="24" r="20" fill={isDark ? 'var(--ds-border, var(--cp-ink-1))' : token('color.background.neutral', 'var(--ds-background-neutral-subtle)')} />
        <ellipse cx="24" cy="24" rx="9" ry="6" stroke={isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : token('color.text.subtlest', 'var(--ds-text-disabled)')} strokeWidth="2" fill="none"/>
        <circle cx="24" cy="24" r="3" fill={isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : token('color.text.subtlest', 'var(--ds-text-disabled)')} />
      </svg>
      <span style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 600,
        color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : token('color.text', '#292A2E'),
      }}>
        Nothing watched yet
      </span>
      <span style={{
        fontFamily: 'var(--cp-font-body)',
        fontSize: 'var(--ds-font-size-300)',
        color: isDark ? 'var(--ds-text-subtlest)' : token('color.text.subtle', 'var(--ds-text-subtlest)'),
        textAlign: 'center',
      }}>
        Watch an issue to see its activity here.
      </span>
    </Box>
  );
}

function LoadingState({ isDark }: { isDark: boolean }) {
  const shimmerBg = 'var(--cp-bg-page, var(--cp-bg-sunken))';
  const shimmerHighlight = 'var(--cp-border)';
  return (
    <Box xcss={panelXcss}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '12px 16px', alignItems: 'flex-start' }}>
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

  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profilesByJiraId = useApprovedProfilesByJiraId();
  const actorMaps = useMemo<ActorResolutionMaps>(
    () => ({
      byId: new Map(approvedProfiles.map(p => [p.id, p])),
      byJiraId: profilesByJiraId,
      byName: new Map(approvedProfiles.map(p => [p.name.toLowerCase(), p])),
    }),
    [approvedProfiles, profilesByJiraId]
  );

  const notifications = useMemo<DirectNotification[]>(
    () => rawNotifications.map(n => mapNotification(n, actorMaps)),
    [rawNotifications, actorMaps]
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
  const dividerColor = isDark ? 'var(--ds-border, var(--cp-ink-1))' : token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))');

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
