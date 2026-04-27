import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface JiraSyncConfig {
  id: string;
  sync_enabled: boolean;
  frozen_at: string | null;
  freeze_note: string | null;
  last_sync_at: string | null;
  data_cutoff_year: number;
  preserved_work_items: number | null;
  preserved_projects: number | null;
  preserved_users: number | null;
  updated_at: string;
}

const QUERY_KEY = ['jira-sync-config'] as const;

export function useJiraSyncConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<JiraSyncConfig | null> => {
      const { data, error } = await supabase
        .from('jira_integration_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as JiraSyncConfig | null;
    },
    staleTime: 10_000,
  });

  // Realtime: keep the panel in sync when another admin toggles
  useEffect(() => {
    const channel = supabase
      .channel('jira-sync-config-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jira_integration_config' },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ── disable_jira_sync ───────────────────────────────────────────────────────
  const disableSync = useMutation({
    mutationFn: async (note?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('disable_jira_sync', {
        p_triggered_by: user?.id ?? null,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data as { status: string; frozen_at: string; preserved_work_items: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(
        `Jira sync paused — ${result.preserved_work_items ?? 0} work items preserved in Catalyst.`,
        { duration: 6000 }
      );
    },
    onError: (err: Error) => {
      toast.error(`Failed to pause Jira sync: ${err.message}`);
    },
  });

  // ── enable_jira_sync ────────────────────────────────────────────────────────
  const enableSync = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('enable_jira_sync', {
        p_triggered_by: user?.id ?? null,
      });
      if (error) throw error;
      return data as { status: string; enabled_at: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Jira sync re-enabled. Run a full sync to pull the latest data.');
    },
    onError: (err: Error) => {
      toast.error(`Failed to re-enable Jira sync: ${err.message}`);
    },
  });

  return {
    config,
    isLoading,
    error,
    isSyncEnabled: config?.sync_enabled ?? false,
    isFrozen: !config?.sync_enabled,
    disableSync,
    enableSync,
  };
}
