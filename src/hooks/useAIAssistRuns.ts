import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AIAssistRun {
  id: string;
  draft_id: string;
  run_number: number;
  canonical_text_hash: string | null;
  prompt_pack_version: string | null;
  sources_pack_version: string | null;
  model_id: string;
  temperature: number;
  top_p: number;
  status: RunStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateRunInput {
  draft_id: string;
  canonical_text_hash?: string;
  prompt_pack_version?: string;
  sources_pack_version?: string;
}

// Fetch all runs for a draft
export function useAIAssistRuns(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-runs', draftId],
    queryFn: async (): Promise<AIAssistRun[]> => {
      if (!draftId) return [];

      const { data, error } = await supabase
        .from('ai_assist_runs')
        .select('*')
        .eq('draft_id', draftId)
        .order('run_number', { ascending: false });

      if (error) throw error;
      return data as AIAssistRun[];
    },
    enabled: !!draftId,
  });
}

// Fetch the latest run for a draft
export function useLatestRun(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-latest-run', draftId],
    queryFn: async (): Promise<AIAssistRun | null> => {
      if (!draftId) return null;

      const { data, error } = await supabase
        .from('ai_assist_runs')
        .select('*')
        .eq('draft_id', draftId)
        .order('run_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AIAssistRun | null;
    },
    enabled: !!draftId,
  });
}

// Create a new run
export function useCreateRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRunInput): Promise<AIAssistRun> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get the next run number
      const { data: existingRuns } = await supabase
        .from('ai_assist_runs')
        .select('run_number')
        .eq('draft_id', input.draft_id)
        .order('run_number', { ascending: false })
        .limit(1);

      const nextRunNumber = existingRuns && existingRuns.length > 0 
        ? existingRuns[0].run_number + 1 
        : 1;

      const { data, error } = await supabase
        .from('ai_assist_runs')
        .insert({
          draft_id: input.draft_id,
          run_number: nextRunNumber,
          canonical_text_hash: input.canonical_text_hash,
          prompt_pack_version: input.prompt_pack_version,
          sources_pack_version: input.sources_pack_version,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent(input.draft_id, data.id, 'run_started', userId, { run_number: nextRunNumber });

      return data as AIAssistRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-runs', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-run', data.draft_id] });
      toast.success('Run started');
    },
    onError: (error) => {
      toast.error('Failed to start run: ' + error.message);
    },
  });
}

// Update run status
export function useUpdateRunStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      runId, 
      draftId,
      status, 
      errorMessage 
    }: { 
      runId: string; 
      draftId: string;
      status: RunStatus; 
      errorMessage?: string;
    }): Promise<AIAssistRun> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const updates: Record<string, unknown> = { status };
      
      if (status === 'running') {
        updates.started_at = new Date().toISOString();
      }
      
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updates.completed_at = new Date().toISOString();
      }
      
      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      const { data, error } = await supabase
        .from('ai_assist_runs')
        .update(updates)
        .eq('id', runId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (status === 'completed') {
        await logAuditEvent(draftId, runId, 'run_completed', userId, { status });
      }

      return data as AIAssistRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-runs', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-run', data.draft_id] });
    },
    onError: (error) => {
      toast.error('Failed to update run: ' + error.message);
    },
  });
}
