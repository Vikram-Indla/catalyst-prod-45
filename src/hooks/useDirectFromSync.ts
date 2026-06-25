/**
 * useDirectFromSync — Direct-tab notifications derived from live ph_issues.
 *
 * Architecture:
 *  - Data source:  ph_issues (Jira-synced, always fresh)
 *  - Read state:   notifications table used as a lightweight read-receipt store
 *                  keyed by (recipient_user_id, entity_id, tab='direct')
 *  - Badge count:  ph_issues updated since the panel was last opened
 *                  (timestamp kept in localStorage)
 *
 * Pattern mirrors useAgeingItems: resolve jira_account_id → query ph_issues.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Notification, WorkItemIconType, StatusType } from '@/types/notifications';

export const NOTIF_LAST_OPENED_KEY = 'catalyst_notif_panel_last_opened';

// ─── helpers ──────────────────────────────────────────────────────────────────

// Canonical Jira issue type → WorkItemIconType (notifications.ts).
// Frontend and Backend have distinct SVGs; Integration shares the subtask icon.
// Unknown types fall back to 'task' — never dropped.
const ISSUE_TYPE_TO_ICON: Readonly<Record<string, WorkItemIconType>> = {
  // Subtask family
  'Sub-task':            'subtask',
  'Frontend':            'frontend',
  'Backend':             'backend',
  'Integration':         'subtask',
  // Standard work item types
  'Story':               'story',
  'Task':                'task',
  'QA Bug':              'bug',
  'Defect':              'bug',
  'Epic':                'epic',
  'Feature':             'feature',
  'Production Incident': 'incident',
  'Change Request':      'change_request',
  'Business Gap':        'business_gap',
  'API Requirement':     'task',
} as const;

function mapIconType(issueType: string): WorkItemIconType {
  return (ISSUE_TYPE_TO_ICON[issueType] ?? 'task') as WorkItemIconType;
}

function mapStatusType(cat: string | null): StatusType {
  const c = (cat || '').toLowerCase().replace(/[\s_-]/g, '');
  if (c === 'inprogress') return 'blue';
  if (c === 'done') return 'green';
  return 'gray';
}

async function resolveJiraId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('jira_account_id')
    .eq('id', userId)
    .single();
  return (data as { jira_account_id?: string | null } | null)?.jira_account_id ?? null;
}

// ─── useDirectFromSync ────────────────────────────────────────────────────────

export function useDirectFromSync(unreadOnly: boolean) {
  return useQuery({
    queryKey: ['direct-from-sync', unreadOnly],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Notification[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const myJiraId = await resolveJiraId(user.id);
      if (!myJiraId) return [];

      // Fetch assigned ph_issues, most-recently-updated first
      const { data: issues, error } = await supabase
        .from('ph_issues')
        .select(
          'id, issue_key, issue_type, summary, status, status_category, jira_updated_at, reporter_display_name'
        )
        .eq('assignee_account_id', myJiraId)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!issues?.length) return [];

      // Fetch read-receipt + actor data from the notifications table (keyed by entity_id).
      // Actor data is critical: the 'assigned' event rows (written by wh-jira-sync) carry
      // actor_display_name in metadata. These rows may be beyond page-1 of the 20-per-page
      // useNotificationsQuery pagination, so the merge in DirectPanel.tsx can't see them to
      // exclude sync items or forward their actor data. We fetch here directly by entity_id
      // (no pagination limit) so actor names always reach the sync item regardless of page depth.
      const ids = issues.map(i => i.id);
      const { data: readRows } = await supabase
        .from('notifications')
        .select('entity_id, read_at, notification_type, metadata, actor_user_id, created_at')
        .eq('recipient_user_id', user.id)
        .eq('tab', 'direct')
        .in('entity_id', ids)
        .order('created_at', { ascending: false });

      // Build read map AND actor map from fetched rows.
      // Actor map: prefer 'assigned' event row (wh-jira-sync) over read-receipt rows for each entity_id.
      const readMap = new Map<string, string | null>();
      const actorMap = new Map<string, { name: string | null; avatarUrl: string | null; userId: string | null }>();

      for (const r of (readRows ?? [])) {
        // Read state: use the most-recent read_at (rows are DESC by created_at, so first wins)
        if (!readMap.has(r.entity_id)) {
          readMap.set(r.entity_id, r.read_at as string | null);
        } else if ((r.read_at as string | null) && !readMap.get(r.entity_id)) {
          readMap.set(r.entity_id, r.read_at as string | null);
        }

        // Actor state: pick actor-rich assigned event row; skip read-receipt rows (metadata={})
        const meta = r.metadata as Record<string, unknown> | null;
        const actorName = (meta?.actor_display_name ?? meta?.actor_name) as string | undefined;
        const actorAvatar = meta?.actor_avatar_url as string | undefined;
        const isAssignmentEvent = ['assigned', 'assigned_work_item', 'assigned_story', 'tester_assigned'].includes(
          r.notification_type as string
        );
        if (isAssignmentEvent && actorName && actorName.trim() && !actorMap.has(r.entity_id)) {
          actorMap.set(r.entity_id, {
            name: actorName.trim(),
            avatarUrl: (actorAvatar && actorAvatar.trim()) ? actorAvatar.trim() : null,
            userId: r.actor_user_id as string | null,
          });
        }
      }

      const mapped: Notification[] = issues.map(issue => {
        const actor = actorMap.get(issue.id);
        return {
          id: `sync::${issue.id}`,
          created_at: issue.jira_updated_at ?? new Date().toISOString(),
          read_at: readMap.get(issue.id) ?? null,
          delivered_at: null,
          snoozed_until: null,
          // If we found an actor-rich event row for this entity_id, forward its actor_user_id
          // so the 5-layer actor resolution in DirectPanel.mapNotification can use it.
          actor_user_id: actor?.userId ?? null,
          notification_type: 'assigned_work_item' as const,
          entity_type: 'issue' as const,
          entity_id: issue.id,
          entity_key: issue.issue_key,
          entity_title: issue.summary,
          entity_icon_type: mapIconType(issue.issue_type),
          hub_source: 'ProjectHub',
          status: (issue.status || 'TO DO').toUpperCase(),
          status_type: mapStatusType(issue.status_category),
          tab: 'direct' as const,
          // Embed actor name from the event notification (bypasses pagination limit).
          // is_jira_sync: true → DirectNotificationRow knows this is a sync item.
          metadata: {
            is_jira_sync: true,
            actor_display_name: actor?.name ?? null,
            actor_avatar_url: actor?.avatarUrl ?? null,
          } as unknown as Notification['metadata'],
          entity_deleted: false,
          is_dismissed: false,
          recipient_user_id: user.id,
        };
      });

      return unreadOnly ? mapped.filter(n => !n.read_at) : mapped;
    },
  });
}

// ─── useMarkSyncAsRead ────────────────────────────────────────────────────────
//
// Writes a read receipt into the notifications table so read state survives
// across sessions and browser tabs.  Uses a select-then-update/insert pattern
// because the table has no unique constraint on (recipient, entity_id, tab).

export function useMarkSyncAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Notification) => {
      if (notification.read_at) return; // already read — nothing to do
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const issueId = notification.entity_id;

      // Use .select() (not .maybeSingle()) — multiple rows can exist for the same
      // entity_id+tab when a read-receipt 'assigned_work_item' row coexists with
      // the original 'assigned' event row. .maybeSingle() errors on >1 rows,
      // which caused the old code to fall through to INSERT and create a third row.
      const { data: existingRows } = await supabase
        .from('notifications')
        .select('id, read_at, notification_type')
        .eq('recipient_user_id', user.id)
        .eq('entity_id', issueId)
        .eq('tab', 'direct');

      // Prefer the actor-rich 'assigned' event row; fall back to any row found.
      const toUpdate = existingRows?.find(r => r.notification_type === 'assigned')
        ?? existingRows?.find(r => (r.notification_type as string) !== 'assigned_work_item')
        ?? existingRows?.[0];

      if (toUpdate) {
        if (!toUpdate.read_at) {
          await supabase
            .from('notifications')
            .update({ read_at: now })
            .eq('id', toUpdate.id);
        }
      } else {
        // No existing notification for this issue — create a read receipt so
        // read state survives across sessions. Include actor metadata from the
        // sync item so future resolver passes can extract the actor name.
        const srcMeta = notification.metadata as Record<string, unknown> | null;
        await supabase
          .from('notifications')
          .insert({
            recipient_user_id: user.id,
            entity_id: issueId,
            entity_key: notification.entity_key,
            entity_title: notification.entity_title,
            entity_type: notification.entity_type,
            entity_icon_type: notification.entity_icon_type,
            notification_type: notification.notification_type,
            status: notification.status,
            status_type: notification.status_type,
            tab: 'direct',
            hub_source: 'ProjectHub',
            read_at: now,
            metadata: {
              is_jira_sync: true,
              actor_display_name: srcMeta?.actor_display_name ?? null,
              actor_avatar_url: srcMeta?.actor_avatar_url ?? null,
            },
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-from-sync'] });
    },
  });
}

// ─── useUnreadCountFromSync ───────────────────────────────────────────────────
//
// Badge count = ph_issues assigned to the user that were updated in Jira
// *after* the user last opened the notification panel.
//
// When the panel opens, NotificationPanel records the current timestamp in
// localStorage(NOTIF_LAST_OPENED_KEY) and invalidates this query, which
// causes the badge to reset to 0 (you've now "seen" everything up to now).

export function useUnreadCountFromSync() {
  return useQuery({
    queryKey: ['notifications-unread-count-sync'],
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const myJiraId = await resolveJiraId(user.id);
      if (!myJiraId) return 0;

      // Default: show items updated in the last 24 h on first visit
      const stored = localStorage.getItem(NOTIF_LAST_OPENED_KEY);
      const since = stored ?? new Date(Date.now() - 24 * 3_600_000).toISOString();

      const { count } = await supabase
        .from('ph_issues')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_account_id', myJiraId)
        .is('deleted_at', null)
        .gt('jira_updated_at', since);

      return count ?? 0;
    },
  });
}
