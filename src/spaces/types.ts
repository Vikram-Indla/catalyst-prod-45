// ============================================================================
// src/spaces/types.ts
// Domain types for the Create Project (Space) wizard.
// ----------------------------------------------------------------------------
// Naming note: the user-facing terminology in Catalyst is "project" (matches
// the existing /project-hub surface). Internally this module keeps the
// engineering brief's `Space` nomenclature so the SpaceService DI seam stays
// portable across providers (Confluence, Supabase, mock, etc.).
// ============================================================================

/** High-level intent for the new project — drives default features later. */
export type SpacePurpose = 'COLLABORATION' | 'KNOWLEDGE_BASE' | 'CUSTOM';

/** Permission scheme applied at create-time. */
export type SpacePermissionScheme = 'DEFAULT' | 'PRIVATE';

/** Optional feature toggles surfaced in step 3. */
export interface SpaceFeatureFlags {
  enableComments: boolean;
  enableAttachments: boolean;
  enableLikes: boolean;
}

/** The wizard's draft state — every field is "pending validation". */
export interface CreateSpaceDraft {
  name: string;
  key: string;
  purpose: SpacePurpose;
  description: string;
  permissionScheme: SpacePermissionScheme;
  isPrivate: boolean;
  features: SpaceFeatureFlags;
}

/** Payload submitted to the SpaceService — frozen, validated. */
export interface CreateSpaceRequest {
  name: string;
  key: string;
  purpose: SpacePurpose;
  description?: string;
  permissionScheme: SpacePermissionScheme;
  isPrivate: boolean;
  features: SpaceFeatureFlags;
}

/** Server-returned record after a successful create. */
export interface Space {
  id: string;
  name: string;
  key: string;
  purpose: SpacePurpose;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
}

/** Field-level validation results for the wizard. */
export type CreateSpaceFieldErrors = Partial<Record<keyof CreateSpaceDraft, string>>;

/**
 * Service abstraction — UI never talks to Supabase / a backend directly.
 * Adapters implement this interface (SupabaseProjectService, MockSpaceService, …).
 */
export interface SpaceService {
  /**
   * Returns true iff `key` is available (not already taken).
   * Implementations should treat `key` case-insensitively to match server rules.
   */
  isKeyUnique(key: string): Promise<boolean>;

  /**
   * Creates the space. Throws SpaceError on failure.
   *  - SpaceError(VALIDATION_ERROR) for 422 / shape problems
   *  - SpaceError(SPACE_KEY_NOT_UNIQUE) for 409 conflict on `key`
   *  - SpaceError(HTTP_ERROR) for other transport/server errors
   */
  createSpace(req: CreateSpaceRequest): Promise<Space>;
}

/** Default factory for an empty draft — used by the wizard on open. */
export function emptyCreateSpaceDraft(): CreateSpaceDraft {
  return {
    name: '',
    key: '',
    purpose: 'COLLABORATION',
    description: '',
    permissionScheme: 'DEFAULT',
    isPrivate: false,
    features: {
      enableComments: true,
      enableAttachments: true,
      enableLikes: false,
    },
  };
}

/** UI labels for SpacePurpose — kept here so the wizard + review stay in sync. */
export const SPACE_PURPOSE_LABEL: Record<SpacePurpose, string> = {
  COLLABORATION: 'Collaboration',
  KNOWLEDGE_BASE: 'Knowledge base',
  CUSTOM: 'Custom',
};

export const SPACE_PERMISSION_LABEL: Record<SpacePermissionScheme, string> = {
  DEFAULT: 'Default scheme',
  PRIVATE: 'Private scheme',
};
