/**
 * useIssueRefs — batched validation of ticket keys mentioned in chat messages.
 * One query per distinct key-set: keys found in ph_issues come back with their
 * issue_type and status_category so the chip can render the canonical icon
 * and status-tinted background. Unknown keys are absent from the map and
 * render as plain text.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IssueRefMap = Record<string, {
  issueType: string;
  summary: string;
  statusCategory: string | null;
}>;

export function useIssueRefs(keys: string[]) {
  const sorted = Array.from(new Set(keys)).sort();
  return useQuery<IssueRefMap>({
    queryKey: ['chat', 'issue-refs', sorted.join(',')],
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_key, issue_type, summary, status_category')
        .in('issue_key', sorted);
      if (error) throw error;
      const map: IssueRefMap = {};
      (data ?? []).forEach((r: {
        issue_key: string;
        issue_type: string | null;
        summary: string | null;
        status_category: string | null;
      }) => {
        map[r.issue_key] = {
          issueType: r.issue_type ?? '',
          summary: r.summary ?? '',
          statusCategory: r.status_category ?? null,
        };
      });
      return map;
    },
  });
}
