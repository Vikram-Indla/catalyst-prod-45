/**
 * useParentIssueTypes — resolve the TRUE issue_type of each parent key.
 *
 * Parent work items (epics, features, stories) are frequently NOT present
 * in the current table's result set (an Epic parent never appears in a
 * Story backlog). To draw the parent's real type icon we look its type up
 * directly in ph_issues. When a parent is genuinely unsynced the map has
 * no entry and the caller renders NO icon — never a fabricated default
 * (CLAUDE.md zero-assumption rule 2026-06-11: silence beats a lie).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Build a key→type map, skipping rows with a missing key or type. */
export function buildParentTypeMap(
  rows: Array<{ issue_key: string | null; issue_type: string | null }>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    if (r.issue_key && r.issue_type) m.set(r.issue_key, r.issue_type);
  }
  return m;
}

/**
 * Fetch parent issue types for the given parent keys. Returns a
 * `Map<issue_key, issue_type>`; absent keys mean the parent isn't synced.
 */
export function useParentIssueTypes(
  parentKeys: Array<string | null | undefined>,
): Map<string, string> {
  const keys = Array.from(
    new Set(parentKeys.filter((k): k is string => !!k)),
  ).sort();

  const { data } = useQuery({
    queryKey: ['parent-issue-types', keys],
    enabled: keys.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('ph_issues')
        .select('issue_key, issue_type')
        .in('issue_key', keys);
      return buildParentTypeMap((rows ?? []) as any[]);
    },
  });

  return data ?? new Map<string, string>();
}
