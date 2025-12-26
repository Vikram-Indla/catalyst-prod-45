/**
 * Program Code Generation Utilities
 * Generates deterministic codes like DTP-123 from program names
 */

/**
 * Generate prefix from program name
 * - Takes first letter of each word (letters only), uppercase
 * - Max 3 letters, min 2 letters, fallback to 'PRG' if insufficient
 */
export function generatePrefixFromName(name: string): string {
  if (!name || !name.trim()) return 'PRG';

  // Split into words, filter to letters only
  const words = name
    .trim()
    .split(/[\s\-_.,;:!?()[\]{}'"\/\\]+/)
    .filter(w => w.length > 0);

  // Take first letter of each word (letters only)
  const initials = words
    .map(w => {
      const firstLetter = w.match(/[a-zA-Z]/)?.[0];
      return firstLetter?.toUpperCase() || '';
    })
    .filter(l => l.length > 0)
    .slice(0, 3)
    .join('');

  // Ensure we have at least 2 letters
  if (initials.length < 2) {
    // Try to get more letters from the name
    const allLetters = name.toUpperCase().replace(/[^A-Z]/g, '');
    if (allLetters.length >= 2) {
      return allLetters.slice(0, 3);
    }
    return 'PRG';
  }

  return initials;
}

/**
 * Generate a full program code like DTP-123
 * @param prefix - The letter prefix (e.g., 'DTP')
 * @param existingCodes - Array of existing codes to find the next number
 * @returns The new code like 'DTP-1' or 'DTP-2'
 */
export function generateProgramCode(prefix: string, existingCodes: string[]): string {
  // Find all codes with this prefix
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  
  let maxNumber = 0;
  for (const code of existingCodes) {
    const match = code.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `${prefix}-${maxNumber + 1}`;
}

/**
 * Generate a complete program code from a name
 * @param name - The program name
 * @param existingCodes - Array of existing codes in the database
 * @returns The new code like 'DTP-1'
 */
export function generateProgramCodeFromName(name: string, existingCodes: string[]): string {
  const prefix = generatePrefixFromName(name);
  return generateProgramCode(prefix, existingCodes);
}

/**
 * Format program display with code: "CODE — Name"
 */
export function formatProgramWithCode(program: { key: string; name: string }): string {
  return `${program.key} — ${program.name}`;
}

/**
 * Parse a program code into prefix and number
 */
export function parseProgramCode(code: string): { prefix: string; number: number } | null {
  const match = code.match(/^([A-Z]+)-(\d+)$/i);
  if (!match) return null;
  return {
    prefix: match[1].toUpperCase(),
    number: parseInt(match[2], 10),
  };
}
