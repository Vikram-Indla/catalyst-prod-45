/**
 * useSharedWorkItems — work items common to the logged-in user and the OTHER
 * participant of a 1:1 DM, for the dock's DM "summarize" panel.
 *
 * "Common" = the ticket's assignee/reporter pair is exactly {me, other} in
 * either direction (one is assignee, the other reporter). ph_issues has no
 * uuid user columns — only Jira `*_account_id` text ids — so both users are
 * resolved to their `profiles.jira_account_id` first, then matched against
 * `assignee_account_id` / `reporter_account_id`.
 *
 * Data path probed live 2026-07-04: ph_issues carries assignee_account_id,
 * reporter_account_id, summary, status, status_category, issue_type, priority,
 * assignee_display_name. profiles.jira_account_id maps a Catalyst user to Jira.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as unknown as { from: (table: string) => any };

/** One row rendered in the shared-work-items table. */
export interface SharedWorkItem {
  id: string;
  key: string;
  summary: string;
  status: string | null;
  statusCategory: string | null;
  issueType: string | null;
  assigneeName: string | null;
  priority: string | null;
}

interface UseSharedWorkItemsResult {
  items: SharedWorkItem[];
  isLoading: boolean;
  /** True when the query resolved but one of the two users has no Jira link. */
  noJiraLink: boolean;
}

export function useSharedWorkItems(
  otherUserId: string | null | undefined,
  enabled: boolean,
): UseSharedWorkItemsResult {
  const { user } = useAuth();
  const meId = user?.id ?? null;

  const query = useQuery({
    queryKey: ['chat', 'shared-work-items', meId, otherUserId],
    enabled: enabled && !!meId && !!otherUserId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ items: SharedWorkItem[]; noJiraLink: boolean }> => {
      // 1. Resolve both users' Jira account ids.
      const { data: profiles, error: pErr } = await db
        .from('profiles')
        .select('id, jira_account_id')
        .in('id', [meId, otherUserId]);
      if (pErr) throw pErr;

      const acctById = new Map<string, string | null>();
      (profiles ?? []).forEach((p: { id: string; jira_account_id: string | null }) =>
        acctById.set(p.id, p.jira_account_id),
      );
      const myAcct = acctById.get(meId as string) ?? null;
      const otherAcct = acctById.get(otherUserId as string) ?? null;

      // Either user unlinked from Jira → no common tickets are computable.
      if (!myAcct || !otherAcct || myAcct === otherAcct) {
        return { items: [], noJiraLink: !myAcct || !otherAcct };
      }

      // 2. Candidate rows: assignee AND reporter both within {me, other}.
      //    Two chained .in() filters = AND; array form escapes the ids safely.
      const pair = [myAcct, otherAcct];
      const { data: rows, error: iErr } = await db
        .from('ph_issues')
        .select(
          'issue_key, summary, status, status_category, issue_type, priority, assignee_account_id, reporter_account_id, assignee_display_name',
        )
        .in('assignee_account_id', pair)
        .in('reporter_account_id', pair)
        .limit(500);
      if (iErr) throw iErr;

      // 3. Keep only rows where the pair is split across the two fields
      //    (one is me, the other is the DM partner — either direction).
      const items: SharedWorkItem[] = (rows ?? [])
        .filter((r: { assignee_account_id: string | null; reporter_account_id: string | null }) => {
          const a = r.assignee_account_id;
          const rep = r.reporter_account_id;
          return (
            (a === myAcct && rep === otherAcct) ||
            (a === otherAcct && rep === myAcct)
          );
        })
        .map(
          (r: {
            issue_key: string;
            summary: string | null;
            status: string | null;
            status_category: string | null;
            issue_type: string | null;
            priority: string | null;
            assignee_display_name: string | null;
          }) => ({
            id: r.issue_key,
            key: r.issue_key,
            summary: r.summary ?? '',
            status: r.status ?? null,
            statusCategory: r.status_category ?? null,
            issueType: r.issue_type ?? null,
            assigneeName: r.assignee_display_name ?? null,
            priority: r.priority ?? null,
          }),
        );

      return { items, noJiraLink: false };
    },
  });

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading && enabled,
    noJiraLink: query.data?.noJiraLink ?? false,
  };
}
