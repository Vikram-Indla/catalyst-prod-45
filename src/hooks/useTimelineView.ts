// =====================================================
// TIMELINE VIEW HOOK
// React Query hooks for Timeline View
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getTimelineData,
  updateFeatureDates
} from '@/services/timelineService';

export const timelineKeys = {
  all: ['timeline'] as const,
  data: (projectId: string) => [...timelineKeys.all, 'data', projectId] as const,
};

// -----------------------------------------------------
// Get Timeline Data
// -----------------------------------------------------
export function useTimelineData(projectId: string) {
  return useQuery({
    queryKey: timelineKeys.data(projectId),
    queryFn: () => getTimelineData(projectId),
    enabled: !!projectId,
    refetchInterval: 60000, // Refresh every minute
  });
}

// -----------------------------------------------------
// Update Feature Dates Mutation
// -----------------------------------------------------
export function useUpdateFeatureDates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ featureId, startDate, endDate }: { 
      featureId: string; 
      startDate: Date; 
      endDate: Date;
    }) => updateFeatureDates(featureId, startDate, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.all });
      toast({
        title: 'Dates Updated',
        description: 'Feature timeline updated successfully.',
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
