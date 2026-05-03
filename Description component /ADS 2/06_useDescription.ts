/**
 * useDescription Hook
 * 
 * TanStack Query-based hook for description state management.
 * Handles:
 * - Loading description from DB
 * - Saving to DB with background sync
 * - Fetching version history
 * - Rollback operations
 * 
 * DYNAMITE Stage D: All data flows from DB through TanStack → React state → UI
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { descriptionApi } from './descriptionApi';
import type {
  CatalystDescription,
  DescriptionVersion,
  EntityType,
  UUID,
  UseDescriptionReturn,
} from './description.types';
import type { ADFDocument } from './adf';

// ============================================================================
// QUERY KEYS (for cache invalidation)
// ============================================================================

const descriptionKeys = {
  all: ['descriptions'] as const,
  latest: (entityId: UUID, entityType: EntityType) => [
    ...descriptionKeys.all,
    'latest',
    entityId,
    entityType,
  ] as const,
  versions: (entityId: UUID, entityType: EntityType, page?: number) => [
    ...descriptionKeys.all,
    'versions',
    entityId,
    entityType,
    page || 1,
  ] as const,
  version: (entityId: UUID, entityType: EntityType, versionNumber: number) => [
    ...descriptionKeys.all,
    'version',
    entityId,
    entityType,
    versionNumber,
  ] as const,
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Load and manage description for an entity
 * 
 * @param entityId - The entity ID (release, project, story, etc.)
 * @param entityType - The entity type
 * @returns UseDescriptionReturn with data, state, and actions
 * 
 * Usage:
 * ```tsx
 * const {
 *   description,
 *   content_adf,
 *   versions,
 *   isLoading,
 *   saveDescription,
 *   rollbackToVersion,
 * } = useDescription(releaseId, 'release');
 * 
 * if (isLoading) return <Spinner />;
 * 
 * return (
 *   <>
 *     <DescriptionEditor
 *       initialADF={content_adf || createEmptyDocument()}
 *       onSave={(adf) => saveDescription(adf, 'Updated release description')}
 *     />
 *     <VersionHistory
 *       versions={versions}
 *       onRestore={(v) => rollbackToVersion(v.version_number)}
 *     />
 *   </>
 * );
 * ```
 */
export function useDescription(
  entityId: UUID,
  entityType: EntityType
): UseDescriptionReturn {
  const queryClient = useQueryClient();

  // =========================================================================
  // LOAD: GET latest description
  // =========================================================================

  const { data: description, isLoading: isLoadingDescription } = useQuery({
    queryKey: descriptionKeys.latest(entityId, entityType),
    queryFn: () => descriptionApi.getLatest(entityId, entityType),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });

  // =========================================================================
  // SAVE: Upsert description
  // =========================================================================

  const {
    mutateAsync: saveDescriptionAsync,
    isPending: isSaving,
    error: saveError,
  } = useMutation({
    mutationFn: (args: { adf: ADFDocument; changeSummary?: string }) =>
      descriptionApi.save(entityId, entityType, args.adf, args.changeSummary),
    onSuccess: (newDescription) => {
      // Invalidate latest query to refetch
      queryClient.invalidateQueries({
        queryKey: descriptionKeys.latest(entityId, entityType),
      });
      // Invalidate versions query
      queryClient.invalidateQueries({
        queryKey: descriptionKeys.versions(entityId, entityType),
      });
      // Optionally update cache directly (optimistic)
      queryClient.setQueryData(
        descriptionKeys.latest(entityId, entityType),
        newDescription
      );
    },
    onError: (err) => {
      console.error('[useDescription] save error:', err);
    },
  });

  /**
   * Wrapper to save description
   * DYNAMITE Stage D: User click → saveDescription → descriptionApi.save → INSERT to DB → Query invalidated → New data fetched → UI updates
   */
  const saveDescription = async (
    adf: ADFDocument,
    changeSummary?: string
  ): Promise<void> => {
    try {
      await saveDescriptionAsync({ adf, changeSummary });
    } catch (err) {
      console.error('saveDescription failed:', err);
      throw err;
    }
  };

  // =========================================================================
  // LOAD: Fetch version history
  // =========================================================================

  const {
    data: versionsData,
    isLoading: isLoadingVersions,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: descriptionKeys.versions(entityId, entityType, 1),
    queryFn: () => descriptionApi.getVersions(entityId, entityType, 1),
    enabled: !!description, // Only fetch if description exists
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  // =========================================================================
  // ROLLBACK: Restore from a previous version
  // =========================================================================

  const {
    mutateAsync: rollbackAsync,
    isPending: isRollingBack,
    error: rollbackError,
  } = useMutation({
    mutationFn: (args: { versionNumber: number; reason?: string }) =>
      descriptionApi.rollback(
        entityId,
        entityType,
        args.versionNumber,
        args.reason
      ),
    onSuccess: () => {
      // Invalidate all description queries
      queryClient.invalidateQueries({
        queryKey: descriptionKeys.latest(entityId, entityType),
      });
      queryClient.invalidateQueries({
        queryKey: descriptionKeys.versions(entityId, entityType),
      });
    },
    onError: (err) => {
      console.error('[useDescription] rollback error:', err);
    },
  });

  /**
   * Rollback to a specific version
   * DYNAMITE Stage D: User clicks "Restore v3" → rollbackToVersion → descriptionApi.rollback → Creates v4 with v3 content → DB updated → Query refetch → UI shows restored content
   */
  const rollbackToVersion = async (
    versionNumber: number,
    reason?: string
  ): Promise<void> => {
    try {
      await rollbackAsync({ versionNumber, reason });
    } catch (err) {
      console.error('rollbackToVersion failed:', err);
      throw err;
    }
  };

  // =========================================================================
  // DELETE: Soft-delete description
  // =========================================================================

  const {
    mutateAsync: deleteDescriptionAsync,
    isPending: isDeleting,
    error: deleteError,
  } = useMutation({
    mutationFn: () => {
      if (!description?.id) throw new Error('No description to delete');
      return descriptionApi.delete(description.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: descriptionKeys.latest(entityId, entityType),
      });
    },
    onError: (err) => {
      console.error('[useDescription] delete error:', err);
    },
  });

  // =========================================================================
  // RETURN STATE & ACTIONS
  // =========================================================================

  const versions = versionsData?.versions ?? [];
  const currentVersion = description?.version ?? 0;
  const totalVersions = versionsData?.total_count ?? 0;

  return {
    // Data
    description: description || null,
    content_adf: description?.content_adf || null,
    versions,

    // State
    isLoading: isLoadingDescription || isLoadingVersions,
    isSaving: isSaving || isRollingBack || isDeleting,
    error: saveError || rollbackError || deleteError || null,

    // Actions
    saveDescription,
    rollbackToVersion,

    // Metadata
    currentVersion,
    totalVersions,
    lastModifiedBy: description?.updated_by,
    lastModifiedAt: description?.updated_at as any,

    // Refetch
    refetchVersions: () => refetchVersions(),
  };
}

// ============================================================================
// HOOK VARIANTS
// ============================================================================

/**
 * useDescriptionReadOnly
 * 
 * Lighter hook for read-only scenarios (e.g., SignOffQueue).
 * Only loads description, no save/rollback.
 */
export function useDescriptionReadOnly(
  entityId: UUID,
  entityType: EntityType
) {
  const { data: description, isLoading } = useQuery({
    queryKey: descriptionKeys.latest(entityId, entityType),
    queryFn: () => descriptionApi.getLatest(entityId, entityType),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    description: description || null,
    content_adf: description?.content_adf || null,
    isLoading,
  };
}

/**
 * useDescriptionVersions
 * 
 * Fetch version history for a description.
 * Useful for version timeline UI.
 */
export function useDescriptionVersions(
  entityId: UUID,
  entityType: EntityType,
  page: number = 1
) {
  const { data, isLoading, error } = useQuery({
    queryKey: descriptionKeys.versions(entityId, entityType, page),
    queryFn: () => descriptionApi.getVersions(entityId, entityType, page),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    versions: data?.versions ?? [],
    total_count: data?.total_count ?? 0,
    page: data?.page ?? 1,
    page_size: data?.page_size ?? 10,
    isLoading,
    error,
  };
}

/**
 * useDescriptionVersion
 * 
 * Fetch a specific version for diff view or inspection.
 */
export function useDescriptionVersion(
  entityId: UUID,
  entityType: EntityType,
  versionNumber: number
) {
  const { data: version, isLoading, error } = useQuery({
    queryKey: descriptionKeys.version(entityId, entityType, versionNumber),
    queryFn: () =>
      descriptionApi.getVersion(entityId, entityType, versionNumber),
    staleTime: Infinity, // Versions are immutable
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    version: version || null,
    isLoading,
    error,
  };
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Use in test components to verify TanStack integration
 */
export function useDescriptionDebug(entityId: UUID, entityType: EntityType) {
  const main = useDescription(entityId, entityType);

  return {
    ...main,
    debugInfo: {
      currentVersion: main.currentVersion,
      totalVersions: main.totalVersions,
      versionsCount: main.versions.length,
      hasData: main.content_adf !== null,
      lastModified: main.lastModifiedAt,
    },
  };
}
