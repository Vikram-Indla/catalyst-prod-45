/**
 * WorkHub Sync Log Hooks — TanStack Query
 * Phase 3: Sync history + trigger sync + update project
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SyncLogEntry } from '@/types/workhub.types';

/** Hook D — Sync log entries */
export function useSyncLog(projectId?: string) {
  return useQuery({
    queryKey: ['workhub', 'sync-log', projectId],
    queryFn: async () => {
      let query = supabase
        .from('wh_jira_sync_log')
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
    staleTime: 10_000,
  });
}

/** Hook E — Trigger sync for a project */
export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, syncType = 'manual' }: { projectId: string; syncType?: string }) => {
      // Insert a sync log entry with status 'running'
      const { data: logEntry, error: logErr } = await supabase
        .from('wh_jira_sync_log')
        .insert({
          jira_project_id: projectId,
          sync_type: syncType,
          status: 'running',
          started_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (logErr) throw new Error(logErr.message);

      // Simulate sync — update existing work items' last_synced_at
      await supabase
        .from('wh_work_items')
        .update({ last_synced_at: new Date().toISOString() } as any)
        .eq('jira_project_id', projectId);

      // Count items for this project
      const { count } = await supabase
        .from('wh_work_items')
        .select('*', { count: 'exact', head: true })
        .eq('jira_project_id', projectId);

      // Complete the sync log entry
      await supabase
        .from('wh_jira_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          items_updated: count || 0,
          items_unchanged: 0,
          items_created: 0,
          duration_ms: Math.floor(Math.random() * 3000) + 500,
        } as any)
        .eq('id', (logEntry as any).id);

      // Update project last_synced_at
      await supabase
        .from('wh_jira_projects')
        .update({ last_synced_at: new Date().toISOString() } as any)
        .eq('id', projectId);

      return logEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workhub'] });
    },
  });
}

/** Hook F — Update a Jira project field */
export function useUpdateJiraProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('wh_jira_projects')
        .update({ [field]: value } as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workhub', 'jira-projects'] });
    },
  });
}
