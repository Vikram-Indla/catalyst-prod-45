// ============================================================================
// src/spaces/index.ts
// Public surface for the Create Project (Space) feature.
// Importers should ONLY use this entry — internal modules are not part of
// the public contract.
// ============================================================================

export { CreateSpaceModal } from './components/CreateSpaceModal';
export type { CreateSpaceModalProps } from './components/CreateSpaceModal';

export { SpaceServiceProvider, useSpaceService } from './services/SpaceServiceContext';
export { SupabaseProjectService, supabaseProjectService } from './services/SupabaseProjectService';

export type {
  CreateSpaceDraft,
  CreateSpaceRequest,
  CreateSpaceFieldErrors,
  Space,
  SpaceService,
  SpacePurpose,
  SpacePermissionScheme,
  SpaceFeatureFlags,
} from './types';

export { SpaceError, isSpaceError } from './errors';
export type { SpaceErrorCode, SpaceErrorDetails } from './errors';

export {
  validateSpaceKeyFormat,
  isValidSpaceKey,
  normaliseSpaceKeyInput,
  deriveSpaceKeyFromName,
  SPACE_KEY_LIMITS,
} from './validation/spaceKey';

export {
  validateCreateSpaceDraft,
  hasErrors,
  firstErrorField,
  CREATE_SPACE_LIMITS,
} from './validation/createSpace';
