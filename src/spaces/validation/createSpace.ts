// ============================================================================
// src/spaces/validation/createSpace.ts
// Composite synchronous validator for the wizard draft.
// Async uniqueness lives in the service (SpaceService.isKeyUnique).
// ============================================================================

import type { CreateSpaceDraft, CreateSpaceFieldErrors } from '../types';
import { validateSpaceKeyFormat } from './spaceKey';

const NAME_MIN = 2;
const NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;

export function validateCreateSpaceDraft(draft: CreateSpaceDraft): CreateSpaceFieldErrors {
  const errors: CreateSpaceFieldErrors = {};

  // Name
  const name = draft.name.trim();
  if (!name) {
    errors.name = 'Project name is required';
  } else if (name.length < NAME_MIN) {
    errors.name = `Project name must be at least ${NAME_MIN} characters`;
  } else if (name.length > NAME_MAX) {
    errors.name = `Project name must be ${NAME_MAX} characters or fewer`;
  }

  // Key
  const keyResult = validateSpaceKeyFormat(draft.key);
  if (!keyResult.ok && keyResult.message) {
    errors.key = keyResult.message;
  }

  // Purpose — UI guarantees one of three; defensive guard only.
  if (!draft.purpose) {
    errors.purpose = 'Choose a project purpose';
  }

  // Description — optional, but bounded.
  if (draft.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer`;
  }

  // Permission scheme — UI guarantees one of two.
  if (!draft.permissionScheme) {
    errors.permissionScheme = 'Select a permission scheme';
  }

  return errors;
}

/** Convenience predicate for disabling Next/Create buttons. */
export function hasErrors(errors: CreateSpaceFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Order matters — focus the first error in the same order the user reads. */
export const FIELD_ORDER: ReadonlyArray<keyof CreateSpaceDraft> = [
  'name',
  'key',
  'purpose',
  'description',
  'permissionScheme',
  'isPrivate',
  'features',
];

export function firstErrorField(errors: CreateSpaceFieldErrors): keyof CreateSpaceDraft | null {
  for (const field of FIELD_ORDER) {
    if (errors[field]) return field;
  }
  return null;
}

export const CREATE_SPACE_LIMITS = {
  nameMin: NAME_MIN,
  nameMax: NAME_MAX,
  descriptionMax: DESCRIPTION_MAX,
};
