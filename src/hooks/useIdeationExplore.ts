/**
 * Ideation · Explore fetch — CAT-IDEATION-REBUILD-20260709-001 Phase 2 S4.
 *
 * Reads idn_ideas directly (greenfield idn_* schema). Zero legacy carryover:
 * never import/query ph_ideas or ph_idea_* here.
 *
 * D16 (03_PLAN_LOCK_PHASE2_S4_EXPLORE.md): idn_ideas SELECT RLS has no
 * ownership or status clause — any approved user can read every row,
 * including other users' drafts (20260709130000_idn_core_schema.sql:222-224).
 * Draft exclusion is therefore enforced HERE, in the query itself, not just
 * in the UI — a client-side filter toggle must never be able to re-request
 * drafts. Sibling of useIdeationInbox.ts (which filters to the 3 active
 * triage statuses); this hook is the "all non-draft statuses" superset.
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
        .neq('workflow_status_key', 'draft') // D16 — never surface drafts here
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IdeaRow[];
    },
    staleTime: 15_000,
  });
}
