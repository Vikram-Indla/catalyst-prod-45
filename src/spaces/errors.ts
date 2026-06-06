// ============================================================================
// src/spaces/errors.ts
// Typed error class shared by SpaceService implementations + the wizard.
// ============================================================================

export type SpaceErrorCode =
  | 'VALIDATION_ERROR'
  | 'SPACE_KEY_NOT_UNIQUE'
  | 'HTTP_ERROR'
  | 'UNKNOWN_ERROR';

export interface SpaceErrorDetails {
  /** Field-level validation messages from the server (422). */
  fieldErrors?: Record<string, string>;
  /** HTTP status code if applicable. */
  status?: number;
  /** Raw underlying error for debugging. */
  cause?: unknown;
}

export class SpaceError extends Error {
  readonly code: SpaceErrorCode;
  readonly details: SpaceErrorDetails;

  constructor(code: SpaceErrorCode, message: string, details: SpaceErrorDetails = {}) {
    super(message);
    this.name = 'SpaceError';
    this.code = code;
    this.details = details;
  }

  static validation(message: string, fieldErrors?: Record<string, string>): SpaceError {
    return new SpaceError('VALIDATION_ERROR', message, { fieldErrors, status: 422 });
  }

  static keyNotUnique(key: string): SpaceError {
    return new SpaceError(
      'SPACE_KEY_NOT_UNIQUE',
      `Space key "${key}" is already taken`,
      { status: 409, fieldErrors: { key: 'This key is already in use' } },
    );
  }

  static http(status: number, message: string, cause?: unknown): SpaceError {
    return new SpaceError('HTTP_ERROR', message, { status, cause });
  }

  static unknown(cause: unknown): SpaceError {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new SpaceError('UNKNOWN_ERROR', message || 'Unknown error', { cause });
  }
}

/** Type guard for catch blocks. */
export function isSpaceError(err: unknown): err is SpaceError {
  return err instanceof SpaceError;
}
