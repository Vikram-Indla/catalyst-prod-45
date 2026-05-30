/**
 * Ideation Module — TanStack Query Hooks
 * Wraps ideationService for reactive data fetching and mutations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ideationService } from '@/services/ideationService';
import { catalystToast } from '@/lib/catalystToast';

// ======= QUERY KEYS =======
export const ideationKeys = {
  ideas: (filters?: any) => ['ideas', filters] as const,
  ideaRaw: (key: string) => ['ideaRaw', key] as const,
  impactFactors: (key: string) => ['ideaImpactFactors', key] as const,
  statusCounts: () => ['ideaStatusCounts'] as const,
  deptCounts: () => ['ideaDeptCounts'] as const,
  topContributors: () => ['ideaTopContributors'] as const,
  drives: () => ['innovationDrives'] as const,
  driveIdeas: (id: string) => ['driveIdeas', id] as const,
  comments: (id: string) => ['ideaComments', id] as const,
  v2030: (id: string) => ['ideaV2030', id] as const,
  compliance: (id: string) => ['ideaCompliance', id] as const,
  evidence: (id: string) => ['ideaEvidence', id] as const,
};

// ======= IDEAS =======

export function useIdeas(filters?: {
  status?: string;
  type?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ideationKeys.ideas(filters),
    queryFn: () => ideationService.getIdeas(filters),
  });
}

export function useIdeaRaw(ideaKey: string | null) {
  return useQuery({
    queryKey: ideationKeys.ideaRaw(ideaKey!),
    queryFn: () => ideationService.getIdeaRaw(ideaKey!),
    enabled: !!ideaKey,
  });
}

export function useImpactFactors(ideaKey: string | null) {
  return useQuery({
    queryKey: ideationKeys.impactFactors(ideaKey!),
    queryFn: () => ideationService.getImpactFactors(ideaKey!),
    enabled: !!ideaKey,
  });
}

// ======= ANALYTICS =======

export function useStatusCounts() {
  return useQuery({
    queryKey: ideationKeys.statusCounts(),
    queryFn: () => ideationService.getStatusCounts(),
  });
}

export function useDeptCounts() {
  return useQuery({
    queryKey: ideationKeys.deptCounts(),
    queryFn: () => ideationService.getDeptCounts(),
  });
}

export function useTopContributors() {
  return useQuery({
    queryKey: ideationKeys.topContributors(),
    queryFn: () => ideationService.getTopContributors(),
  });
}

// ======= INNOVATION DRIVES =======

export function useInnovationDrives() {
  return useQuery({
    queryKey: ideationKeys.drives(),
    queryFn: () => ideationService.getDrives(),
  });
}

export function useDriveIdeas(driveId: string | null) {
  return useQuery({
    queryKey: ideationKeys.driveIdeas(driveId!),
    queryFn: () => ideationService.getDriveIdeas(driveId!),
    enabled: !!driveId,
  });
}

// ======= DETAIL DATA =======

export function useIdeaComments(ideaId: string | null) {
  return useQuery({
    queryKey: ideationKeys.comments(ideaId!),
    queryFn: () => ideationService.getComments(ideaId!),
    enabled: !!ideaId,
  });
}

export function useV2030Mappings(ideaId: string | null) {
  return useQuery({
    queryKey: ideationKeys.v2030(ideaId!),
    queryFn: () => ideationService.getV2030Mappings(ideaId!),
    enabled: !!ideaId,
  });
}

export function useComplianceTags(ideaId: string | null) {
  return useQuery({
    queryKey: ideationKeys.compliance(ideaId!),
    queryFn: () => ideationService.getComplianceTags(ideaId!),
    enabled: !!ideaId,
  });
}

export function useEvidence(ideaId: string | null) {
  return useQuery({
    queryKey: ideationKeys.evidence(ideaId!),
    queryFn: () => ideationService.getEvidence(ideaId!),
    enabled: !!ideaId,
  });
}

// ======= ADD COMMENT =======

export function useAddIdeaComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, userId, content }: { ideaId: string; userId: string; content: string }) =>
      ideationService.addComment(ideaId, userId, content),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ideationKeys.comments(vars.ideaId) });
      catalystToast.success('Comment posted');
    },
    onError: (e: Error) => catalystToast.error('Failed to post comment: ' + e.message),
  });
}

// ======= VOTING =======

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, userId, value }: { ideaId: string; userId: string; value: 1 | -1 }) =>
      ideationService.castVote(ideaId, userId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas'] });
      catalystToast.success('Vote recorded');
    },
    onError: (e: Error) => catalystToast.error('Vote failed: ' + e.message),
  });
}
