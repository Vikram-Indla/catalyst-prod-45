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
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('issue_key', itemId)
        .is('deleted_at', null)
        .maybeSingle();
      return data as unknown as PhIssue | null;
    },
  });
}
