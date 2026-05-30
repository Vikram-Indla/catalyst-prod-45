/**
 * useAdminFeatureFlags — TanStack Query hooks for the Feature Flags admin page.
 * Provides optimistic updates, rollback, and toast notifications.
 * Also invalidates the global FeatureFlagContext on mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagService } from '@/services/feature-flags';
import type { EnvironmentScope, FeatureFlagTogglePayload, FeatureFlag } from '@/types/feature-flags';
import { catalystToast } from '@/lib/catalystToast';
import { useAuth } from '@/lib/auth';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

const QUERY_KEY = 'admin-feature-flags';

export function useAdminFeatureFlags(environment: EnvironmentScope = 'production') {
  return useQuery({
    queryKey: [QUERY_KEY, environment],
    queryFn: () => featureFlagService.getAll(environment),
  });
}

export function useAdminFeatureFlagStats(environment: EnvironmentScope = 'production') {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats', environment],
    queryFn: () => featureFlagService.getStats(environment),
  });
}

export function useAdminFeatureFlagAudit(flagId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'audit', flagId],
    queryFn: () => featureFlagService.getAuditLog(flagId),
  });
}

export function useToggleAdminFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { refetch: refetchGlobalFlags } = useFeatureFlags();

  return useMutation({
    mutationFn: (payload: FeatureFlagTogglePayload) =>
      featureFlagService.toggle(
        payload,
        user?.user_metadata?.full_name ?? 'Admin',
        user?.id,
      ),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previous = queryClient.getQueryData<FeatureFlag[]>([QUERY_KEY, payload.environment]);

      queryClient.setQueryData<FeatureFlag[]>(
        [QUERY_KEY, payload.environment],
        (old) =>
          old?.map((f) =>
            f.id === payload.id
              ? { ...f, enabled: payload.enabled, status: payload.enabled ? 'live' as const : 'draft' as const }
              : f,
          ),
      );

      return { previous, environment: payload.environment };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEY, context.environment], context.previous);
      }
      catalystToast.error('Failed to update module. Please try again.');
    },
    onSuccess: (data) => {
      catalystToast.success(`${data.module_name} ${data.enabled ? 'enabled' : 'disabled'}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Invalidate global feature flag context so nav updates immediately
      refetchGlobalFlags();
    },
  });
}

export function useBulkToggleAdminFeatureFlags() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { refetch: refetchGlobalFlags } = useFeatureFlags();

  return useMutation({
    mutationFn: ({ enabled, environment }: { enabled: boolean; environment: EnvironmentScope }) =>
      featureFlagService.bulkToggle(
        enabled,
        environment,
        user?.user_metadata?.full_name ?? 'Admin',
        user?.id,
      ),
    onSuccess: (_, { enabled }) => {
      catalystToast.success(enabled ? 'All modules enabled' : 'All modules disabled');
    },
    onError: () => {
      catalystToast.error('Bulk update failed. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Invalidate global feature flag context so nav updates immediately
      refetchGlobalFlags();
    },
  });
}

export function useFeatureFlagDependents(moduleKey: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'dependents', moduleKey],
    queryFn: () => featureFlagService.getDependents(moduleKey),
    enabled: !!moduleKey,
  });
}
