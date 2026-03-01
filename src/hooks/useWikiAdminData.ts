/**
 * useWikiAdminData — All hooks for the Wiki Admin Panel.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper: typed query on tables/views not yet in generated types
const fromAny = (table: string) => (supabase as any).from(table);

/* ─── Types ─── */
interface WikiAdminStats {
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

interface WikiSyncRunRow {
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

interface WikiPageAdminRow {
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

interface WikiHealthRow {
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

/* ─── Page Admin List ─── */
interface PageAdminFilters {
  domainCode?: string;
  status?: string;
  search?: string;
}

export function useWikiPageAdminList(filters?: PageAdminFilters) {
  return useQuery({
    queryKey: ['wiki-page-admin-list', filters],
    queryFn: async () => {
      let q = fromAny('wiki_page_admin_list')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.domainCode) q = q.eq('domain_code', filters.domainCode);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.search) q = q.ilike('title', `%${filters.search}%`);

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as WikiPageAdminRow[];
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
interface QueryLogFilters {
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
interface TrainingFilters {
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

/* ─── Mutations ─── */

export function useTriggerSync() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: run, error: insertErr } = await fromAny('wiki_sync_runs')
        .insert({ triggered_by: 'manual', status: 'running' })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const { error: fnErr } = await supabase.functions.invoke('kb-sync', {
        body: { action: 'full_sync', sourceType: 'wiki', sync_run_id: (run as any).id },
      });
      if (fnErr) throw fnErr;

      return run;
    },
    onSuccess: () => {
      toast.success('Wiki sync triggered');
      qc.invalidateQueries({ queryKey: ['wiki-sync-runs'] });
      qc.invalidateQueries({ queryKey: ['wiki-admin-stats'] });
    },
    onError: (err: Error) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });
}

export function useRegeneratePage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.functions.invoke('kb-sync', {
        body: { action: 'regenerate_page', page_id: pageId, sourceType: 'wiki' },
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
    onSuccess: () => {
      toast.success('Page status updated');
      qc.invalidateQueries({ queryKey: ['wiki-page-admin-list'] });
      qc.invalidateQueries({ queryKey: ['wiki-admin-stats'] });
    },
    onError: (err: Error) => {
      toast.error(`Status update failed: ${err.message}`);
    },
  });
}
