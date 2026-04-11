// =====================================================
// BOARD VIEW HOOK
// React Query hooks for Board View
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getBoardData,
  moveFeature,
  getBoardStats,
  getReleasesForProject,
  BoardFilters
} from '@/services/boardService';
import { WorkflowStatus } from '@/types/views';

export const boardKeys = {
  all: ['board'] as const,
  data: (projectId: string, filters?: BoardFilters) => 
    [...boardKeys.all, 'data', projectId, filters] as const,
  stats: (projectId: string) => 
    [...boardKeys.all, 'stats', projectId] as const,
  releases: (projectId: string) =>
    [...boardKeys.all, 'releases', projectId] as const,
};

// -----------------------------------------------------
// Get Board Data
// GUARDRAIL: Stable caching to prevent UI flickering
// -----------------------------------------------------
export function useBoardData(projectId: string, filters?: BoardFilters) {
  return useQuery({
    queryKey: boardKeys.data(projectId, filters),
    queryFn: () => getBoardData(projectId, filters),
    enabled: !!projectId,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// -----------------------------------------------------
// Get Board Stats
// GUARDRAIL: Stable caching to prevent UI flickering
// -----------------------------------------------------
export function useBoardStats(projectId: string) {
  return useQuery({
    queryKey: boardKeys.stats(projectId),
    queryFn: () => getBoardStats(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// -----------------------------------------------------
// Get Releases for Board Filters
// GUARDRAIL: Stable caching to prevent UI flickering
// -----------------------------------------------------
export function useBoardReleases(projectId: string) {
  return useQuery({
    queryKey: boardKeys.releases(projectId),
    queryFn: () => getReleasesForProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// -----------------------------------------------------
// Move Feature Mutation
// -----------------------------------------------------
export function useMoveFeature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ featureId, newStatus }: { featureId: string; newStatus: WorkflowStatus }) =>
      moveFeature(featureId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      toast({
        title: 'Feature Moved',
        description: 'Status updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
