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

function mapIconType(issueType: string): WorkItemIconType {
  const t = (issueType || '').toLowerCase();
  if (t.includes('bug') || t.includes('defect')) return 'bug';
  if (t.includes('story')) return 'story';
  if (t.includes('epic')) return 'epic';
  if (t.includes('incident')) return 'incident';
  if (t.includes('sub')) return 'subtask';
  return 'task';
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

      // Fetch read-receipt rows from notifications table (keyed by entity_id)
      const ids = issues.map(i => i.id);
      const { data: readRows } = await supabase
        .from('notifications')
        .select('entity_id, read_at')
        .eq('recipient_user_id', user.id)
        .eq('tab', 'direct')
        .in('entity_id', ids);

      const readMap = new Map<string, string | null>(
        (readRows ?? []).map(r => [r.entity_id, r.read_at as string | null])
      );

      const mapped: Notification[] = issues.map(issue => ({
        id: `sync::${issue.id}`,
        created_at: issue.jira_updated_at ?? new Date().toISOString(),
        read_at: readMap.get(issue.id) ?? null,
        delivered_at: null,
        snoozed_until: null,
        // actor_user_id stays null — we store reporter name in metadata instead.
        // This avoids a spurious profiles lookup for non-UUID strings.
        actor_user_id: null,
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
        // Piggyback reporter name on metadata so DirectPanel can show "X updated"
        // without needing a Supabase profiles round-trip.
        metadata: { actor_name: issue.reporter_display_name ?? null } as Notification['metadata'],
        entity_deleted: false,
        is_dismissed: false,
        recipient_user_id: user.id,
      }));

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

      // Check for an existing receipt row first
      const { data: existing } = await supabase
        .from('notifications')
        .select('id, read_at')
        .eq('recipient_user_id', user.id)
        .eq('entity_id', issueId)
        .eq('tab', 'direct')
        .maybeSingle();

      if (existing) {
        if (!existing.read_at) {
          await supabase
            .from('notifications')
            .update({ read_at: now })
            .eq('id', existing.id);
        }
      } else {
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
            metadata: {},
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
