/**
 * UUID Assertion Utility for Test Management Module
 * Prevents display keys from being sent to database operations
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

/**
 * Assert that a value is a valid UUID.
 * In development, logs a warning if not.
 * Returns true if valid, false if not.
 * 
 * @param value - The value to check
 * @param label - A descriptive label for error messages (e.g., "caseId", "testCase.id")
 * @returns boolean indicating if value is a valid UUID
 */
export function assertUuid(value: string | null | undefined, label: string): boolean {
  if (!value) {
    console.error(`[UUID Assertion Failed] ${label} is null or undefined`);
    return false;
  }
  
  if (!UUID_REGEX.test(value)) {
    console.error(
      `[UUID Assertion Failed] ${label} = "${value}" is NOT a valid UUID. ` +
      `This looks like a display key. DB operations require the actual UUID.`
    );
    return false;
  }
  
  return true;
}

/**
 * Guard function that throws if value is not a valid UUID.
 * Use this in critical paths where invalid UUID should halt execution.
 * 
 * @param value - The value to check
 * @param label - A descriptive label for error messages
 * @throws Error if value is not a valid UUID
 */
export function requireUuid(value: string | null | undefined, label: string): asserts value is string {
  if (!assertUuid(value, label)) {
    throw new Error(`${label} must be a valid UUID, got: "${value}"`);
  }
}
