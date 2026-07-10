/**
 * Ideation · Explore — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S4.
 *
 * Reads idn_ideas directly (greenfield idn_* schema). Unlike useIdeationInbox
 * (S1, which restricts to the triage subset submitted/screening/evaluation),
 * this fetches every idea — Explore is the browse-everything surface.
 * Zero legacy carryover: never import/query ph_ideas here.
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import type { IdeaRow } from '@/modules/ideation/types';

export const IDEATION_EXPLORE_KEY = ['ideation', 'explore'] as const;

export function useIdeationExplore() {
  return useQuery({
    queryKey: IDEATION_EXPLORE_KEY,
    queryFn: async (): Promise<IdeaRow[]> => {
      const { data, error } = await typedQuery('idn_ideas')
        .select('id, idea_key, slug, title, problem_statement, idea_class, workflow_status_key, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IdeaRow[];
    },
    staleTime: 15_000,
  });
}
