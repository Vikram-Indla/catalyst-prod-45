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
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', itemId)
        .is('deleted_at', null)
        .single();
      return data as unknown as PhIssue | null;
    },
  });
}
