/**
 * LinkedWorkItems — data hooks.
 *
 * Contract parity with the legacy `LinkedIssuesSection`:
 *   - reads/writes `ph_issue_links` using `source_id`/`target_id` = issue_key
 *   - resolves targets from `ph_issues` first, then falls back to
 *     `catalyst_issues` for locally-created items
 *   - shares React Query key `['linkedIssues', issueKey]` so the legacy UI
 *     and the new molecule stay in cache lockstep during the BAU-4771 pilot
 *   - surfaces toast notifications via `catalystToast` (same channel as
 *     the legacy implementation) so activity feedback remains consistent
 *   - treats duplicate unique_link violations as a non-error (already linked)
 *   - invalidates linked-issue list after mutations so the count in the
 *     collapsible header, row list, and optimistic deltas stay honest
 *
 * This hook is the only place that talks to Supabase for link CRUD; UI
 * components import pure data + handlers and never touch the client.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { LinkedWorkItem, LinkedWorkItemTarget } from './types';
import type { StatusCategory } from '../dialogs/story-detail-modules/types';

const LINKED_ISSUES_KEY = (issueKey: string) => ['linkedIssues', issueKey] as const;

function toStatusCategory(raw: unknown): StatusCategory {
  const c = String(raw ?? '').toLowerCase();
  if (c === 'done') return 'done';
  if (c === 'in_progress' || c === 'inprogress') return 'in_progress';
  return 'todo';
}

export function useLinkedWorkItems(issueKey: string) {
  return useQuery<LinkedWorkItem[]>({
    queryKey: LINKED_ISSUES_KEY(issueKey),
    enabled: !!issueKey,
    queryFn: async () => {
      const { data: rawLinks, error } = await supabase
        .from('ph_issue_links')
        .select('id, link_type, created_at, source_id, target_id')
        .or(`source_id.eq.${issueKey},target_id.eq.${issueKey}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!rawLinks?.length) return [];

      const targetKeys = rawLinks.map((l) =>
        l.source_id === issueKey ? l.target_id : l.source_id,
      );

      const { data: phTargets } = await supabase
        .from('ph_issues')
        .select(
          'issue_key, summary, status, status_category, issue_type, assignee_account_id, assignee_display_name, priority, jira_updated_at, project_key',
        )
        .in('issue_key', targetKeys)
        .is('jira_removed_at', null)
        .is('archived_at', null);

      const targetMap = new Map<string, LinkedWorkItemTarget>(
        (phTargets ?? []).map((t: any) => [
          t.issue_key,
          {
            issue_key: t.issue_key,
            summary: t.summary,
            issue_type: t.issue_type,
            status: t.status,
            status_category: toStatusCategory(t.status_category),
            assignee_account_id: t.assignee_account_id,
            assignee_display_name: t.assignee_display_name,
            assignee_avatar_url: null,
            priority: t.priority,
            jira_updated_at: t.jira_updated_at,
            project_key: t.project_key,
          } satisfies LinkedWorkItemTarget,
        ]),
      );

      const missingKeys = targetKeys.filter((k) => !targetMap.has(k));
      if (missingKeys.length > 0) {
        const { data: catTargets } = await supabase
          .from('catalyst_issues')
          .select('id, issue_key, title, status, issue_type, assignee_id, priority, project_id')
          .in('issue_key', missingKeys);
        (catTargets ?? []).forEach((ct: any) => {
          targetMap.set(ct.issue_key, {
            id: ct.id,
            issue_key: ct.issue_key,
            summary: ct.title,
            issue_type: ct.issue_type,
            status: ct.status,
            status_category:
              ct.status === 'Done'
                ? 'done'
                : ct.status === 'In Progress'
                ? 'in_progress'
                : 'todo',
            assignee_account_id: ct.assignee_id,
            assignee_display_name: null,
            assignee_avatar_url: null,
            priority: ct.priority,
            jira_updated_at: null,
            project_id: ct.project_id,
          });
        });
      }

      // Fallback 3: resolve missing keys from ph_requests (Catalyst-native
      // initiatives, MIM-* / MDT-*). Requests map to "issue_type=Request"
      // for icon/lozenge rendering. 2026-04-30 cycle 7: column renamed from
      // `initiative_key` → `request_key` (CLAUDE.md 2026-04-29 rename
      // lesson); the prior reference silently broke this branch in production.
      const stillMissing3 = targetKeys.filter((k) => !targetMap.has(k));
      if (stillMissing3.length > 0) {
        const { data: initTargets } = await supabase
          .from('ph_requests')
          .select('id, request_key, title, status, assignee_id, priority, updated_at')
          .in('request_key', stillMissing3)
          .eq('is_deleted', false);
        (initTargets ?? []).forEach((it: any) => {
          const status = String(it.status ?? '');
          const status_category: StatusCategory =
            status === 'closed' ? 'done' : status === 'in_progress' ? 'in_progress' : 'todo';
          targetMap.set(it.request_key, {
            id: it.id,
            issue_key: it.request_key,
            summary: it.title,
            issue_type: 'Request',
            status,
            status_category,
            assignee_account_id: it.assignee_id ?? null,
            assignee_display_name: null,
            assignee_avatar_url: null,
            priority: it.priority ?? null,
            jira_updated_at: it.updated_at ?? null,
          });
        });
      }

      // Fallback 4: resolve missing keys from business_requests (Catalyst-native
      // BRs, MIM-*). 2026-04-30 cycle 7: when an Epic/Story detail view reads
      // its links, BR-source links (source_id=MIM-XXX) couldn't resolve their
      // target row because business_requests was missing from the chain.
      // Maps to "issue_type=Business Request" for icon rendering.
      const stillMissing4 = targetKeys.filter((k) => !targetMap.has(k));
      if (stillMissing4.length > 0) {
        const { data: brTargets } = await supabase
          .from('business_requests')
          .select('id, request_key, title, process_step, assignee, priority_tier, updated_at')
          .in('request_key', stillMissing4)
          .is('deleted_at', null);
        (brTargets ?? []).forEach((br: any) => {
          const status = String(br.process_step ?? '');
          const lower = status.toLowerCase();
          const status_category: StatusCategory =
            lower === 'closed' || lower === 'delivered' || lower === 'cancelled'
              ? 'done'
              : lower === 'in_progress' || lower === 'implementation'
              ? 'in_progress'
              : 'todo';
          targetMap.set(br.request_key, {
            id: br.id,
            issue_key: br.request_key,
            summary: br.title,
            issue_type: 'Business Request',
            status,
            status_category,
            assignee_account_id: br.assignee ?? null,
            assignee_display_name: null,
            assignee_avatar_url: null,
            priority: br.priority_tier ?? null,
            jira_updated_at: br.updated_at ?? null,
          });
        });
      }

      // Resolve assignee avatars from jira_identity_map (canonical pattern,
      // matches SubtasksPanelV2 / IssueListPanel).
      const assigneeAccountIds = Array.from(
        new Set(
          Array.from(targetMap.values())
            .map((t) => t.assignee_account_id)
            .filter((id): id is string => !!id),
        ),
      );
      if (assigneeAccountIds.length > 0) {
        const { data: avatarRows } = await supabase
          .from('jira_identity_map')
          .select('jira_account_id, avatar_url')
          .in('jira_account_id', assigneeAccountIds);
        const avatarMap = new Map<string, string | null>();
        (avatarRows ?? []).forEach((r: any) => {
          if (r.jira_account_id) avatarMap.set(r.jira_account_id, r.avatar_url);
        });
        targetMap.forEach((t) => {
          if (t.assignee_account_id && avatarMap.has(t.assignee_account_id)) {
            t.assignee_avatar_url = avatarMap.get(t.assignee_account_id) ?? null;
          }
        });
      }

      return rawLinks
        .map((l): LinkedWorkItem | null => {
          const key = l.source_id === issueKey ? l.target_id : l.source_id;
          const target = targetMap.get(key);
          if (!target) return null;
          return {
            id: l.id,
            link_type: l.link_type,
            created_at: l.created_at,
            source_id: l.source_id,
            target_id: l.target_id,
            target,
          };
        })
        .filter((l): l is LinkedWorkItem => l !== null);
    },
  });
}

export function useLinkMutations(issueKey: string) {
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: LINKED_ISSUES_KEY(issueKey) });
  }, [queryClient, issueKey]);

  const linkMutation = useMutation({
    mutationFn: async ({
      linkType,
      targetKeys,
    }: {
      linkType: string;
      targetKeys: string[];
    }) => {
      if (!targetKeys.length) return { linked: 0 };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let linked = 0;
      for (const targetKey of targetKeys) {
        if (targetKey === issueKey) continue; // defensive: no self-links
        const { error } = await supabase.from('ph_issue_links').insert({
          source_id: issueKey,
          target_id: targetKey,
          link_type: linkType,
          created_by: user.id,
        } as any);
        if (error) {
          // Unique-constraint collisions mean the link already exists; swallow
          // so a bulk-link flow with partial duplicates still succeeds cleanly.
          if (error.code === '23505' || error.message?.includes('unique_link')) continue;
          throw error;
        }
        linked += 1;
      }
      return { linked };
    },
    onSuccess: ({ linked }) => {
      if (linked > 0) {
        catalystToast.success(`Linked ${linked} item${linked > 1 ? 's' : ''}`);
      } else {
        catalystToast.info('Items already linked');
      }
      invalidate();
    },
    onError: (err: any) => {
      catalystToast.error('Failed to link', err.message);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('ph_issue_links').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      catalystToast.success('Link removed');
      invalidate();
    },
    onError: (err: any) => {
      catalystToast.error('Failed to unlink', err.message);
    },
  });

  return { linkMutation, unlinkMutation, invalidate };
}
