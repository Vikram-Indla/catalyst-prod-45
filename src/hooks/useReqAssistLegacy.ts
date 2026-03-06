/**
 * Legacy V1 Req Assist hooks — kept for backward compatibility
 * with ReqAssistPipeline, ReqAssistDocument, ReqAssistIntakeDrawer
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBrdDocuments(_filters?: any) {
  return useQuery({
    queryKey: ['brd-documents', _filters],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brd_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBrdDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['brd-document', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from('brd_documents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useBrdEpics(docId: string | undefined) {
  return useQuery({
    queryKey: ['brd-epics', docId],
    queryFn: async () => {
      if (!docId) return [];
      const { data, error } = await (supabase as any)
        .from('brd_epics')
        .select('*')
        .eq('brd_id', docId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!docId,
  });
}

export function useBrdQueueItems(docId: string | undefined) {
  return useQuery({
    queryKey: ['brd-queue', docId],
    queryFn: async () => {
      if (!docId) return [];
      const { data, error } = await (supabase as any)
        .from('brd_processing_queue')
        .select('*')
        .eq('brd_id', docId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!docId,
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: ['pipeline-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brd_documents')
        .select('pipeline_stage');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => {
        counts[d.pipeline_stage] = (counts[d.pipeline_stage] ?? 0) + 1;
      });
      return counts;
    },
  });
}

export function useAvgQuality() {
  return useQuery({
    queryKey: ['avg-quality'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brd_documents')
        .select('quality_score')
        .not('quality_score', 'is', null);
      if (error) throw error;
      if (!data?.length) return 0;
      return data.reduce((s: number, d: any) => s + d.quality_score, 0) / data.length;
    },
  });
}

export function useAvgProcessingTime() {
  return useQuery({
    queryKey: ['avg-processing-time'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brd_processing_queue')
        .select('started_at, completed_at')
        .eq('status', 'completed')
        .not('started_at', 'is', null)
        .not('completed_at', 'is', null);
      if (error) throw error;
      if (!data?.length) return 0;
      const diffs = data.map((d: any) => new Date(d.completed_at).getTime() - new Date(d.started_at).getTime());
      return diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length;
    },
  });
}

export function useEpicCountsByDoc(_docIds?: any) {
  return useQuery({
    queryKey: ['epic-counts', _docIds],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('brd_epics')
        .select('brd_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => {
        counts[d.brd_id] = (counts[d.brd_id] ?? 0) + 1;
      });
      return counts;
    },
  });
}

export function useCreateBrdDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any)
        .from('brd_documents')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brd-documents'] });
    },
  });
}

export function useEnqueueDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any)
        .from('brd_processing_queue')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brd-documents'] });
    },
  });
}
