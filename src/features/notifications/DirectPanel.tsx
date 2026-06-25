import { useMemo, useState, useCallback } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useNotificationsQuery, useMarkAsRead } from '@/hooks/useNotificationsNew';
import { useDirectFromSync, useMarkSyncAsRead } from '@/hooks/useDirectFromSync';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import type { Notification, WorkItemIconType, StatusType } from '@/types/notifications';
import type { DirectNotification, DirectVerb, DirectWorkItemIconType } from './types';
import { groupByDate } from './utils/date';
import DirectNotificationRow from './components/DirectNotificationRow';
import MentionActivityCard from '@/components/notifications/MentionActivityCard';

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
  profiles: Map<string, { name: string; avatarUrl?: string | null }>,
  profilesByName: Map<string, { name: string; avatarUrl?: string | null }>
): DirectNotification {
  const profile = n.actor_user_id ? profiles.get(n.actor_user_id) : null;
  const isCommentVerb = ['commented', 'mentioned'].includes(mapVerb(n.notification_type));
  const hasThread = !!(n.metadata?.comment_preview) || isCommentVerb;

  // Actor resolution — 4 fallback layers:
  //   1. profile by actor_user_id (Catalyst profile UUID, carries override avatar)
  //   2. notification.actor embedded object (webhook snapshot)
  //   3. metadata.actor_name (sync feed stores reporter_display_name here)
  //      NOTE: sync feed uses 'actor_name', webhook uses 'actor_display_name' — check both
  //   4. metadata.actor_display_name (Jira webhook actor for external users)
  const meta = n.metadata as Record<string, unknown> | undefined;
  const metadataActorName = (meta?.actor_name ?? meta?.actor_display_name) as string | undefined;
  const metadataActorAvatar = meta?.actor_avatar_url as string | undefined;
  const isJiraSync = !!meta?.is_jira_sync;
  const resolvedDisplayName = profile?.name
    ?? n.actor?.full_name
    ?? (metadataActorName && metadataActorName.trim() ? metadataActorName : null)
    ?? (isJiraSync ? 'Jira' : null);
  // Avatar: try id-based profile first, then name-based lookup (for sync reporter),
  // then the webhook-embedded avatar URL.
  const nameBasedProfile = resolvedDisplayName
    ? profilesByName.get(resolvedDisplayName.toLowerCase())
    : null;
  const resolvedAvatarUrl = profile?.avatarUrl
    ?? nameBasedProfile?.avatarUrl
    ?? n.actor?.avatar_url
    ?? (metadataActorAvatar && metadataActorAvatar.trim() ? metadataActorAvatar : null);

  return {
    id: n.id,
    createdAt: n.created_at,
    readAt: n.read_at,
    actor: (n.actor_user_id || resolvedDisplayName)
      ? {
          id: n.actor_user_id ?? `metadata:${n.id}`,
          displayName: resolvedDisplayName ?? 'Unknown',
          avatarUrl: resolvedAvatarUrl,
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
            ? 'var(--ds-text-subtlest, var(--cp-text-secondary, #878787))'
            : token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)'),
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
            borderBottom: `1px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1, #2E2E2E))' : token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
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
        <circle cx="24" cy="24" r="20" fill={isDark ? 'var(--ds-border, var(--cp-ink-1, #292929))' : token('color.background.neutral', '#F4F5F7')} />
        <path d="M16 24l5 5 11-11" stroke={isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary, #878787))' : token('color.text.subtlest', '#8590A2')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span
        style={{
          fontFamily: 'var(--cp-font-body)',
          fontSize: 14,
          fontWeight: 600,
          color: isDark ? 'var(--ds-text, var(--cp-bg-neutral, #EDEDED))' : token('color.text', '#292A2E'),
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
  // Layer 1: webhook-fired event notifications (mentions, comments, status changes)
  // Passes unreadOnly=false so we get ALL events; we apply the filter ourselves after merging.
  const { data: notifData, isLoading: notifLoading } = useNotificationsQuery('direct', false);
  // Layer 2: ph_issues-based assigned work (always fresh from Jira sync — the primary feed)
  const { data: syncItems, isLoading: syncLoading } = useDirectFromSync(false);

  const markAsReadMutation = useMarkAsRead();
  const markSyncAsReadMutation = useMarkSyncAsRead();

  // Optimistic local read state — avoids waiting for query refetch after marking read
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  // Flatten paginated pages from the notifications table
  const eventNotifications = useMemo<Notification[]>(() => {
    if (!notifData?.pages) return [];
    return notifData.pages.flat() as Notification[];
  }, [notifData]);

  // Merge: ph_issues assigned work (layer 2) + notification events (layer 1)
  // Deduplicate by entity_id: if an event notification exists for the same entity_id,
  // it takes precedence (it carries actor/verb info). Otherwise use the sync item.
  const rawNotifications = useMemo<Notification[]>(() => {
    const eventEntityIds = new Set(eventNotifications.map(n => n.entity_id));
    // Filter sync items to exclude those already covered by an event notification
    const syncOnly = (syncItems ?? []).filter(n => !eventEntityIds.has(n.entity_id));
    // Merge and sort descending by created_at
    const merged = [...eventNotifications, ...syncOnly];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  }, [eventNotifications, syncItems]);

  const isLoading = notifLoading || syncLoading;

  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profiles = useMemo(
    () => new Map(approvedProfiles.map(p => [p.id, p])),
    [approvedProfiles]
  );
  const profilesByName = useMemo(
    () => new Map(approvedProfiles.map(p => [p.name.toLowerCase(), p])),
    [approvedProfiles]
  );

  // Map raw DB rows → DirectNotification display shape
  const notifications = useMemo<DirectNotification[]>(
    () => rawNotifications.map(n => mapNotification(n, profiles, profilesByName)),
    [rawNotifications, profiles, profilesByName]
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
    if (id.startsWith('sync::')) {
      // Sync item from ph_issues — write a read-receipt to the notifications table
      const raw = rawNotifications.find(n => n.id === id);
      if (raw) markSyncAsReadMutation.mutate(raw);
    } else {
      // Real notification row — update read_at in notifications table
      markAsReadMutation.mutate(id);
    }
    onMarkRead?.(id);
  }, [markAsReadMutation, markSyncAsReadMutation, rawNotifications, onMarkRead]);

  if (isLoading) return <LoadingState isDark={isDark} />;

  const visible = unreadOnly
    ? notifications.filter(n => !resolvedReadIds.has(n.id))
    : notifications;

  if (visible.length === 0) {
    return <EmptyState isDark={isDark} />;
  }

  const groups = groupByDate(visible);
  const dividerColor = isDark ? 'var(--ds-border, var(--cp-ink-1, #2E2E2E))' : token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))');

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
          {group.items.map(n =>
            n.verb === 'mentioned' ? (
              // Mention notifications render as full activity cards per spec
              <div key={n.id} style={{ padding: '8px 16px' }}>
                <MentionActivityCard
                  notification={n}
                  isDark={isDark}
                  onReact={(id, emoji) => console.debug('react', id, emoji)}
                  onReply={(id, text) => console.debug('reply', id, text)}
                  onViewThread={(id) => console.debug('view-thread', id)}
                />
              </div>
            ) : (
              <DirectNotificationRow
                key={n.id}
                notification={n}
                isRead={resolvedReadIds.has(n.id)}
                onMarkRead={handleMarkRead}
                isDark={isDark}
              />
            ),
          )}
        </Box>
      ))}
    </Box>
  );
}

