/**
 * useIssueRefs — batched validation of ticket keys mentioned in chat messages.
 * One query per distinct key-set: keys found in ph_issues come back with their
 * issue_type so the chip can render the canonical JiraIssueTypeIcon. Unknown
 * keys are absent from the map and render as plain text.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IssueRefMap = Record<string, { issueType: string; summary: string }>;

export function useIssueRefs(keys: string[]) {
  const sorted = Array.from(new Set(keys)).sort();
  return useQuery<IssueRefMap>({
    queryKey: ['chat', 'issue-refs', sorted.join(',')],
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, issue_type, summary')
        .in('issue_key', sorted);
      if (error) throw error;
      const map: IssueRefMap = {};
      (data ?? []).forEach((r: { issue_key: string; issue_type: string | null; summary: string | null }) => {
        map[r.issue_key] = { issueType: r.issue_type ?? 'Task', summary: r.summary ?? '' };
      });
      return map;
    },
  });
}
