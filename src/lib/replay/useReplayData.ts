// Fetches all issues in a hierarchy rooted at `rootKey` + their transitions,
// then runs the business rule engine to produce a ReplayResult.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildReplayResult } from './replayEngine';
import type { ReplayIssue, WorkItemTransition, ReplayResult } from './replayTypes';

const SELECT_ISSUE = 'id,issue_key,issue_type,summary,parent_key,project_key,jira_created_at,jira_updated_at,raw_json';

function extractMilestoneFields(row: any): Pick<ReplayIssue, 'due_date' | 'target_start' | 'target_end' | 'sprint_end_date' | 'release_date'> {
  const f = row.raw_json?.fields ?? {};
  return {
    due_date: f.duedate ?? null,
    target_start: f.customfield_10015 ?? null,
    target_end: f.customfield_10016 ?? null,
    sprint_end_date: (f.sprint?.endDate ?? f.customfield_10020?.[0]?.endDate) ?? null,
    release_date: (f.fixVersions?.[0]?.releaseDate) ?? null,
  };
}

function rowToReplayIssue(row: any): ReplayIssue {
  return {
    id: row.id,
    issue_key: row.issue_key,
    issue_type: row.issue_type ?? 'Task',
    summary: row.summary ?? '',
    parent_key: row.parent_key ?? null,
    project_key: row.project_key ?? '',
    jira_created_at: row.jira_created_at ?? null,
    jira_updated_at: row.jira_updated_at ?? null,
    ...extractMilestoneFields(row),
  };
}

async function fetchHierarchy(rootKey: string): Promise<ReplayIssue[]> {
  const collected = new Map<string, ReplayIssue>();
  const queue: string[] = [rootKey];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const keys = queue.splice(0, 50); // batch by 50
    const unvisited = keys.filter((k) => !visited.has(k));
    if (!unvisited.length) continue;
    unvisited.forEach((k) => visited.add(k));

    const { data, error } = await supabase
      .from('ph_issues')
      .select(SELECT_ISSUE)
      .in('issue_key', unvisited);

    if (error) throw error;
    if (!data?.length) continue;

    for (const row of data) {
      collected.set(row.issue_key, rowToReplayIssue(row));
    }

    // Fetch children of these keys.
    const { data: children } = await supabase
      .from('ph_issues')
      .select(SELECT_ISSUE)
      .in('parent_key', unvisited);

    for (const child of children ?? []) {
      if (!visited.has(child.issue_key)) {
        collected.set(child.issue_key, rowToReplayIssue(child));
        queue.push(child.issue_key);
      }
    }
  }

  return Array.from(collected.values());
}

async function fetchTransitions(issueIds: string[]): Promise<WorkItemTransition[]> {
  if (!issueIds.length) return [];
  const { data, error } = await supabase
    .from('work_item_transitions')
    .select('id,work_item_id,from_status,to_status,from_status_category,to_status_category,transitioned_by,transitioned_by_avatar,transitioned_at,time_in_from_status_ms,jira_changelog_id')
    .in('work_item_id', issueIds)
    .order('transitioned_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkItemTransition[];
}

export function useReplayData(rootKey: string | null) {
  return useQuery<ReplayResult>({
    queryKey: ['replay', rootKey],
    queryFn: async () => {
      if (!rootKey) throw new Error('No key');
      const issues = await fetchHierarchy(rootKey.toUpperCase());
      if (!issues.length) throw new Error(`No issue found for key: ${rootKey}`);
      const ids = issues.map((i) => i.id);
      const transitions = await fetchTransitions(ids);
      return buildReplayResult(issues, transitions);
    },
    enabled: !!rootKey,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
