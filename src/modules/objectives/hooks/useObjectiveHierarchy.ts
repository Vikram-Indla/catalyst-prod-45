import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define "done" statuses for work items
const DONE_STATUSES = ['done', 'completed', 'accepted', 'closed', 'released', 'deployed'];

// Helper: compute own work progress for an objective from its aligned work items
// Returns 0-1 value or null if no aligned work items
async function computeOwnWorkProgressForObjective(objectiveId: string): Promise<number | null> {
  // Fetch feature links for this objective
  const { data: featureLinks } = await supabase
    .from('objective_feature_links')
    .select('feature_id')
    .eq('objective_id', objectiveId);
  
  // Fetch work item alignments for this objective
  const { data: workAlignments } = await supabase
    .from('objective_work_item_alignments')
    .select('work_item_id, work_item_type')
    .eq('objective_id', objectiveId);
  
  let totalItems = 0;
  let completedItems = 0;
  
  // Process feature links
  if (featureLinks && featureLinks.length > 0) {
    const featureIds = featureLinks.map(l => l.feature_id);
    const { data: features } = await supabase
      .from('features')
      .select('id, status')
      .in('id', featureIds);
    
    features?.forEach(feature => {
      totalItems++;
      if (feature.status && DONE_STATUSES.includes(feature.status.toLowerCase())) {
        completedItems++;
      }
    });
  }
  
  // Process work item alignments
  if (workAlignments && workAlignments.length > 0) {
    // Group by type for batch fetching
    const featureAlignments = workAlignments.filter(a => a.work_item_type === 'feature');
    const storyAlignments = workAlignments.filter(a => a.work_item_type === 'story');
    
    // Fetch features
    if (featureAlignments.length > 0) {
      const featureIds = featureAlignments.map(a => a.work_item_id);
      const { data: features } = await supabase
        .from('features')
        .select('id, status')
        .in('id', featureIds);
      
      features?.forEach(feature => {
        totalItems++;
        if (feature.status && DONE_STATUSES.includes(feature.status.toLowerCase())) {
          completedItems++;
        }
      });
    }
    
    // Fetch stories
    if (storyAlignments.length > 0) {
      const storyIds = storyAlignments.map(a => a.work_item_id);
      const { data: stories } = await supabase
        .from('stories')
        .select('id, status')
        .in('id', storyIds);
      
      stories?.forEach(story => {
        totalItems++;
        if (story.status && DONE_STATUSES.includes(story.status.toLowerCase())) {
          completedItems++;
        }
      });
    }
    
    // For other work item types, count them but we can't determine status
    const otherAlignments = workAlignments.filter(a => 
      a.work_item_type !== 'feature' && a.work_item_type !== 'story'
    );
    totalItems += otherAlignments.length;
  }
  
  if (totalItems === 0) return null;
  return completedItems / totalItems;
}

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

      // ============================================
      // PHASE 5: Calculate parent's OWN Work Progress from aligned work items
      // ============================================
      const ownWorkProgress = await computeOwnWorkProgressForObjective(objectiveId);

      // Fetch direct children (where parent_objective_id = this objective)
      const { data: children } = await supabase
        .from('objectives')
        .select('*')
        .eq('parent_objective_id', objectiveId);

      // For each child, fetch their own KRs, work progress, context, and child count
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

          // Calculate child's OWN work progress from their aligned work items
          const childOwnWorkProgress = await computeOwnWorkProgressForObjective(child.id);

          return {
            ...child,
            keyResults: childKeyResults,
            ownKrProgress: childOwnKrProgress,
            calculatedKrProgress: childOwnKrProgress || 0, // For Program children, own = rolled-up
            ownWorkProgress: childOwnWorkProgress,
            work_progress: childOwnWorkProgress || 0, // For Program children, own = rolled-up
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

      // ============================================
      // PHASE 5: Work Progress Roll-Up Logic (Program → Portfolio)
      // ============================================
      // For Portfolio tier: rolledUpWorkProgress = average of (own work progress + each child's work progress)
      // For Program tier: rolledUpWorkProgress = own work progress (no children aggregated in this model)
      
      let rolledUpWorkProgress: number | null = ownWorkProgress;
      
      if (current.tier === 'portfolio') {
        const progressValues: number[] = [];
        
        // Include own work progress if it exists
        if (ownWorkProgress !== null && !Number.isNaN(ownWorkProgress)) {
          progressValues.push(ownWorkProgress);
        }
        
        // Include each child Program's work progress
        childrenWithKRs.forEach(child => {
          if (child.ownWorkProgress !== null && !Number.isNaN(child.ownWorkProgress)) {
            progressValues.push(child.ownWorkProgress);
          }
        });
        
        // Calculate average
        if (progressValues.length > 0) {
          rolledUpWorkProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
        }
      }

      const currentWithKRs = {
        ...current,
        keyResults: keyResults || [],
        portfolioName,
        programName,
        ownKrProgress, // The objective's own KR progress (from its own KRs only)
        calculatedKrProgress: rolledUpKrProgress || 0, // Rolled-up KR value for display
        rolledUpKrProgress, // Explicit rolled-up KR field
        ownWorkProgress, // The objective's own work progress (from its own aligned work items only)
        work_progress: rolledUpWorkProgress || 0, // Rolled-up work progress for display
        rolledUpWorkProgress, // Explicit rolled-up work progress field
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
