import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRADocuments, fetchRAStats, createRADocument,
  queueProcessingJob, fetchJiraProjectTickets, fetchRADocumentById
} from '@/services/reqAssistService';
import type { RALibraryFilters } from '@/types/reqAssistV2';

export const RA_KEYS = {
  all: ['ra'] as const,
  documents: (filters?: RALibraryFilters) => ['ra', 'documents', filters] as const,
  document: (id: string) => ['ra', 'document', id] as const,
  stats: () => ['ra', 'stats'] as const,
  jiraTickets: (project: string) => ['ra', 'jira', project] as const,
};

export function useRADocuments(filters: RALibraryFilters) {
  return useQuery({
    queryKey: RA_KEYS.documents(filters),
    queryFn: () => fetchRADocuments({ status: filters.tab, search: filters.search }),
    staleTime: 15_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = Array.isArray(data) && data.some((d: any) => d.status === 'processing');
      return hasProcessing ? 5_000 : false;
    },
  });
}

export function useRADocumentById(id: string) {
  return useQuery({
    queryKey: RA_KEYS.document(id),
    queryFn: () => fetchRADocumentById(id),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useRAStats() {
  return useQuery({
    queryKey: RA_KEYS.stats(),
    queryFn: fetchRAStats,
    staleTime: 30_000,
  });
}

export function useJiraTickets(projectKey: string) {
  return useQuery({
    queryKey: RA_KEYS.jiraTickets(projectKey),
    queryFn: () => fetchJiraProjectTickets(projectKey),
    enabled: !!projectKey,
    staleTime: 60_000,
  });
}

export function useCreateRADocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRADocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
    },
  });
}

export function useQueueJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: queueProcessingJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
    },
  });
}
