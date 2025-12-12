/**
 * Program & Project Key Utilities
 * Handles canonical 3-letter key extraction, validation, and auto-generation
 */

export const DEFAULT_PROGRAM_ID = '00000000-0000-0000-0000-000000000001';

// Stop words to ignore when generating key suggestions
const STOP_WORDS = new Set([
  'OF', 'AND', 'THE', 'FOR', 'TO', 'IN', 'ON', 'A', 'AN', 'AL', 'EL', 'BIN', 'BINT', 'IBN'
]);

export interface KeyBindingResult {
  key: string | null;
  sourceField: string;
  isValid: boolean;
}

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
 * Get the canonical 3-letter key for a program with source field info
 */
export function getCanonicalProgramKeyWithSource(program: { 
  key?: string | null; 
  short_key?: string | null;
  key3?: string | null;
  canonical_key?: string | null;
  id?: string;
  name?: string;
}): KeyBindingResult {
  // Default program has no key displayed
  if (isDefaultProgram(program)) {
    return { key: null, sourceField: 'default', isValid: true };
  }

  // Check explicit 3-letter key fields in priority order
  if (isThreeLetterKey(program.key)) {
    return { key: program.key!, sourceField: 'key', isValid: true };
  }
  if (isThreeLetterKey(program.short_key)) {
    return { key: program.short_key!, sourceField: 'short_key', isValid: true };
  }
  if (isThreeLetterKey(program.key3)) {
    return { key: program.key3!, sourceField: 'key3', isValid: true };
  }
  if (isThreeLetterKey(program.canonical_key)) {
    return { key: program.canonical_key!, sourceField: 'canonical_key', isValid: true };
  }

  // Fallback: derive 3-letter key from first 3 letters of existing key
  if (program.key && program.key.length >= 3) {
    const derived = program.key.slice(0, 3).toUpperCase();
    if (isThreeLetterKey(derived)) {
      return { key: derived, sourceField: 'key (derived)', isValid: true };
    }
  }

  // Cannot derive valid key
  return { key: null, sourceField: 'none', isValid: false };
}

/**
 * Get the canonical 3-letter key for a project with source field info
 */
export function getCanonicalProjectKeyWithSource(project: { 
  key?: string | null; 
  short_key?: string | null;
  key3?: string | null;
  canonical_key?: string | null;
  id?: string;
  name?: string;
}): KeyBindingResult {
  // Check explicit 3-letter key fields in priority order
  if (isThreeLetterKey(project.key)) {
    return { key: project.key!, sourceField: 'key', isValid: true };
  }
  if (isThreeLetterKey(project.short_key)) {
    return { key: project.short_key!, sourceField: 'short_key', isValid: true };
  }
  if (isThreeLetterKey(project.key3)) {
    return { key: project.key3!, sourceField: 'key3', isValid: true };
  }
  if (isThreeLetterKey(project.canonical_key)) {
    return { key: project.canonical_key!, sourceField: 'canonical_key', isValid: true };
  }

  // Fallback: derive 3-letter key from first 3 letters of existing key
  if (project.key && project.key.length >= 3) {
    const derived = project.key.slice(0, 3).toUpperCase();
    if (isThreeLetterKey(derived)) {
      return { key: derived, sourceField: 'key (derived)', isValid: true };
    }
  }

  // Cannot derive valid key
  return { key: null, sourceField: 'none', isValid: false };
}

/**
 * Legacy compatibility wrapper - returns just the key string
 */
export function getCanonicalProgramKey(program: Parameters<typeof getCanonicalProgramKeyWithSource>[0]): string | null {
  return getCanonicalProgramKeyWithSource(program).key;
}

/**
 * Legacy compatibility wrapper - returns just the key string
 */
export function getCanonicalProjectKey(project: Parameters<typeof getCanonicalProjectKeyWithSource>[0]): string | null {
  return getCanonicalProjectKeyWithSource(project).key;
}

/**
 * Format program display label for dropdowns/selectors
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

  return program.name;
}

/**
 * Log key binding diagnostic info (dev/admin only)
 */
const loggedPrograms = new Set<string>();
const loggedProjects = new Set<string>();

export function logProgramKeyBinding(program: {
  id: string;
  name: string;
  key?: string | null;
  short_key?: string | null;
  key3?: string | null;
  canonical_key?: string | null;
}): void {
  if (loggedPrograms.has(program.id)) return;
  loggedPrograms.add(program.id);

  const result = getCanonicalProgramKeyWithSource(program);
  const legacyKey = program.key && !isThreeLetterKey(program.key) ? program.key : undefined;

  if (!result.isValid && !isDefaultProgram(program)) {
    console.error(
      `[KeyBinding][ERROR] Missing 3-letter key for Program="${program.name}" id=${program.id}. Migration incomplete.`
    );
  } else {
    console.log(
      `[KeyBinding] Program="${program.name}" id=${program.id} canonicalKey=${result.key || 'null'} sourceField=${result.sourceField}${legacyKey ? ` legacyKey=${legacyKey}` : ''}`
    );
  }
}

export function logProjectKeyBinding(project: {
  id: string;
  name: string;
  key?: string | null;
  short_key?: string | null;
  key3?: string | null;
  canonical_key?: string | null;
  program_id?: string | null;
  programs?: { id?: string; name?: string; key?: string | null } | null;
}): void {
  if (loggedProjects.has(project.id)) return;
  loggedProjects.add(project.id);

  const projectResult = getCanonicalProjectKeyWithSource(project);
  const programResult = project.programs ? getCanonicalProgramKeyWithSource(project.programs) : null;
  
  const legacyProjectKey = project.key && !isThreeLetterKey(project.key) ? project.key : undefined;
  const legacyProgramKey = project.programs?.key && !isThreeLetterKey(project.programs.key) ? project.programs.key : undefined;

  if (!projectResult.isValid) {
    console.error(
      `[KeyBinding][ERROR] Missing 3-letter key for Project="${project.name}" id=${project.id}. Migration incomplete.`
    );
  }
  if (programResult && !programResult.isValid && project.programs && !isDefaultProgram(project.programs)) {
    console.error(
      `[KeyBinding][ERROR] Missing 3-letter key for Program="${project.programs.name}" id=${project.programs.id} used by Project="${project.name}".`
    );
  }

  console.log(
    `[KeyBinding] Project="${project.name}" id=${project.id} canonicalProjectKey=${projectResult.key || 'null'} projectSourceField=${projectResult.sourceField} canonicalProgramKey=${programResult?.key || 'null'} programSourceField=${programResult?.sourceField || 'n/a'} programId=${project.program_id || 'null'}${legacyProjectKey ? ` legacyProjectKey=${legacyProjectKey}` : ''}${legacyProgramKey ? ` legacyProgramKey=${legacyProgramKey}` : ''}`
  );
}

// ============================================================
// STYLE A: Initials-First Key Suggestion Algorithm
// ============================================================

/**
 * Generate a 3-letter key suggestion from a name using STYLE A (Initials-first)
 */
export function generateKeyFromName(name: string): string {
  if (!name || !name.trim()) return 'AAA';

  // Normalize and split into words
  const words = name
    .trim()
    .toUpperCase()
    .split(/[\s\-_.,;:!?()[\]{}'"\/\\]+/)
    .filter(w => w.length > 0 && !STOP_WORDS.has(w));

  // Take first letter of up to 3 significant words
  let initials = words.slice(0, 3).map(w => w[0]).join('');

  // If we have fewer than 3 initials, pad with additional letters from the name
  if (initials.length < 3) {
    const allLetters = name.toUpperCase().replace(/[^A-Z]/g, '');
    const usedLetters = new Set(initials.split(''));
    
    for (const char of allLetters) {
      if (initials.length >= 3) break;
      if (!usedLetters.has(char)) {
        initials += char;
        usedLetters.add(char);
      }
    }

    // If still not enough, just take any remaining letters
    for (const char of allLetters) {
      if (initials.length >= 3) break;
      initials += char;
    }
  }

  // Ensure exactly 3 letters, pad with 'A' if needed
  initials = initials.slice(0, 3).padEnd(3, 'A');

  return initials;
}

/**
 * Generate a unique 3-letter key that doesn't conflict with existing keys
 */
export function generateUniqueKey(name: string, existingKeys: Set<string>): string {
  const baseKey = generateKeyFromName(name);
  
  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }

  // Try varying the 3rd letter
  const first2 = baseKey.slice(0, 2);
  for (let c = 65; c <= 90; c++) { // A-Z
    const candidate = first2 + String.fromCharCode(c);
    if (!existingKeys.has(candidate)) {
      return candidate;
    }
  }

  // Try varying the 2nd and 3rd letters
  const first1 = baseKey[0];
  for (let c2 = 65; c2 <= 90; c2++) {
    for (let c3 = 65; c3 <= 90; c3++) {
      const candidate = first1 + String.fromCharCode(c2) + String.fromCharCode(c3);
      if (!existingKeys.has(candidate)) {
        return candidate;
      }
    }
  }

  // Full scan AAA-ZZZ
  for (let c1 = 65; c1 <= 90; c1++) {
    for (let c2 = 65; c2 <= 90; c2++) {
      for (let c3 = 65; c3 <= 90; c3++) {
        const candidate = String.fromCharCode(c1) + String.fromCharCode(c2) + String.fromCharCode(c3);
        if (!existingKeys.has(candidate)) {
          return candidate;
        }
      }
    }
  }

  // Should never reach here (17,576 possible keys)
  return 'ZZZ';
}

/**
 * Clear logged entries (for testing/refresh)
 */
export function clearKeyBindingLogs(): void {
  loggedPrograms.clear();
  loggedProjects.clear();
}
