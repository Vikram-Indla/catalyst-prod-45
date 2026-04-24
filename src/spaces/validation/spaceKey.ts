// ============================================================================
// src/spaces/validation/spaceKey.ts
// Pure validators for the project (space) key.
// ----------------------------------------------------------------------------
// Brief contract:
//  - alphanumeric A–Z / 0–9 only
//  - length ≥ 1, ≤ 255
//  - case-sensitive on the wire; UI normalises to upper-case for display
// ============================================================================

const SPACE_KEY_PATTERN = /^[A-Za-z0-9]+$/;
const SPACE_KEY_MAX_LENGTH = 255;

export interface SpaceKeyValidationResult {
  ok: boolean;
  message?: string;
}

/** Quick boolean check used inside reducers / disabled-state computations. */
export function isValidSpaceKey(key: string): boolean {
  return validateSpaceKeyFormat(key).ok;
}

/** Detailed result with a UI-ready error message. */
export function validateSpaceKeyFormat(key: string): SpaceKeyValidationResult {
  if (!key) {
    return { ok: false, message: 'Project key is required' };
  }
  if (key.length > SPACE_KEY_MAX_LENGTH) {
    return { ok: false, message: `Project key must be ${SPACE_KEY_MAX_LENGTH} characters or fewer` };
  }
  if (!SPACE_KEY_PATTERN.test(key)) {
    return { ok: false, message: 'Project key must contain only letters and numbers' };
  }
  return { ok: true };
}

/** UI helper — strip disallowed characters as the user types. */
export function normaliseSpaceKeyInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, SPACE_KEY_MAX_LENGTH);
}

/** Suggest a key from a project name (best-effort, deterministic). */
export function deriveSpaceKeyFromName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  // Two characters minimum keeps ambiguity low; cap at 6 for an issue prefix.
  return letters.slice(0, 6) || letters.slice(0, 4) || letters.slice(0, 2);
}

export const SPACE_KEY_LIMITS = {
  pattern: SPACE_KEY_PATTERN,
  maxLength: SPACE_KEY_MAX_LENGTH,
};
