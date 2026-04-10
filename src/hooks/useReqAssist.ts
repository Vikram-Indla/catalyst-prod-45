import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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

/** Fetch distinct Jira projects from ra_jira_tickets cache */
export function useJiraProjects() {
  return useQuery({
    queryKey: ['ra', 'jira_projects'],
    queryFn: async () => {
      const { data, error } = await typedQuery('ra_jira_tickets')
        .select('project_key, project_name');
      if (error) throw error;
      // Deduplicate by project_key
      const map = new Map<string, string>();
      (data ?? []).forEach((r: any) => {
        if (!map.has(r.project_key)) map.set(r.project_key, r.project_name);
      });
      return Array.from(map.entries()).map(([key, name]) => ({ project_key: key, project_name: name }));
    },
    staleTime: 60_000,
  });
}

/** Fetch tickets for a given project key from ra_jira_tickets */
export function useJiraProjectTickets(projectKey: string | null) {
  return useQuery({
    queryKey: ['ra', 'jira_tickets', projectKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('ra_jira_tickets')
        .select('id, ticket_key, ticket_summary, ticket_type, has_pdf, pdf_filename, page_count, project_key, project_name, priority, status')
        .eq('project_key', projectKey)
        .order('ticket_key', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectKey,
    staleTime: 30_000,
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
