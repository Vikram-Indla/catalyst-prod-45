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

      // Fetch portfolio and program names for context
      let portfolioName = null;
      let programName = null;

      if (current.portfolio_id) {
        const { data: portfolio } = await supabase
          .from('portfolios')
          .select('name')
          .eq('id', current.portfolio_id)
          .single();
        portfolioName = portfolio?.name;
      }

      if (current.program_id) {
        const { data: program } = await supabase
          .from('programs')
          .select('name')
          .eq('id', current.program_id)
          .single();
        programName = program?.name;
      }

      // Calculate parent's KR progress from its own KRs
      const parentKRs = keyResults || [];
      let parentKrProgress = 0;
      if (parentKRs.length > 0) {
        const totalProgress = parentKRs.reduce((sum, kr) => {
          const baseline = kr.baseline_value || 0;
          const current = kr.current_value || baseline;
          const goal = kr.goal_value || 1;
          const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) : 0;
          return sum + Math.max(0, Math.min(1, progress));
        }, 0);
        parentKrProgress = totalProgress / parentKRs.length;
      }

      const currentWithKRs = {
        ...current,
        keyResults: keyResults || [],
        portfolioName,
        programName,
        calculatedKrProgress: parentKrProgress,
      };

      // Fetch parents (recursive up)
      const parents = await fetchParentChain(currentWithKRs.parent_objective_id);

      // Fetch direct children (where parent_objective_id = this objective)
      const { data: children } = await supabase
        .from('objectives')
        .select('*')
        .eq('parent_objective_id', objectiveId);

      // For each child, fetch their own KRs, context, and child count to calculate their progress
      const childrenWithKRs = await Promise.all(
        (children || []).map(async (child) => {
          // Fetch child's KRs
          const { data: childKRs } = await supabase
            .from('key_results_v2')
            .select('*')
            .eq('objective_id', child.id);

          // Fetch child's portfolio/program context
          let childPortfolioName = null;
          let childProgramName = null;

          if (child.portfolio_id) {
            const { data: portfolio } = await supabase
              .from('portfolios')
              .select('name')
              .eq('id', child.portfolio_id)
              .single();
            childPortfolioName = portfolio?.name;
          }

          if (child.program_id) {
            const { data: program } = await supabase
              .from('programs')
              .select('name')
              .eq('id', child.program_id)
              .single();
            childProgramName = program?.name;
          }

          // Count grandchildren (children of this child)
          const { count: grandchildCount } = await supabase
            .from('objectives')
            .select('id', { count: 'exact', head: true })
            .eq('parent_objective_id', child.id);

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
            portfolioName: childPortfolioName,
            programName: childProgramName,
            childCount: grandchildCount || 0,
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
