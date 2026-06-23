import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveJiraEnvironment } from './environmentResolver';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lmqwtldpfacrrlvdnmld.supabase.co';

interface ManualSyncRequest {
  projectKey?: string;
  mode: 'full' | 'incremental' | 'dry-run';
}

interface ManualSyncResponse {
  environment: string;
  recordsAdded: number;
  recordsSkipped: number;
  estimatedCount?: number;
  errors: Array<{ issue: string; reason: string }>;
}

interface RefreshDataRequest {
  projectKeys: string[];
  confirmationPhrase: string;
  mode: 'dry-run' | 'confirmed';
}

interface RefreshDataResponse {
  environment: string;
  recordsDeleted: number;
  recordsReloaded: number;
  errors: Array<{ reason: string }>;
}

/**
 * Manual sync mutation — discover, apply filters, sync issues from Jira
 */
export function useManualSyncMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (request: ManualSyncRequest): Promise<ManualSyncResponse> => {
      const { data, error } = await supabase.functions.invoke('jira-manual-sync', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jira-projects', env.environment] });
      queryClient.invalidateQueries({ queryKey: ['jira-sync-logs', env.environment] });
    },
  });
}

/**
 * Refresh data mutation — delete Jira-origin rows, reload fresh from Jira
 */
export function useRefreshDataMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (request: RefreshDataRequest): Promise<RefreshDataResponse> => {
      if (env.isProductionRuntime && request.mode === 'confirmed') {
        const requiredPhrase = 'REFRESH PRODUCTION JIRA DATA';
        if (request.confirmationPhrase !== requiredPhrase) {
          throw new Error('Invalid confirmation phrase');
        }
      }

      const { data, error } = await supabase.functions.invoke('jira-refresh-data', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-projects', env.environment] });
      queryClient.invalidateQueries({ queryKey: ['jira-sync-logs', env.environment] });
    },
  });
}

/**
 * Webhook toggle mutation
 */
export function useWebhookToggleMutation() {
  const queryClient = useQueryClient();
  const env = resolveJiraEnvironment();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase
        .from('jira_webhook_control')
        .update({ listening_enabled: enabled })
        .eq('environment', env.environment)
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-control', env.environment] });
    },
  });
}
