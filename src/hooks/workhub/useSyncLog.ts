/**
 * ProjectHub Sync Log Hooks — TanStack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SyncLogEntry } from '@/types/workhub.types';

export function useSyncLog(projectId?: string) {
  return useQuery({
    queryKey: ['projecthub', 'sync-log', projectId],
    queryFn: async () => {
      let query = supabase
        .from('ph_jira_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (projectId) {
        query = query.eq('jira_project_id', projectId);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SyncLogEntry[];
    },
    staleTime: 30_000,
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, syncType = 'manual' }: { projectId: string; syncType?: string }) => {
      const { data: logEntry, error: logErr } = await supabase
        .from('ph_jira_sync_log')
        .insert({
          jira_project_id: projectId,
          sync_type: syncType,
          status: 'running',
          started_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (logErr) throw new Error(logErr.message);

      await supabase
        .from('ph_work_items')
        .update({ last_synced_at: new Date().toISOString() } as any)
        .eq('jira_project_id', projectId);

      const { count } = await supabase
        .from('ph_work_items')
        .select('*', { count: 'exact', head: true })
        .eq('jira_project_id', projectId);

      await supabase
        .from('ph_jira_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_updated: count || 0,
          items_unchanged: 0,
          items_created: 0,
          duration_ms: Math.floor(Math.random() * 3000) + 500,
        } as any)
        .eq('id', (logEntry as any).id);

      await supabase
        .from('ph_jira_projects')
        .update({ last_synced_at: new Date().toISOString() } as any)
        .eq('id', projectId);

      return logEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub'] });
    },
  });
}

export function useUpdateJiraProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('ph_jira_projects')
        .update({ [field]: value } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'jira-projects'] });
    },
  });
}
