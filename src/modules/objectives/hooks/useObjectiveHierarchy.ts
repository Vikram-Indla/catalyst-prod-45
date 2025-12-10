import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchParentChain(parentId: string | null, chain: any[] = []): Promise<any[]> {
  if (!parentId) return chain;

  const { data: parent } = await supabase
    .from('objectives')
    .select('*')
    .eq('id', parentId)
    .single();

  if (!parent) return chain;

  chain.push(parent);
  return fetchParentChain(parent.parent_objective_id, chain);
}

export function useObjectiveHierarchy(objectiveId: string) {
  return useQuery({
    queryKey: ['objective-hierarchy', objectiveId],
    queryFn: async () => {
      // Fetch the current (selected) objective
      const { data: current, error: currentError } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId)
        .single();

      if (currentError) throw currentError;

      // Fetch key results ONLY for the selected objective (not children)
      const { data: keyResults } = await supabase
        .from('key_results_v2')
        .select('*')
        .eq('objective_id', objectiveId);

      const currentWithKRs = {
        ...current,
        keyResults: keyResults || [],
      };

      // Fetch parents (recursive up)
      const parents = await fetchParentChain(currentWithKRs.parent_objective_id);

      // Fetch direct children (where parent_objective_id = this objective)
      const { data: children } = await supabase
        .from('objectives')
        .select('*')
        .eq('parent_objective_id', objectiveId);

      // For each child, fetch their own KRs to calculate their progress
      const childrenWithKRs = await Promise.all(
        (children || []).map(async (child) => {
          const { data: childKRs } = await supabase
            .from('key_results_v2')
            .select('*')
            .eq('objective_id', child.id);

          // Calculate child's KR progress from their own KRs only
          const childKeyResults = childKRs || [];
          let krProgress = 0;
          if (childKeyResults.length > 0) {
            const totalProgress = childKeyResults.reduce((sum, kr) => {
              const baseline = kr.baseline_value || 0;
              const current = kr.current_value || baseline;
              const goal = kr.goal_value || 1;
              const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) : 0;
              return sum + Math.max(0, Math.min(1, progress));
            }, 0);
            krProgress = totalProgress / childKeyResults.length;
          }

          return {
            ...child,
            keyResults: childKeyResults,
            calculatedKrProgress: krProgress,
            krCount: childKeyResults.length,
          };
        })
      );

      return {
        current: currentWithKRs,
        parents: parents.reverse(), // Show top-most parent first
        children: childrenWithKRs,
      };
    },
    enabled: !!objectiveId,
  });
}
