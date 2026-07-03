/**
 * useSavedReports — saved report views on tm_saved_reports.
 * Feature: CAT-REPORTS-HUB-20260703-001 Phase 3 (Task C).
 *
 * RLS: SELECT returns owner's rows + is_shared rows; INSERT requires
 * owner_id = auth.uid() (set explicitly from supabase.auth.getUser()).
 * Every query THROWS on error (no silent {data} destructure).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SavedReportParameters {
  projectId?: string;
  cycleId?: string;
  range?: string;
}

export interface SavedReportView {
  id: string;
  name: string;
  /** registry report id (slug) */
  report_type: string;
  parameters: SavedReportParameters;
  is_shared: boolean;
  owner_id: string;
  created_at: string;
}

const QUERY_KEY = ['tm-saved-reports'];

export function useSavedReports() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SavedReportView[]> => {
      // RLS already scopes to owner's + shared rows.
      const { data, error } = await supabase
        .from('tm_saved_reports')
        .select('id, name, report_type, parameters, is_shared, owner_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        report_type: r.report_type,
        parameters: (r.parameters ?? {}) as SavedReportParameters,
        is_shared: r.is_shared ?? false,
        owner_id: r.owner_id,
        created_at: r.created_at,
      }));
    },
    staleTime: 60 * 1000,
  });
}

export interface SaveReportViewInput {
  name: string;
  report_type: string;
  parameters: SavedReportParameters;
  is_shared: boolean;
}

export function useSaveReportView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveReportViewInput): Promise<void> => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = auth.user?.id;
      if (!userId) throw new Error('You must be signed in to save a report view.');
      const { error } = await supabase.from('tm_saved_reports').insert({
        name: input.name,
        report_type: input.report_type,
        parameters: input.parameters,
        is_shared: input.is_shared,
        owner_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteReportView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tm_saved_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
