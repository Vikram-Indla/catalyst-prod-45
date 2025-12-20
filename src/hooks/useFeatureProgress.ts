/**
 * useFeatureProgress — Story-driven progress calculation
 * 
 * Feature progress is derived from child stories, NOT manually estimated.
 * 
 * Progress calculation:
 * - completionPercent = completedStories / totalStories * 100
 * - If no stories, progress = 0%
 * 
 * Status suggestion logic:
 * - If ≥1 story started → suggest 'implementing'
 * - If all stories done → suggest 'done'
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureProgress, FeatureStatus } from '@/types/feature.types';

interface StoryStatusCount {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

// Story states that count as "completed"
const COMPLETED_STATES = ['done', 'accepted', 'closed', 'deployed'];
// Story states that count as "in progress"
const IN_PROGRESS_STATES = ['in_progress', 'in-progress', 'implementing', 'testing', 'review'];

export function useFeatureProgress(featureId: string | undefined) {
  return useQuery({
    queryKey: ['feature-progress', featureId],
    queryFn: async (): Promise<FeatureProgress> => {
      if (!featureId) {
        return {
          totalStories: 0,
          completedStories: 0,
          inProgressStories: 0,
          notStartedStories: 0,
          completionPercent: 0,
        };
      }

      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, status, state')
        .eq('feature_id', featureId);

      if (error) {
        console.error('Failed to fetch stories for progress:', error);
        return {
          totalStories: 0,
          completedStories: 0,
          inProgressStories: 0,
          notStartedStories: 0,
          completionPercent: 0,
        };
      }

      const counts = (stories || []).reduce<StoryStatusCount>(
        (acc, story) => {
          acc.total++;
          const state = (story.state || story.status || '').toLowerCase();
          
          if (COMPLETED_STATES.includes(state)) {
            acc.completed++;
          } else if (IN_PROGRESS_STATES.includes(state)) {
            acc.inProgress++;
          } else {
            acc.notStarted++;
          }
          return acc;
        },
        { total: 0, completed: 0, inProgress: 0, notStarted: 0 }
      );

      const completionPercent = counts.total > 0 
        ? Math.round((counts.completed / counts.total) * 100)
        : 0;

      return {
        totalStories: counts.total,
        completedStories: counts.completed,
        inProgressStories: counts.inProgress,
        notStartedStories: counts.notStarted,
        completionPercent,
      };
    },
    enabled: !!featureId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Suggest a feature status based on story progress
 * 
 * Rules:
 * - If all stories completed → 'done'
 * - If any story in progress → 'implementing'
 * - Otherwise, keep current status
 */
export function suggestFeatureStatus(
  progress: FeatureProgress,
  currentStatus?: FeatureStatus | null
): FeatureStatus | null {
  // No stories - no suggestion
  if (progress.totalStories === 0) {
    return currentStatus || null;
  }

  // All stories completed → suggest done
  if (progress.completedStories === progress.totalStories) {
    return 'done';
  }

  // At least one story in progress → suggest implementing
  if (progress.inProgressStories > 0 || progress.completedStories > 0) {
    return 'implementing';
  }

  // No progress yet - keep current
  return currentStatus || 'backlog';
}

/**
 * Batch fetch progress for multiple features
 */
export function useMultipleFeatureProgress(featureIds: string[]) {
  return useQuery({
    queryKey: ['features-progress-batch', featureIds.sort().join(',')],
    queryFn: async (): Promise<Record<string, FeatureProgress>> => {
      if (featureIds.length === 0) {
        return {};
      }

      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, feature_id, status, state')
        .in('feature_id', featureIds);

      if (error) {
        console.error('Failed to fetch stories for batch progress:', error);
        return {};
      }

      // Group stories by feature_id
      const storyGroups = (stories || []).reduce<Record<string, typeof stories>>((acc, story) => {
        const fid = story.feature_id;
        if (fid) {
          if (!acc[fid]) acc[fid] = [];
          acc[fid].push(story);
        }
        return acc;
      }, {});

      // Calculate progress for each feature
      const progressMap: Record<string, FeatureProgress> = {};
      
      for (const featureId of featureIds) {
        const featureStories = storyGroups[featureId] || [];
        const counts = featureStories.reduce<StoryStatusCount>(
          (acc, story) => {
            acc.total++;
            const state = (story.state || story.status || '').toLowerCase();
            
            if (COMPLETED_STATES.includes(state)) {
              acc.completed++;
            } else if (IN_PROGRESS_STATES.includes(state)) {
              acc.inProgress++;
            } else {
              acc.notStarted++;
            }
            return acc;
          },
          { total: 0, completed: 0, inProgress: 0, notStarted: 0 }
        );

        progressMap[featureId] = {
          totalStories: counts.total,
          completedStories: counts.completed,
          inProgressStories: counts.inProgress,
          notStartedStories: counts.notStarted,
          completionPercent: counts.total > 0 
            ? Math.round((counts.completed / counts.total) * 100)
            : 0,
        };
      }

      return progressMap;
    },
    enabled: featureIds.length > 0,
    staleTime: 30000,
  });
}
