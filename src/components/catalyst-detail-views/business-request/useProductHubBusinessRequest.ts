/**
 * useProductHubBusinessRequest — adapter between the Business Request
 * domain (`business_requests` table via useBusinessRequest /
 * useUpdateBusinessRequest from `@/hooks/useBusinessRequests`) and the
 * canonical Catalyst View shell (`CatalystViewBase`).
 *
 * Accepts EITHER:
 *   - `requestId` (UUID — direct `business_requests.id`), OR
 *   - `requestKey` (MIM-XXX — display key, looked up via the
 *     `useBusinessRequestByKey` query before falling through to
 *     `useBusinessRequest(id)`)
 *
 * The Product Hub list/kanban/cards/roadmap pages render rows from the
 * separate `ph_requests` table whose UUIDs do NOT match
 * `business_requests.id`. Both tables share the `request_key` (MIM-XXX)
 * identifier — that's the canonical cross-table join. Passing
 * `requestKey` from those producthub mount sites is the cycle-4
 * adapter pattern.
 *
 * jira-compare cycle 1 (initial), cycle 4 (key resolution added).
 */
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import {
  useBusinessRequest,
  useUpdateBusinessRequest,
  useDeleteBusinessRequest,
} from '@/hooks/useBusinessRequests';
import type { BusinessRequest } from '@/types/business-request';

export interface ProductHubBusinessRequestApi {
  request: BusinessRequest | null;
  /** Resolved UUID — useful for downstream mutations / queries that need the id. */
  resolvedId: string | null;
  isLoading: boolean;
  /**
   * Partial-update a single field on the BR row.
   *
   * Field-name typing is loose for the freeform columns
   * (`request_type`, `category`, `scope_url`) — see CreateBusinessRequest
   * for the canonical column list.
   */
  updateField: (field: string, value: unknown) => Promise<void>;
  deleteRequest: () => Promise<void>;
}

export interface UseProductHubBusinessRequestArgs {
  /** Direct `business_requests.id` UUID. Wins over `requestKey` if both passed. */
  requestId?: string | null;
  /** Display key (MIM-XXX). Resolved to `business_requests.id` via a query. */
  requestKey?: string | null;
}

export function useProductHubBusinessRequest(
  arg: string | null | UseProductHubBusinessRequestArgs,
): ProductHubBusinessRequestApi {
  // Normalize the arg: support legacy 1-arg `(string | null)` callers + the
  // new `({ requestId, requestKey })` callers.
  const args: UseProductHubBusinessRequestArgs =
    typeof arg === 'string' || arg === null
      ? { requestId: arg }
      : arg;

  const { requestId: directId, requestKey } = args;

  // If we have a direct id, skip the key lookup. Otherwise resolve key→id.
  const { data: keyResolvedId, isLoading: keyResolving } = useQuery({
    queryKey: ['br-key-to-id', requestKey],
    enabled: !directId && !!requestKey,
    queryFn: async () => {
      if (!requestKey) return null;
      const { data, error } = await typedQuery('business_requests')
        .select('id')
        .eq('request_key', requestKey)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return ((data as { id?: string } | null)?.id ?? null) as string | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const resolvedId = directId ?? keyResolvedId ?? null;

  const { data: request, isLoading } = useBusinessRequest(resolvedId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();

  const updateField = useCallback(
    async (field: string, value: unknown) => {
      if (!resolvedId) return;
      await updateMutation.mutateAsync({
        id: resolvedId,
        data: { [field]: value } as Partial<BusinessRequest>,
      });
    },
    [resolvedId, updateMutation],
  );

  const deleteRequest = useCallback(async () => {
    if (!resolvedId) return;
    await deleteMutation.mutateAsync(resolvedId);
  }, [resolvedId, deleteMutation]);

  return {
    request: request ?? null,
    resolvedId,
    isLoading: isLoading || keyResolving,
    updateField,
    deleteRequest,
  };
}

export default useProductHubBusinessRequest;
