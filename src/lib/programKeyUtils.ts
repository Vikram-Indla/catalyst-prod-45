/**
 * Program Key Utilities
 * Handles canonical 3-letter key extraction and validation for programs
 */

export const DEFAULT_PROGRAM_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Validates if a key is exactly 3 uppercase letters (A-Z)
 */
export function isThreeLetterKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return /^[A-Z]{3}$/.test(key);
}

/**
 * Check if a program is the Default program
 */
export function isDefaultProgram(program: { id?: string; name?: string }): boolean {
  return program.id === DEFAULT_PROGRAM_ID || 
         program.name?.toLowerCase() === 'default';
}

/**
 * Get the canonical 3-letter key for a program
 * Returns first 3 letters of existing key as uppercase if key is longer
 * Returns null if cannot derive a valid 3-letter key
 */
export function getCanonicalProgramKey(program: { 
  key?: string | null; 
  short_key?: string | null;
  key3?: string | null;
  canonical_key?: string | null;
  id?: string;
  name?: string;
}): string | null {
  // Default program has no key displayed
  if (isDefaultProgram(program)) {
    return null;
  }

  // Check explicit 3-letter key fields first
  if (isThreeLetterKey(program.key)) {
    return program.key!;
  }
  if (isThreeLetterKey(program.short_key)) {
    return program.short_key!;
  }
  if (isThreeLetterKey(program.key3)) {
    return program.key3!;
  }
  if (isThreeLetterKey(program.canonical_key)) {
    return program.canonical_key!;
  }

  // Fallback: derive 3-letter key from first 3 letters of existing key
  if (program.key && program.key.length >= 3) {
    const derived = program.key.slice(0, 3).toUpperCase();
    if (isThreeLetterKey(derived)) {
      return derived;
    }
  }

  // Cannot derive valid key - log warning
  console.warn(
    `Program key migration incomplete: cannot find 3-letter key for program "${program.name || 'unknown'}". ` +
    `Current key: "${program.key}"`
  );
  return null;
}

/**
 * Format program display label for dropdowns/selectors
 * - Default program: "Default" (no key)
 * - Other programs: "Name (ABC)" where ABC is 3-letter key
 */
export function formatProgramLabel(program: { 
  id?: string; 
  name: string; 
  key?: string | null;
  short_key?: string | null;
  key3?: string | null;
  canonical_key?: string | null;
}): string {
  if (isDefaultProgram(program)) {
    return 'Default';
  }

  const canonicalKey = getCanonicalProgramKey(program);
  if (canonicalKey) {
    return `${program.name} (${canonicalKey})`;
  }

  // No valid key - return name only (edge case)
  return program.name;
}
