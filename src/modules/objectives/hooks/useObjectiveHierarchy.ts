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

      // Calculate parent's OWN KR progress from its own KRs only
      const parentKRs = keyResults || [];
      let ownKrProgress: number | null = null;
      if (parentKRs.length > 0) {
        const totalProgress = parentKRs.reduce((sum, kr) => {
          const baseline = kr.baseline_value || 0;
          const current = kr.current_value || baseline;
          const goal = kr.goal_value || 1;
          const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) : 0;
          return sum + Math.max(0, Math.min(1, progress));
        }, 0);
        ownKrProgress = totalProgress / parentKRs.length;
      }

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

          // Calculate child's OWN KR progress from their own KRs only
          const childKeyResults = childKRs || [];
          let childOwnKrProgress: number | null = null;
          if (childKeyResults.length > 0) {
            const totalProgress = childKeyResults.reduce((sum, kr) => {
              const baseline = kr.baseline_value || 0;
              const current = kr.current_value || baseline;
              const goal = kr.goal_value || 1;
              const progress = goal !== baseline ? ((current - baseline) / (goal - baseline)) : 0;
              return sum + Math.max(0, Math.min(1, progress));
            }, 0);
            childOwnKrProgress = totalProgress / childKeyResults.length;
          }

          return {
            ...child,
            keyResults: childKeyResults,
            ownKrProgress: childOwnKrProgress,
            calculatedKrProgress: childOwnKrProgress || 0, // For Program children, own = rolled-up
            krCount: childKeyResults.length,
            portfolioName: childPortfolioName,
            programName: childProgramName,
            childCount: grandchildCount || 0,
          };
        })
      );

      // ============================================
      // PHASE 4: KR Roll-Up Logic (Program → Portfolio)
      // ============================================
      // For Portfolio tier: rolledUpKrProgress = average of (own KR progress + each child's KR progress)
      // For Program tier: rolledUpKrProgress = own KR progress (no children aggregated in this model)
      
      let rolledUpKrProgress: number | null = ownKrProgress;
      
      if (current.tier === 'portfolio') {
        const progressValues: number[] = [];
        
        // Include own KR progress if it exists
        if (ownKrProgress !== null && !Number.isNaN(ownKrProgress)) {
          progressValues.push(ownKrProgress);
        }
        
        // Include each child Program's KR progress
        childrenWithKRs.forEach(child => {
          if (child.ownKrProgress !== null && !Number.isNaN(child.ownKrProgress)) {
            progressValues.push(child.ownKrProgress);
          }
        });
        
        // Calculate average
        if (progressValues.length > 0) {
          rolledUpKrProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
        }
      }

      const currentWithKRs = {
        ...current,
        keyResults: keyResults || [],
        portfolioName,
        programName,
        ownKrProgress, // The objective's own KR progress (from its own KRs only)
        calculatedKrProgress: rolledUpKrProgress || 0, // Rolled-up value for display
        rolledUpKrProgress, // Explicit rolled-up field
      };

      // Fetch parents (recursive up)
      const parents = await fetchParentChain(currentWithKRs.parent_objective_id);

      return {
        current: currentWithKRs,
        parents: parents.reverse(), // Show top-most parent first
        children: childrenWithKRs,
      };
    },
    enabled: !!objectiveId,
  });
}
