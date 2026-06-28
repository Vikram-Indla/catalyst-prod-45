import { useMemo, useState, useCallback } from 'react';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import { useNotificationsQuery, useMarkAsRead } from '@/hooks/useNotificationsNew';
import { useDirectFromSync, useMarkSyncAsRead } from '@/hooks/useDirectFromSync';
import { useApprovedProfiles, useApprovedProfilesByJiraId } from '@/hooks/useApprovedProfiles';
import type { Notification, WorkItemIconType, StatusType } from '@/types/notifications';
import type { DirectNotification, DirectVerb, DirectWorkItemIconType } from './types';
import { groupByDate } from './utils/date';
import DirectNotificationRow from './components/DirectNotificationRow';
import MentionActivityCard from '@/components/notifications/MentionActivityCard';
import { resolveActorIdentity, type ActorResolutionMaps } from './resolveActorIdentity';

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
      issueTypeName: (meta?.issue_type_name as string | null | undefined) ?? null,
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
  const skeletonBg = isDark ? 'var(--ds-surface-overlay, #1F1F1F)' : token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)');
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
        <circle cx="24" cy="24" r="20" fill={isDark ? 'var(--ds-border, var(--cp-ink-1, #292929))' : token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)')} />
        <path d="M16 24l5 5 11-11" stroke={isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary, #878787))' : token('color.text.subtlest', 'var(--ds-text-disabled, #8590A2)')} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
          color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : token('color.text.subtle', 'var(--ds-text-subtlest, #626F86)'),
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

  // Deduplicate ONLY assignment-family notification pairs by entity_id.
  //
  // Problem: useMarkSyncAsRead inserts a read-receipt row (notification_type='assigned_work_item',
  // metadata={}) that shares entity_id with the original wh-jira-sync 'assigned' row
  // (metadata={actor_display_name:'Nada alfassam'}). entity_id = ph_issues.id (UUID),
  // so grouping ALL types by entity_id alone would wrongly collapse commented+assigned for
  // the same issue into one notification. Only collapse the assignment family.
  //
  // Assignment family: 'assigned' | 'assigned_work_item' | 'assigned_story' | 'tester_assigned'
  // All map to verb='assigned' in mapVerb(). Other types (commented, status_changed, etc.) pass through.
  const deduplicatedEventNotifications = useMemo<Notification[]>(() => {
    const ASSIGNMENT_FAMILY = new Set([
      'assigned', 'assigned_work_item', 'assigned_story', 'tester_assigned',
    ]);
    const assignmentsByEntityId = new Map<string, Notification[]>();
    const nonAssignment: Notification[] = [];

    for (const n of eventNotifications) {
      if (ASSIGNMENT_FAMILY.has(n.notification_type)) {
        const arr = assignmentsByEntityId.get(n.entity_id) ?? [];
        arr.push(n);
        assignmentsByEntityId.set(n.entity_id, arr);
      } else {
        nonAssignment.push(n);
      }
    }

    const deduped = Array.from(assignmentsByEntityId.values()).map(rows => {
      const hasActor = (n: Notification): boolean => {
        const m = n.metadata as Record<string, unknown> | undefined;
        return !!(n.actor_user_id || m?.actor_display_name || m?.actor_name);
      };
      // Pick actor-rich row first; fall back to most recent
      const primary = rows.find(hasActor)
        ?? [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      // Merge most-recent read_at so already-read state survives dedup
      const latestReadAt = rows.reduce<string | null>((acc, r) => {
        if (!r.read_at) return acc;
        if (!acc) return r.read_at;
        return r.read_at > acc ? r.read_at : acc;
      }, null);
      return { ...primary, read_at: latestReadAt };
    });

    return [...deduped, ...nonAssignment];
  }, [eventNotifications]);

  // Merge: ph_issues assigned work (layer 2) + notification events (layer 1)
  // Deduplicate by entity_id: if an event notification exists for the same entity_id,
  // it takes precedence (it carries actor/verb info). Otherwise use the sync item.
  const rawNotifications = useMemo<Notification[]>(() => {
    // Build actor map from sync items. useDirectFromSync fetches actor data from the
    // notifications table without pagination limits, so it can reach 'assigned' event rows
    // that sit beyond page 1 of useNotificationsQuery. When the deduped event notification
    // has no actor (e.g. only the empty read-receipt row was in page 1), enrich it here.
    const syncActorMap = new Map<string, { name: string; avatarUrl: string | null; userId: string | null }>();
    for (const s of (syncItems ?? [])) {
      const meta = s.metadata as Record<string, unknown> | null;
      const name = (meta?.actor_display_name as string | null | undefined)?.trim();
      if (name) {
        syncActorMap.set(s.entity_id, {
          name,
          avatarUrl: (meta?.actor_avatar_url as string | null | undefined)?.trim() || null,
          userId: s.actor_user_id,
        });
      }
    }

    const ASSIGNMENT_FAMILY = new Set([
      'assigned', 'assigned_work_item', 'assigned_story', 'tester_assigned',
    ]);

    // Enrich actor-less assignment events with actor data from the sync items
    const enriched = deduplicatedEventNotifications.map(n => {
      if (!ASSIGNMENT_FAMILY.has(n.notification_type)) return n;
      const meta = n.metadata as Record<string, unknown> | undefined;
      const alreadyHasActor = !!(n.actor_user_id || meta?.actor_display_name || meta?.actor_name);
      if (alreadyHasActor) return n;
      const syncActor = syncActorMap.get(n.entity_id);
      if (!syncActor) return n;
      return {
        ...n,
        actor_user_id: syncActor.userId,
        metadata: {
          ...(meta ?? {}),
          actor_display_name: syncActor.name,
          actor_avatar_url: syncActor.avatarUrl,
        } as Notification['metadata'],
      };
    });

    const eventEntityIds = new Set(enriched.map(n => n.entity_id));
    // Filter sync items to exclude those already covered by an event notification
    const syncOnly = (syncItems ?? []).filter(n => !eventEntityIds.has(n.entity_id));
    // Merge and sort descending by created_at
    const merged = [...enriched, ...syncOnly];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  }, [deduplicatedEventNotifications, syncItems]);

  const isLoading = notifLoading || syncLoading;

  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const profilesByJiraId = useApprovedProfilesByJiraId();
  const profiles = useMemo(
    () => new Map(approvedProfiles.map(p => [p.id, p])),
    [approvedProfiles]
  );
  const profilesByName = useMemo(
    () => new Map(approvedProfiles.map(p => [p.name.toLowerCase(), p])),
    [approvedProfiles]
  );

  const actorMaps = useMemo<ActorResolutionMaps>(
    () => ({ byId: profiles, byJiraId: profilesByJiraId, byName: profilesByName }),
    [profiles, profilesByJiraId, profilesByName]
  );

  // Map raw DB rows → DirectNotification display shape
  const notifications = useMemo<DirectNotification[]>(
    () => rawNotifications.map(n => mapNotification(n, actorMaps)),
    [rawNotifications, actorMaps]
  );

  // Filter + group:
  // 1. Drop old bulk-sync "Jira Sync assigned" rows (no real actor, system-generated)
  // 2. Group all notifications for the same entity_id → primary row + "+N updates" badge
  const groupedNotifications = useMemo<DirectNotification[]>(() => {
    const filtered = notifications.filter(
      n => !(n.verb === 'assigned' && n.actor?.actorType === 'system')
    );
    // notifications already sorted DESC by created_at; first occurrence per entity wins
    const seen = new Map<string, { primary: DirectNotification; count: number }>();
    for (const n of filtered) {
      const key = n.target.id;
      if (!seen.has(key)) {
        seen.set(key, { primary: n, count: 0 });
      } else {
        seen.get(key)!.count++;
      }
    }
    return Array.from(seen.values()).map(({ primary, count }) => {
      if (count === 0 || !primary.actor) return primary;
      return { ...primary, aggregation: { count, actor: primary.actor } };
    });
  }, [notifications]);

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
    ? groupedNotifications.filter(n => !resolvedReadIds.has(n.id))
    : groupedNotifications;

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
            (n.verb === 'mentioned' || n.verb === 'commented') ? (
              // Mention and comment notifications render as full activity cards
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

