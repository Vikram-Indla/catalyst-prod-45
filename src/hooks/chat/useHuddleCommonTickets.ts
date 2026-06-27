// src/hooks/chat/useHuddleCommonTickets.ts
/**
 * Tickets shared by the two people in a huddle — ph_issues (backlog) assigned
 * to either participant. Drives the in-call tickets modal. Supports inline
 * assignee + status changes and detail navigation.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (t: string) => any };

export interface HuddleTicket {
  issue_key: string;
  summary: string;
  status: string | null;
  status_category: string | null;
  issue_type: string;
  assignee_display_name: string | null;
  assignee_account_id: string | null;
  project_key: string | null;
  priority: string | null;
}

export interface AssigneeChoice {
  name: string;
  avatarUrl?: string;
  userId?: string;
  jiraAccountId?: string;
}

async function fetchCommonTickets(userIds: string[]): Promise<HuddleTicket[]> {
  if (userIds.length === 0) return [];
  try {
    // participant user ids → their Jira account ids
    const { data: profs } = await db.from('profiles')
      .select('jira_account_id').in('id', userIds);
    const jiraIds = ((profs ?? []) as { jira_account_id: string | null }[])
      .map((p) => p.jira_account_id).filter(Boolean) as string[];
    if (jiraIds.length === 0) return [];
    const { data, error } = await db.from('ph_issues')
      .select('issue_key, summary, status, status_category, issue_type, assignee_display_name, assignee_account_id, project_key, priority')
      .in('assignee_account_id', jiraIds)
      .is('jira_removed_at', null)
      .order('jira_updated_at', { ascending: false })
      .limit(60);
    if (error || !data) return [];
    return data as HuddleTicket[];
  } catch { return []; }
}

export function useHuddleCommonTickets(participantUserIds: string[], enabled: boolean) {
  const qc = useQueryClient();
  const key = ['chat', 'huddle', 'tickets', [...participantUserIds].sort().join(',')];

  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: enabled && participantUserIds.length > 0,
    queryFn: () => fetchCommonTickets(participantUserIds),
    staleTime: 15 * 1000,
  });

  // assignee options — all profiles (name + avatar + jira id)
  const { data: assigneeOptions } = useQuery<AssigneeChoice[]>({
    queryKey: ['chat', 'huddle', 'assignee-options'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: profs } = await db.from('profiles')
        .select('id, full_name, avatar_url, jira_account_id')
        .not('full_name', 'is', null)
        .order('full_name');
      return ((profs ?? []) as { id: string; full_name: string | null; avatar_url: string | null; jira_account_id: string | null }[])
        .map((p) => ({ name: p.full_name ?? '', avatarUrl: p.avatar_url ?? undefined, userId: p.id, jiraAccountId: p.jira_account_id ?? undefined }))
        .filter((o) => o.name);
    },
  });

  const refetch = useCallback(() => { qc.invalidateQueries({ queryKey: key }); }, [qc, key]);

  const updateAssignee = useCallback(async (issueKey: string, name: string | null) => {
    const choice = (assigneeOptions ?? []).find((o) => o.name === name);
    await db.from('ph_issues')
      .update({ assignee_display_name: name, assignee_account_id: choice?.jiraAccountId ?? null, updated_at: new Date().toISOString() })
      .eq('issue_key', issueKey);
    refetch();
  }, [assigneeOptions, refetch]);

  const updateStatus = useCallback(async (issueKey: string, status: string) => {
    await db.from('ph_issues')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('issue_key', issueKey);
    refetch();
  }, [refetch]);

  return {
    tickets: data ?? [],
    loading: isLoading,
    assigneeOptions: assigneeOptions ?? [],
    updateAssignee,
    updateStatus,
  };
}
