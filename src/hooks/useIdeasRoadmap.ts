import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoadmapIdeas,
  updateIdeaCommitted,
  updateIdeaMilestones,
  convertIdeaToInitiative,
} from '@/services/ideasRoadmapService';
import type { RoadmapMilestones, RoadmapQuarter } from '@/types/ideasRoadmap';

const QUERY_KEY = ['ideas', 'roadmap'] as const;

export function useRoadmapIdeas() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchRoadmapIdeas,
    staleTime: 30_000,
  });
}

export function useUpdateIdeaCommitted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, isCommitted, quarter }: {
      ideaId: string; isCommitted: boolean; quarter: RoadmapQuarter;
    }) => updateIdeaCommitted(ideaId, isCommitted, quarter),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (error) => console.error('Toggle committed failed:', error),
  });
}

export function useUpdateMilestones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, milestones }: { ideaId: string; milestones: Partial<RoadmapMilestones> }) =>
      updateIdeaMilestones(ideaId, milestones),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (error) => console.error('Update milestones failed:', error),
  });
}

export function useConvertToInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => convertIdeaToInitiative(ideaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['initiatives'] });
    },
    onError: (error) => console.error('Convert to initiative failed:', error),
  });
}
