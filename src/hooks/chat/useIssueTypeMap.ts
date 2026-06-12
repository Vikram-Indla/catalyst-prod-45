import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Batch-fetches issue_type for a set of Jira keys.
 * Returns Map<issueKey, issueType> — keys absent from ph_issues produce no entry.
 * Caller must NOT fall back to a typed default if a key is missing (CLAUDE.md zero-assumption).
 */
export function useIssueTypeMap(issueKeys: string[]): Map<string, string> {
  const uniqueKeys = [...new Set(issueKeys)].sort();

  const { data } = useQuery<Map<string, string>>({
    queryKey: ['chat-issue-type-map', uniqueKeys],
    queryFn: async () => {
      if (uniqueKeys.length === 0) return new Map();
      const { data: rows } = await db
        .from('ph_issues')
        .select('issue_key, issue_type')
        .in('issue_key', uniqueKeys);
      const map = new Map<string, string>();
      for (const row of (rows ?? []) as Array<{ issue_key: string; issue_type: string }>) {
        if (row.issue_key && row.issue_type) {
          map.set(row.issue_key, row.issue_type);
        }
      }
      return map;
    },
    enabled: uniqueKeys.length > 0,
    staleTime: 5 * 60_000,
  });

  return data ?? new Map();
}
