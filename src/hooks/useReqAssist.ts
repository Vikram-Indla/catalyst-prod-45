import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBrdDocuments,
  fetchBrdDocument,
  fetchEpicsForDocument,
  fetchQueueStatus,
  fetchQueueItems,
  fetchStageStats,
  fetchEpicCount,
  fetchAvgQuality,
  createBrdDocument,
  updateDocumentStage,
  enqueueDocument,
  fetchDomainTags,
} from '@/services/reqAssistService';
import type { BrdDocument, PipelineFilterState, PipelineStage } from '@/types/reqAssist';

// ─── QUERY KEYS ───────────────────────────────────────────────────
export const reqAssistKeys = {
  all: ['req-assist'] as const,
  documents: (filters?: Partial<PipelineFilterState>) =>
    [...reqAssistKeys.all, 'documents', filters] as const,
  document: (id: string) => [...reqAssistKeys.all, 'document', id] as const,
  epics: (brdId: string) => [...reqAssistKeys.all, 'epics', brdId] as const,
  queue: (brdId: string) => [...reqAssistKeys.all, 'queue', brdId] as const,
  queueItems: (brdId: string) => [...reqAssistKeys.all, 'queue-items', brdId] as const,
  stats: () => [...reqAssistKeys.all, 'stats'] as const,
  epicCount: () => [...reqAssistKeys.all, 'epic-count'] as const,
  avgQuality: () => [...reqAssistKeys.all, 'avg-quality'] as const,
  domainTags: () => [...reqAssistKeys.all, 'domain-tags'] as const,
};

// ─── HOOKS ────────────────────────────────────────────────────────

export function useBrdDocuments(filters?: Partial<PipelineFilterState>) {
  return useQuery({
    queryKey: reqAssistKeys.documents(filters),
    queryFn: () => fetchBrdDocuments(filters),
  });
}

export function useBrdDocument(id: string) {
  return useQuery({
    queryKey: reqAssistKeys.document(id),
    queryFn: () => fetchBrdDocument(id),
    enabled: !!id,
  });
}

export function useBrdEpics(brdId: string) {
  return useQuery({
    queryKey: reqAssistKeys.epics(brdId),
    queryFn: () => fetchEpicsForDocument(brdId),
    enabled: !!brdId,
  });
}

export function useBrdQueueStatus(brdId: string) {
  return useQuery({
    queryKey: reqAssistKeys.queue(brdId),
    queryFn: () => fetchQueueStatus(brdId),
    enabled: !!brdId,
    refetchInterval: 5000,
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: reqAssistKeys.stats(),
    queryFn: fetchStageStats,
    staleTime: 30_000,
  });
}

export function useEpicCount() {
  return useQuery({
    queryKey: reqAssistKeys.epicCount(),
    queryFn: fetchEpicCount,
    staleTime: 30_000,
  });
}

export function useAvgQuality() {
  return useQuery({
    queryKey: reqAssistKeys.avgQuality(),
    queryFn: fetchAvgQuality,
    staleTime: 30_000,
  });
}

export function useDomainTags() {
  return useQuery({
    queryKey: reqAssistKeys.domainTags(),
    queryFn: fetchDomainTags,
  });
}

export function useBrdQueueItems(brdId: string) {
  return useQuery({
    queryKey: reqAssistKeys.queueItems(brdId),
    queryFn: () => fetchQueueItems(brdId),
    enabled: !!brdId,
  });
}

// ─── MUTATIONS ────────────────────────────────────────────────────

export function useCreateBrdDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<BrdDocument, 'id' | 'created_at' | 'updated_at'>) =>
      createBrdDocument(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reqAssistKeys.all });
    },
  });
}

export function useUpdateDocumentStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: PipelineStage }) =>
      updateDocumentStage(id, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reqAssistKeys.all });
    },
  });
}

export function useEnqueueDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (brdId: string) => enqueueDocument(brdId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reqAssistKeys.all });
    },
  });
}
