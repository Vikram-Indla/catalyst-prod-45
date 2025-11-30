import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';

/**
 * Multi-Level Work Item Ranking Hook
 * Implements Jira Align ranking system with context-aware ranking
 */

export type RankingContextType = 'global' | 'portfolio' | 'program' | 'team';

export interface RankingContext {
  type: RankingContextType;
  contextId: string | null;
  piId: string | null;
  label: string;
}

export interface WorkItemRanking {
  id: string;
  work_item_id: string;
  work_item_type: string;
  context_type: RankingContextType;
  context_id: string | null;
  pi_id: string | null;
  rank: number;
}

export function useWorkItemRanking(workItemType: string, queryKey: string[]) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRanking, setIsRanking] = useState(false);

  /**
   * Detect current ranking context from filters and route
   */
  const detectRankingContext = useCallback((
    teamId?: string,
    sprintId?: string,
    programId?: string,
    piId?: string,
    portfolioId?: string
  ): RankingContext => {
    // Team-Sprint context (PRIMARY for stories)
    if (teamId && sprintId) {
      return {
        type: 'team',
        contextId: teamId,
        piId: sprintId,
        label: 'Team-Sprint Rank'
      };
    }

    // Program-PI context
    if (programId && piId) {
      return {
        type: 'program',
        contextId: programId,
        piId: piId,
        label: 'Program-PI Rank'
      };
    }

    // Program context (default for program-scoped backlogs)
    if (programId) {
      return {
        type: 'program',
        contextId: programId,
        piId: null,
        label: 'Program Rank'
      };
    }

    // Portfolio context
    if (portfolioId) {
      return {
        type: 'portfolio',
        contextId: portfolioId,
        piId: null,
        label: 'Portfolio Rank'
      };
    }

    // Global context (fallback)
    return {
      type: 'global',
      contextId: null,
      piId: null,
      label: 'Global Rank'
    };
  }, []);

  /**
   * Fetch ranking for a work item in current context
   */
  const fetchRanking = useCallback(async (
    workItemId: string,
    context: RankingContext
  ): Promise<number | null> => {
    try {
      let query = supabase
        .from('work_item_rankings')
        .select('rank')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .eq('context_type', context.type);

      if (context.contextId) {
        query = query.eq('context_id', context.contextId);
      } else {
        query = query.is('context_id', null);
      }

      if (context.piId) {
        query = query.eq('pi_id', context.piId);
      } else {
        query = query.is('pi_id', null);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching ranking:', error);
        return null;
      }

      return data?.rank || null;
    } catch (err) {
      console.error('Error in fetchRanking:', err);
      return null;
    }
  }, [workItemType]);

  /**
   * Update ranking mutation
   */
  const updateRankingMutation = useMutation({
    mutationFn: async ({
      workItemId,
      newRank,
      context
    }: {
      workItemId: string;
      newRank: number;
      context: RankingContext;
    }) => {
      const { error } = await supabase
        .from('work_item_rankings')
        .upsert({
          work_item_id: workItemId,
          work_item_type: workItemType,
          context_type: context.type,
          context_id: context.contextId,
          pi_id: context.piId,
          rank: newRank
        }, {
          onConflict: 'work_item_id,work_item_type,context_type,context_id,pi_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Error updating ranking:', error);
      toast({
        title: 'Failed to update ranking',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  /**
   * Batch update rankings for drag-drop reordering
   */
  const batchUpdateRankings = useCallback(async (
    updates: Array<{ workItemId: string; newRank: number }>,
    context: RankingContext
  ) => {
    setIsRanking(true);
    try {
      const upsertData = updates.map(({ workItemId, newRank }) => ({
        work_item_id: workItemId,
        work_item_type: workItemType,
        context_type: context.type,
        context_id: context.contextId,
        pi_id: context.piId,
        rank: newRank
      }));

      const { error } = await supabase
        .from('work_item_rankings')
        .upsert(upsertData, {
          onConflict: 'work_item_id,work_item_type,context_type,context_id,pi_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey });
      
      toast({
        title: 'Ranking updated',
        description: `Updated ${updates.length} item(s) in ${context.label}`
      });
    } catch (error) {
      console.error('Error batch updating rankings:', error);
      toast({
        title: 'Failed to update rankings',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsRanking(false);
    }
  }, [workItemType, queryClient, queryKey, toast]);

  /**
   * Pull rank from parent work items (e.g., Features → Stories)
   * Jira Align Spec: Stories inherit parent Feature's rank (all get same rank, require manual adjustment)
   */
  const pullRankFromParent = useCallback(async (
    parentType: string,
    context: RankingContext
  ) => {
    setIsRanking(true);
    try {
      // Step 1: Fetch all work items in current context
      let itemsQuery = supabase
        .from('stories')
        .select('id, feature_id');

      // Apply context filters
      if (context.type === 'team' && context.contextId) {
        itemsQuery = itemsQuery.eq('team_id', context.contextId);
      }
      if (context.piId) {
        itemsQuery = itemsQuery.eq('sprint_id', context.piId);
      }

      const { data: items, error: itemsError } = await itemsQuery;
      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        toast({
          title: 'No stories to rank',
          description: 'No stories found in current context',
          variant: 'default'
        });
        return;
      }

      // Step 2: Fetch parent Features' ranks in same context
      const featureIds = [...new Set(items.map(s => s.feature_id).filter(Boolean))];
      
      if (featureIds.length === 0) {
        toast({
          title: 'No parent features',
          description: 'Stories must have parent Features to pull rank',
          variant: 'destructive'
        });
        return;
      }

      let featureRanksQuery = supabase
        .from('work_item_rankings')
        .select('work_item_id, rank')
        .eq('work_item_type', 'feature')
        .eq('context_type', context.type)
        .in('work_item_id', featureIds);

      if (context.contextId) {
        featureRanksQuery = featureRanksQuery.eq('context_id', context.contextId);
      } else {
        featureRanksQuery = featureRanksQuery.is('context_id', null);
      }

      if (context.piId) {
        featureRanksQuery = featureRanksQuery.eq('pi_id', context.piId);
      } else {
        featureRanksQuery = featureRanksQuery.is('pi_id', null);
      }

      const { data: featureRanks, error: ranksError } = await featureRanksQuery;
      if (ranksError) throw ranksError;

      const featureRankMap = new Map(
        featureRanks?.map(fr => [fr.work_item_id, fr.rank]) || []
      );

      // Step 3: Group stories by feature and assign inherited ranks
      // Per Jira Align: "A feature may have multiple stories that inherit its rank"
      // All stories under same feature get SAME rank (requires manual adjustment after)
      const rankUpdates: Array<{ workItemId: string; newRank: number }> = [];
      
      // Group stories by feature
      const storiesByFeature = new Map<string, string[]>();
      items.forEach(item => {
        if (!item.feature_id) return;
        if (!storiesByFeature.has(item.feature_id)) {
          storiesByFeature.set(item.feature_id, []);
        }
        storiesByFeature.get(item.feature_id)!.push(item.id);
      });

      // Sort features by their rank
      const sortedFeatures = Array.from(storiesByFeature.keys()).sort((a, b) => {
        const rankA = featureRankMap.get(a) || 9999;
        const rankB = featureRankMap.get(b) || 9999;
        return rankA - rankB;
      });

      // Assign ranks: all stories under same feature get feature's rank
      sortedFeatures.forEach(featureId => {
        const featureRank = featureRankMap.get(featureId) || 9999;
        const storyIds = storiesByFeature.get(featureId) || [];
        
        storyIds.forEach(storyId => {
          rankUpdates.push({
            workItemId: storyId,
            newRank: featureRank
          });
        });
      });

      // Handle orphan stories (no feature) - put at bottom
      const orphanStories = items.filter(item => !item.feature_id);
      const maxRank = Math.max(...Array.from(featureRankMap.values()), 0);
      orphanStories.forEach((story, idx) => {
        rankUpdates.push({
          workItemId: story.id,
          newRank: maxRank + idx + 1
        });
      });

      // Step 4: Batch update rankings
      if (rankUpdates.length > 0) {
        await batchUpdateRankings(rankUpdates, context);
        
        toast({
          title: 'Pull Rank Complete',
          description: `${rankUpdates.length} stories inherited rank from Features. Manual adjustment may be needed for stories with duplicate ranks.`,
        });
      }

    } catch (error) {
      console.error('Error pulling rank:', error);
      toast({
        title: 'Failed to pull rank',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsRanking(false);
    }
  }, [toast, batchUpdateRankings, queryClient, queryKey]);

  return {
    detectRankingContext,
    fetchRanking,
    updateRanking: updateRankingMutation.mutate,
    batchUpdateRankings,
    pullRankFromParent,
    isRanking
  };
}
