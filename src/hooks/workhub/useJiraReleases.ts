/**
 * useJiraReleases — Server-side aggregation via fn_ph_release_summary()
 * Replaces slow client-side batched approach with single RPC call
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JiraRelease {
  versionName: string;
  releaseDate: string | null;
  totalItems: number;
  doneItems: number;
  inProgressItems: number;
  inReviewItems: number;
  blockedItems: number;
  todoItems: number;
  completionPercent: number;
  projects: string[];
  assignees: JiraReleaseAssignee[];
}

export interface JiraReleaseAssignee {
  accountId: string;
  displayName: string;
  avatarUrl: string | null;
  roleName: string | null;
}

export function useJiraReleases() {
  return useQuery({
    queryKey: ['projecthub', 'jira-releases'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_ph_release_summary' as any);
      if (error) throw new Error(error.message);

      return ((data as any[]) ?? []).map((r): JiraRelease => ({
        versionName: r.version_name,
        releaseDate: r.release_date || null,
        totalItems: Number(r.total_items),
        doneItems: Number(r.done_items),
        inProgressItems: Number(r.in_progress_items),
        inReviewItems: Number(r.in_review_items),
        blockedItems: Number(r.blocked_items),
        todoItems: Number(r.todo_items),
        completionPercent: Number(r.completion_percent),
        projects: r.projects ?? [],
        assignees: ((r.assignees as any[]) ?? []).map((a: any) => ({
          accountId: a.accountId ?? '',
          displayName: a.displayName ?? '',
          avatarUrl: a.avatarUrl || null,
          roleName: a.roleName || null,
        })).sort((a: JiraReleaseAssignee, b: JiraReleaseAssignee) =>
          a.displayName.localeCompare(b.displayName)
        ),
      }));
    },
    staleTime: 60_000,
  });
}

export function useJiraRelease(versionName: string) {
  const { data: allReleases, ...rest } = useJiraReleases();
  const release = allReleases?.find(r => r.versionName === versionName) ?? null;
  return { data: release, ...rest };
}
