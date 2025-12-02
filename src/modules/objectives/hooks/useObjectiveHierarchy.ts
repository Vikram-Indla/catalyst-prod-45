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
      const { data: current, error: currentError } = await supabase
        .from('objectives')
        .select(`
          *
        `)
        .eq('id', objectiveId)
        .single();

      if (currentError) throw currentError;

      // Fetch key results separately using key_results_v2
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

      // Fetch children
      const { data: children } = await supabase
        .from('objectives')
        .select('*')
        .eq('parent_objective_id', objectiveId);

      return {
        current: currentWithKRs,
        parents: parents.reverse(), // Show top-most parent first
        children: children || [],
      };
    },
    enabled: !!objectiveId,
  });
}
