/**
 * Canonical hook — fetches a single ph_issue by ID.
 * Used by all CatalystView* components.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PhIssue } from '../types';

export function useCatalystIssue(itemId: string, isOpen: boolean) {
  return useQuery({
    queryKey: ['cv-issue-detail', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      // F-iter9 PK fix: ph_issues PK is issue_key (text), not id. itemId
      // here is the issue_key passed by the BacklogPage panel wiring.
      const { data, error } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('issue_key', itemId)
        .is('deleted_at', null)
        .maybeSingle();
      // CAT-DETAIL-MODAL-404-20260702-001: a swallowed query error (RLS,
      // transient failure, schema drift) previously looked identical to
      // "no such issue_key" — throw so callers can tell a real failure
      // apart from a genuinely missing row.
      if (error) throw error;
      return data as unknown as PhIssue | null;
    },
    // 2026-05-24 — anti-dance fix: keep the previous ticket's data visible
    // while the next one loads so the breadcrumb and body don't flash through
    // null/skeleton on every navigation in the allwork split panel.
    // staleTime: 30s avoids refetching tickets the user revisits within the
    // same session (back-and-forth between two tickets).
    staleTime: 30_000,
    placeholderData: (previousData: PhIssue | null | undefined) => previousData,
  });
}
