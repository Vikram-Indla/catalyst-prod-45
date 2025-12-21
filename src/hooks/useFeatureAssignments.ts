/**
 * useFeatureAssignments — Hook for managing feature owner and contributors
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getFeatureWithAssignments, 
  updateFeatureOwner, 
  updateFeatureContributors,
  getTeamMembers 
} from '@/services/featureService';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  role?: string;
}

export interface Contributor {
  id: string;
  user_id: string;
  user: TeamMember | null;
}

export function useFeatureAssignments(featureId: string) {
  const queryClient = useQueryClient();

  // Fetch feature with assignments
  const { data: feature, isLoading: featureLoading } = useQuery({
    queryKey: ['feature-assignments', featureId],
    queryFn: () => getFeatureWithAssignments(featureId),
    enabled: !!featureId,
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: ({ featureId, ownerId }: { featureId: string; ownerId: string | null }) => 
      updateFeatureOwner(featureId, ownerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-assignments', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-detail', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update owner', { description: error.message });
    },
  });

  // Update contributors mutation
  const updateContributorsMutation = useMutation({
    mutationFn: ({ featureId, contributorIds }: { featureId: string; contributorIds: string[] }) => 
      updateFeatureContributors(featureId, contributorIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-assignments', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-detail', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update contributors', { description: error.message });
    },
  });

  return {
    feature,
    featureLoading,
    updateOwner: updateOwnerMutation.mutate,
    updateContributors: updateContributorsMutation.mutate,
    isUpdating: updateOwnerMutation.isPending || updateContributorsMutation.isPending,
  };
}

export function useTeamMembers(projectId?: string) {
  return useQuery({
    queryKey: ['team-members', projectId],
    queryFn: () => getTeamMembers(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
