import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const syncSettingsKeys = {
  connection: (projectId: string) => ['sync-connection', projectId] as const,
  statusMap: (projectId: string) => ['sync-status-map', projectId] as const,
  health: (projectId: string) => ['sync-health', projectId] as const,
  events: (projectId: string) => ['sync-events', projectId] as const,
};

export function useSyncConnection(projectId: string) {
  return useQuery({
    queryKey: syncSettingsKeys.connection(projectId),
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('sync_connections')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useSyncStatusMap(projectId: string) {
  return useQuery({
    queryKey: syncSettingsKeys.statusMap(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('sync_status_map')
        .select('*')
        .eq('project_id', projectId)
        .order('jira_status_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useUpdateStatusMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, catalyst_status, catalyst_lozenge_color }: {
      id: string;
      catalyst_status: string;
      catalyst_lozenge_color: string;
    }) => {
      const { error } = await supabase
        .from('sync_status_map')
        .update({ catalyst_status, catalyst_lozenge_color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sync-status-map'] });
    },
  });
}

export function useUpdateSyncDirection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId, sync_direction }: {
      connectionId: string;
      sync_direction: string;
    }) => {
      const { error } = await supabase
        .from('sync_connections')
        .update({ sync_direction, updated_at: new Date().toISOString() })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sync-connection'] });
    },
  });
}

export function useSyncHealth(projectId: string) {
  return useQuery({
    queryKey: syncSettingsKeys.health(projectId),
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('sync_health')
        .select('*')
        .eq('project_id', projectId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
}

export function useRecentSyncEvents(projectId: string) {
  return useQuery({
    queryKey: syncSettingsKeys.events(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('sync_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    refetchInterval: 15_000,
  });
}
