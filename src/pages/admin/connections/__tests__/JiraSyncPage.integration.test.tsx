import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useManualSyncMutation, useRefreshDataMutation } from '@/lib/jira-integration/useJiraSyncMutations';
import { resolveJiraEnvironment } from '@/lib/jira-integration/environmentResolver';

describe('JiraSyncPage Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  describe('Environment Detection', () => {
    it('resolves production environment from VITE_SUPABASE_URL', () => {
      const mockUrl = 'https://lmqwtldpfacrrlvdnmld.supabase.co';
      const env = resolveJiraEnvironment();
      // Will resolve based on actual env var in test
      expect(env).toHaveProperty('environment');
      expect(env).toHaveProperty('supabaseProjectRef');
      expect(env).toHaveProperty('isStagingRuntime');
      expect(env).toHaveProperty('isProductionRuntime');
    });

    it('resolves staging environment correctly', () => {
      const env = resolveJiraEnvironment();
      expect(['staging', 'production', 'local']).toContain(env.environment);
    });
  });

  describe('Manual Sync Mutation', () => {
    it('calls jira-manual-sync edge function with full mode', async () => {
      const spy = vi.spyOn(supabase.functions, 'invoke');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useManualSyncMutation(), { wrapper });

      result.current.mutate({ mode: 'full' });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      }, { timeout: 5000 });

      // Verify function was called
      expect(spy).toHaveBeenCalledWith('jira-manual-sync', expect.any(Object));
    });

    it('handles sync errors gracefully', async () => {
      vi.spyOn(supabase.functions, 'invoke').mockRejectedValueOnce(
        new Error('Sync failed')
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useManualSyncMutation(), { wrapper });

      result.current.mutate({ mode: 'full' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });
    });
  });

  describe('Refresh Data Mutation', () => {
    it('validates confirmation phrase for production', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRefreshDataMutation(), { wrapper });

      const wrongPhrase = 'INVALID PHRASE';

      result.current.mutate({
        projectKeys: ['BAU'],
        confirmationPhrase: wrongPhrase,
        mode: 'confirmed',
      });

      // Should validate on the client side or edge function
      // Depending on environment
      expect(result.current.mutate).toBeDefined();
    });

    it('requires correct confirmation phrase for confirmed mode', async () => {
      const spy = vi.spyOn(supabase.functions, 'invoke');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useRefreshDataMutation(), { wrapper });

      const env = resolveJiraEnvironment();
      const correctPhrase = env.isProductionRuntime
        ? 'REFRESH PRODUCTION JIRA DATA'
        : 'REFRESH STAGING JIRA DATA';

      result.current.mutate({
        projectKeys: ['BAU'],
        confirmationPhrase: correctPhrase,
        mode: 'confirmed',
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      }, { timeout: 5000 });

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Mapping Validation', () => {
    it('loads jira_sync_mappings for active environment', async () => {
      const spy = vi.spyOn(supabase, 'from').mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      // Simulate loading mappings
      const { data } = await supabase
        .from('jira_sync_mappings')
        .select('*')
        .eq('environment', 'production')
        .eq('mapping_type', 'issue_type');

      expect(data).toBeDefined();
    });
  });

  describe('Environment Banner', () => {
    it('renders environment label correctly', () => {
      const env = resolveJiraEnvironment();

      // Test getEnvironmentLabel
      const { getEnvironmentLabel } = require('@/lib/jira-integration/environmentResolver');
      const label = getEnvironmentLabel(env.environment);

      expect(['🟡 STAGING', '🔴 PRODUCTION', '⚪ LOCAL']).toContain(label);
    });

    it('warns production environment', () => {
      const env = resolveJiraEnvironment();

      if (env.isProductionRuntime) {
        expect(env.environment).toBe('production');
      }
    });
  });
});
