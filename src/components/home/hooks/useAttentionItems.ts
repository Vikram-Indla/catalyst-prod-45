/**
 * useAttentionItems — Fetches urgency-sorted personal items.
 * Adapts to ph_issues schema: issue_key, summary, issue_type, jira_updated_at, jira_created_at.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserContext } from './useUserContext';

export type UrgencyType = 'blocked' | 'overdue' | 'aging' | 'unassigned';

export interface AttentionItem {
  id: string;
  itemKey: string;
  title: string;
  status: string;
  type: string;
  projectKey: string;
  urgency: UrgencyType;
  reason: string;
  assignee: string | null;
  daysInStatus: number;
  priority: string;
}

const FIELDS = 'issue_key, summary, status, status_category, issue_type, project_key, assignee_display_name, reporter_display_name, jira_updated_at, jira_created_at, priority, due_date';

export function useAttentionItems(userCtx: UserContext | undefined) {
  return useQuery({
    queryKey: ['attention-items', userCtx?.userId],
    queryFn: async (): Promise<AttentionItem[]> => {
      if (!userCtx || userCtx.projectKeys.length === 0) return [];
      const results: AttentionItem[] = [];
      const now = new Date();

      // 1. BLOCKED items
      const { data: blocked } = await supabase
        .from('ph_issues')
        .select(FIELDS)
        .in('project_key', userCtx.projectKeys)
        .is('jira_removed_at', null)
        .or('status.ilike.%blocked%,status.ilike.%impediment%')
        .order('jira_updated_at', { ascending: true })
        .limit(10);

      (blocked || []).forEach(item => {
        const isAssignee = item.assignee_display_name === userCtx.displayName;
        const isReporter = item.reporter_display_name === userCtx.displayName;
        const days = Math.ceil((now.getTime() - new Date(item.jira_updated_at || item.jira_created_at || now).getTime()) / 86400000);
        results.push({
          id: item.issue_key,
          itemKey: item.issue_key,
          title: item.summary,
          status: item.status,
          type: item.issue_type,
          projectKey: item.project_key,
          urgency: 'blocked',
          reason: isAssignee ? 'Assigned to you' : isReporter ? 'You reported this' : `In your project`,
          assignee: isAssignee ? null : item.assignee_display_name,
          daysInStatus: days,
          priority: item.priority || 'Medium',
        });
      });

      // 2. OVERDUE items assigned to me
      const today = now.toISOString().split('T')[0];
      const { data: overdue } = await supabase
        .from('ph_issues')
        .select(FIELDS)
        .in('project_key', userCtx.projectKeys)
        .is('jira_removed_at', null)
        .ilike('assignee_display_name', userCtx.displayName)
        .lt('due_date', today)
        .not('status', 'ilike', '%done%')
        .not('status', 'ilike', '%closed%')
        .not('status', 'ilike', '%resolved%')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(5);

      (overdue || []).forEach(item => {
        const days = Math.ceil((now.getTime() - new Date(item.due_date!).getTime()) / 86400000);
        if (!results.find(r => r.itemKey === item.issue_key)) {
          results.push({
            id: item.issue_key,
            itemKey: item.issue_key,
            title: item.summary,
            status: item.status,
            type: item.issue_type,
            projectKey: item.project_key,
            urgency: 'overdue',
            reason: `Due ${days} days ago`,
            assignee: null,
            daysInStatus: days,
            priority: item.priority || 'Medium',
          });
        }
      });

      // 3. AGING items (>14 days without update)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
      const { data: aging } = await supabase
        .from('ph_issues')
        .select(FIELDS)
        .in('project_key', userCtx.projectKeys)
        .is('jira_removed_at', null)
        .lt('jira_updated_at', twoWeeksAgo)
        .not('status', 'ilike', '%done%')
        .not('status', 'ilike', '%closed%')
        .not('status', 'ilike', '%resolved%')
        .not('status', 'ilike', '%cancelled%')
        .order('jira_updated_at', { ascending: true })
        .limit(5);

      (aging || []).forEach(item => {
        const days = Math.ceil((now.getTime() - new Date(item.jira_updated_at || now).getTime()) / 86400000);
        if (!results.find(r => r.itemKey === item.issue_key)) {
          results.push({
            id: item.issue_key,
            itemKey: item.issue_key,
            title: item.summary,
            status: item.status,
            type: item.issue_type,
            projectKey: item.project_key,
            urgency: 'aging',
            reason: `${days} days without update`,
            assignee: item.assignee_display_name,
            daysInStatus: days,
            priority: item.priority || 'Medium',
          });
        }
      });

      // 4. UNASSIGNED items
      const { data: unassigned } = await supabase
        .from('ph_issues')
        .select(FIELDS)
        .in('project_key', userCtx.projectKeys)
        .is('jira_removed_at', null)
        .is('assignee_display_name', null)
        .not('status', 'ilike', '%done%')
        .not('status', 'ilike', '%closed%')
        .order('jira_created_at', { ascending: false })
        .limit(5);

      (unassigned || []).forEach(item => {
        const days = Math.ceil((now.getTime() - new Date(item.jira_created_at || now).getTime()) / 86400000);
        if (!results.find(r => r.itemKey === item.issue_key)) {
          results.push({
            id: item.issue_key,
            itemKey: item.issue_key,
            title: item.summary,
            status: item.status,
            type: item.issue_type,
            projectKey: item.project_key,
            urgency: 'unassigned',
            reason: 'Unassigned',
            assignee: null,
            daysInStatus: days,
            priority: item.priority || 'Medium',
          });
        }
      });

      // Sort by urgency tier then by days
      const tierOrder = { blocked: 0, overdue: 1, aging: 2, unassigned: 3 };
      results.sort((a, b) => {
        const tierDiff = tierOrder[a.urgency] - tierOrder[b.urgency];
        if (tierDiff !== 0) return tierDiff;
        return b.daysInStatus - a.daysInStatus;
      });

      return results.slice(0, 5);
    },
    enabled: !!userCtx,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 2 * 60_000,
  });
}
