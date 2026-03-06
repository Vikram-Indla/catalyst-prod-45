import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchRADocuments, fetchRAStats, createRADocument,
  queueProcessingJob, fetchJiraProjectTickets, fetchRADocumentById,
  fetchRAJobById, fetchRAJobsByDocId
} from '@/services/reqAssistService';
import type { RALibraryFilters } from '@/types/reqAssistV2';

export const RA_KEYS = {
  all: ['ra'] as const,
  documents: (filters?: RALibraryFilters) => ['ra', 'documents', filters] as const,
  document: (id: string) => ['ra', 'document', id] as const,
  stats: () => ['ra', 'stats'] as const,
  jiraTickets: (project: string) => ['ra', 'jira', project] as const,
  jiraConnections: () => ['ra', 'jira_connections'] as const,
  job: (id: string) => ['ra', 'job', id] as const,
  jobsByDoc: (docId: string) => ['ra', 'jobs-doc', docId] as const,
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

export function useJiraConnections() {
  return useQuery({
    queryKey: RA_KEYS.jiraConnections(),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ra_jira_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });
}

export function useAddJiraConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conn: {
      project_key: string;
      project_name: string;
      jira_url: string;
      jira_email: string;
      api_token_encrypted: string;
      status?: string;
      ticket_count?: number;
      pdf_ticket_count?: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from('ra_jira_connections')
        .insert(conn)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RA_KEYS.jiraConnections() });
      queryClient.invalidateQueries({ queryKey: RA_KEYS.all });
    },
  });
}

export function useRAJobPolling(jobId: string | null) {
  return useQuery({
    queryKey: RA_KEYS.job(jobId ?? ''),
    queryFn: () => fetchRAJobById(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3_000;
      if (data.status === 'done' || data.status === 'failed') return false;
      return 3_000;
    },
    staleTime: 0,
  });
}

export function useRAJobsByDoc(docId: string | null) {
  return useQuery({
    queryKey: RA_KEYS.jobsByDoc(docId ?? ''),
    queryFn: () => fetchRAJobsByDocId(docId!),
    enabled: !!docId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.length === 0) return false;
      const hasActive = data.some((j: any) => j.status === 'queued' || j.status === 'processing');
      return hasActive ? 2_000 : false;
    },
    staleTime: 0,
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
