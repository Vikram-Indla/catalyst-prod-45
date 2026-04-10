/**
 * useWikiAdminData — All hooks for the Wiki Admin Panel.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper: typed query on tables/views not yet in generated types
const fromAny = (table: string) => typedQuery(table);

/* ─── Types ─── */
export interface WikiAdminStats {
  total_pages: number;
  draft_pages: number;
  review_pages: number;
  total_chunks: number;
  total_documents: number;
  failed_documents: number;
  avg_confidence: number | null;
  queries_today: number;
  cache_entries: number;
  last_sync: string | null;
}

export interface WikiSyncRunRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  steps: any[];
  total_items_processed: number;
  new_pages: number;
  updated_pages: number;
  new_chunks: number;
  total_duration_ms: number | null;
  error_message: string | null;
  triggered_by: string;
  created_by: string | null;
}

export interface WikiPageAdminRow {
  id: string;
  slug: string;
  title: string;
  domain_code: string;
  status: string;
  ai_confidence: number | null;
  source_coverage: number | null;
  version: number;
  last_generated: string | null;
  updated_at: string;
  days_since_update: number;
  reference_count: number;
  read_count: number;
}

export interface WikiHealthRow {
  id: string;
  category: string;
  metric: string;
  value: number | null;
  threshold: number | null;
  status: string;
  checked_at: string;
}

/* ─── Stats ─── */
export function useWikiAdminStats() {
  return useQuery({
    queryKey: ['wiki-admin-stats'],
    queryFn: async () => {
      const { data, error } = await fromAny('wiki_admin_stats')
        .select('*')
        .single();
      if (error) throw error;
      return data as WikiAdminStats;
    },
    staleTime: 60_000,
  });
}

/* ─── Sync Runs ─── */
export function useWikiSyncRuns(limit = 20) {
  return useQuery({
    queryKey: ['wiki-sync-runs', limit],
    queryFn: async () => {
      const { data, error } = await fromAny('wiki_sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WikiSyncRunRow[];
    },
    staleTime: 30_000,
  });
}

/* ─── Sync Runs — live polling variant ─── */
export function useWikiSyncRunsPolling(enabled: boolean) {
  return useQuery({
    queryKey: ['wiki-sync-runs', 1],
    queryFn: async () => {
      const { data, error } = await fromAny('wiki_sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as WikiSyncRunRow[];
    },
    refetchInterval: enabled ? 3000 : false,
    staleTime: 0,
  });
}

/* ─── Page Admin List ─── */
export interface PageAdminFilters {
  domainCode?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useWikiPageAdminList(filters?: PageAdminFilters) {
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;

  return useQuery({
    queryKey: ['wiki-page-admin-list', filters],
    queryFn: async () => {
      let q = fromAny('wiki_page_admin_list')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters?.domainCode) q = q.eq('domain_code', filters.domainCode);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.search) q = q.ilike('title', `%${filters.search}%`);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as WikiPageAdminRow[], total: count ?? 0 };
    },
    staleTime: 60_000,
  });
}

/* ─── Health Checks ─── */
export function useWikiHealthChecks() {
  return useQuery({
    queryKey: ['wiki-health-checks'],
    queryFn: async () => {
      const { data, error } = await fromAny('wiki_health_checks')
        .select('*')
        .order('checked_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WikiHealthRow[];
    },
    staleTime: 5 * 60_000,
  });
}

/* ─── Query Log ─── */
export interface QueryLogFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useWikiQueryLog(filters?: QueryLogFilters) {
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;

  return useQuery({
    queryKey: ['wiki-query-log', page, pageSize, filters?.search],
    queryFn: async () => {
      let q = fromAny('kb_query_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters?.search) q = q.ilike('query_text', `%${filters.search}%`);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    staleTime: 0,
  });
}

/* ─── Training Questions ─── */
export interface TrainingFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  module?: string;
}

export function useWikiTrainingQuestions(filters?: TrainingFilters) {
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;

  return useQuery({
    queryKey: ['wiki-training-questions', page, pageSize, filters?.search, filters?.module],
    queryFn: async () => {
      let q = fromAny('kb_training_questions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters?.search) q = q.ilike('question', `%${filters.search}%`);
      if (filters?.module) q = q.eq('module', filters.module);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
    staleTime: 60_000,
  });
}

/* ─── Documents ─── */
export function useWikiDocuments() {
  return useQuery({
    queryKey: ['wiki-admin-documents'],
    queryFn: async () => {
      const { data, error } = await fromAny('wiki_documents')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}

/* ─── Access Matrix ─── */
export function useWikiAccessMatrix() {
  return useQuery({
    queryKey: ['wiki-access-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_access_matrix')
        .select('*');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; role_name: string; module_name: string; has_access: boolean }>;
    },
    staleTime: 5 * 60_000,
  });
}

/* ─── Mutations ─── */

export function useTriggerSync() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: run, error: insertErr } = await fromAny('wiki_sync_runs')
        .insert({ triggered_by: 'manual', status: 'running', created_by: session?.user?.id ?? null })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const runId = (run as any).id;
      let result: any;
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('kb-sync', {
          body: { action: 'sync_all', sync_run_id: runId },
        });
        if (fnErr) throw fnErr;
        // Check if the response itself contains an error
        if (data?.error) throw new Error(data.error);
        result = data;
      } catch (fnError: any) {
        // Mark the run as failed so it doesn't stay stuck in "running"
        await fromAny('wiki_sync_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: fnError?.message || 'Edge function call failed',
          })
          .eq('id', runId);
        throw fnError;
      }

      const summary = result?.summary ?? {};
      const failedTables = summary?.failed_tables ?? 0;
      const totalTables = summary?.total_tables ?? 0;

      await fromAny('wiki_sync_runs')
        .update({
          status: failedTables === 0 ? 'complete' : (failedTables === totalTables && totalTables > 0 ? 'failed' : 'partial'),
          completed_at: new Date().toISOString(),
          steps: result?.steps || [],
          total_items_processed: summary?.rows_processed ?? result?.rows_processed ?? 0,
          new_chunks: summary?.new_chunks ?? result?.new_chunks ?? 0,
          total_duration_ms: summary?.duration_ms ?? result?.duration_ms ?? 0,
          error_message: failedTables > 0 ? `${failedTables} table(s) failed` : null,
        })
        .eq('id', runId);

      return run;
    },
    onSuccess: () => {
      toast.success('Wiki sync completed');
      qc.invalidateQueries({ queryKey: ['wiki-sync-runs'] });
      qc.invalidateQueries({ queryKey: ['wiki-admin-stats'] });
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
      qc.invalidateQueries({ queryKey: ['wiki-sync-runs'] });
    },
  });
}

export function useRegeneratePage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.functions.invoke('kb-sync', {
        body: { action: 'sync_all', table_name: 'wiki_pages', source_id: pageId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Page regeneration started');
      qc.invalidateQueries({ queryKey: ['wiki-page-admin-list'] });
    },
    onError: (err: Error) => {
      toast.error(`Regeneration failed: ${err.message}`);
    },
  });
}

export function useUpdatePageStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, status }: { pageId: string; status: string }) => {
      const { error } = await fromAny('wiki_pages')
        .update({ status })
        .eq('id', pageId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Page status → ${variables.status}`);
      qc.invalidateQueries({ queryKey: ['wiki-page-admin-list'] });
      qc.invalidateQueries({ queryKey: ['wiki-admin-stats'] });
    },
    onError: (err: Error) => {
      toast.error(`Status update failed: ${err.message}`);
    },
  });
}

export function useReembedDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase.functions.invoke('kb-sync', {
        body: { action: 'sync_table', table_name: 'wiki_documents', source_id: documentId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Re-embedding started');
      qc.invalidateQueries({ queryKey: ['wiki-admin-documents'] });
    },
    onError: (err: Error) => {
      toast.error(`Re-embed failed: ${err.message}`);
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error: docErr } = await fromAny('wiki_documents')
        .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
        .eq('id', documentId);
      if (docErr) throw docErr;

      const { error: embErr } = await fromAny('kb_embeddings')
        .delete()
        .eq('source_id', documentId)
        .eq('source_table', 'wiki_documents');
      if (embErr) console.warn('Embedding cleanup warning:', embErr.message);
    },
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['wiki-admin-documents'] });
      qc.invalidateQueries({ queryKey: ['wiki-admin-stats'] });
    },
    onError: (err: Error) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });
}

export function useUpdateAccess() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, has_access }: { id: string; has_access: boolean }) => {
      const { error } = await supabase
        .from('kb_access_matrix')
        .update({ has_access, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-access-matrix'] });
    },
    onError: (err: Error) => {
      toast.error(`Access update failed: ${err.message}`);
    },
  });
}
