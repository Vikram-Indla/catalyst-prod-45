/**
 * useProductHubBusinessRequest — adapter between the Business Request
 * domain (`business_requests` table via useBusinessRequest /
 * useUpdateBusinessRequest from `@/hooks/useBusinessRequests`) and the
 * canonical Catalyst View shell (`CatalystViewBase`).
 *
 * The Catalyst canonical view pattern (see `CatalystViewStory`) takes a
 * data hook returning the row + a mutations object. This hook returns an
 * analogous shape backed by the Business Request domain hooks so the v2
 * `CatalystViewBusinessRequest` shell can consume them like any other
 * Catalyst detail view.
 *
 * jira-compare cycle 1 — Phase 1 of the producthub view drawer migration.
 * Each mount-site swap in cycles 4-6 will pass a `business_requests.id`
 * UUID; this hook does the lookup + exposes field-update + delete
 * handlers the v2 shell consumes.
 */
import { useCallback } from 'react';
import {
  useBusinessRequest,
  useUpdateBusinessRequest,
  useDeleteBusinessRequest,
} from '@/hooks/useBusinessRequests';
import type { BusinessRequest } from '@/types/business-request';

export interface ProductHubBusinessRequestApi {
  request: BusinessRequest | null;
  isLoading: boolean;
  /**
   * Partial-update a single field on the BR row.
   *
   * Field-name typing is loose because several columns
   * (`request_type`, `category`, `scope_url`) live in the DB but
   * aren't typed on the `BusinessRequest` interface yet — see
   * `useCreateBusinessRequest` payload for the canonical column list.
   * Cycle 2 will tighten these once the type sync lands.
   */
  updateField: (field: string, value: unknown) => Promise<void>;
  deleteRequest: () => Promise<void>;
}

export function useProductHubBusinessRequest(
  requestId: string | null,
): ProductHubBusinessRequestApi {
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();

  const updateField = useCallback(
    async (field: string, value: unknown) => {
      if (!requestId) return;
      await updateMutation.mutateAsync({
        id: requestId,
        data: { [field]: value } as Partial<BusinessRequest>,
      });
    },
    [requestId, updateMutation],
  );

  const deleteRequest = useCallback(async () => {
    if (!requestId) return;
    await deleteMutation.mutateAsync(requestId);
  }, [requestId, deleteMutation]);

  return {
    request: request ?? null,
    isLoading,
    updateField,
    deleteRequest,
  };
}

export default useProductHubBusinessRequest;
