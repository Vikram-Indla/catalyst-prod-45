/**
 * LexoRank-like lexicographic ordering system
 * Provides conflict-safe ranking for board items
 */

const MIN_CHAR = '0';
const MAX_CHAR = 'z';
const MID_CHAR = 'U';
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate an initial rank for the first item
 */
export function generateInitialRank(): string {
  return MID_CHAR.repeat(6);
}

/**
 * Generate a rank between two existing ranks
 * If before is null, generates a rank before the first item
 * If after is null, generates a rank after the last item
 */
export function generateRankBetween(before: string | null, after: string | null): string {
  if (!before && !after) {
    return generateInitialRank();
  }

  if (!before) {
    return decrementRank(after!);
  }

  if (!after) {
    return incrementRank(before);
  }

  return findMiddleRank(before, after);
}

/**
 * Generate a rank before the given rank
 */
function decrementRank(rank: string): string {
  const chars = rank.split('');
  let i = chars.length - 1;

  while (i >= 0) {
    const charIndex = ALPHABET.indexOf(chars[i]);
    if (charIndex > 0) {
      chars[i] = ALPHABET[charIndex - 1];
      // Fill remaining positions with middle values
      for (let j = i + 1; j < chars.length; j++) {
        chars[j] = MID_CHAR;
      }
      return chars.join('');
    }
    chars[i] = MAX_CHAR;
    i--;
  }

  // Need to prepend a character
  return MIN_CHAR + MID_CHAR.repeat(rank.length);
}

/**
 * Generate a rank after the given rank
 */
function incrementRank(rank: string): string {
  const chars = rank.split('');
  let i = chars.length - 1;

  while (i >= 0) {
    const charIndex = ALPHABET.indexOf(chars[i]);
    if (charIndex < ALPHABET.length - 1) {
      chars[i] = ALPHABET[charIndex + 1];
      // Fill remaining positions with middle values
      for (let j = i + 1; j < chars.length; j++) {
        chars[j] = MID_CHAR;
      }
      return chars.join('');
    }
    chars[i] = MIN_CHAR;
    i--;
  }

  // Need to append a character
  return rank + MID_CHAR;
}

/**
 * Find a rank between two ranks
 */
function findMiddleRank(before: string, after: string): string {
  // Normalize lengths
  const maxLen = Math.max(before.length, after.length);
  const paddedBefore = before.padEnd(maxLen, MIN_CHAR);
  const paddedAfter = after.padEnd(maxLen, MAX_CHAR);

  const result: string[] = [];
  
  for (let i = 0; i < maxLen; i++) {
    const beforeIndex = ALPHABET.indexOf(paddedBefore[i]);
    const afterIndex = ALPHABET.indexOf(paddedAfter[i]);

    if (beforeIndex < afterIndex - 1) {
      // There's room between these characters
      const midIndex = Math.floor((beforeIndex + afterIndex) / 2);
      result.push(ALPHABET[midIndex]);
      // Fill rest with middle values
      while (result.length < maxLen) {
        result.push(MID_CHAR);
      }
      return result.join('');
    } else if (beforeIndex === afterIndex) {
      // Same character, continue to next position
      result.push(paddedBefore[i]);
    } else {
      // Adjacent characters (afterIndex = beforeIndex + 1)
      // Use the before character and continue
      result.push(paddedBefore[i]);
    }
  }

  // Need to add a character at the end
  return paddedBefore + MID_CHAR;
}

/**
 * Compare two ranks
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareRanks(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Generate ranks for rebalancing a list
 * Used when ranks get too close together
 */
export function generateBalancedRanks(count: number): string[] {
  const ranks: string[] = [];
  const step = Math.floor(ALPHABET.length / (count + 1));
  
  for (let i = 1; i <= count; i++) {
    const firstChar = ALPHABET[Math.min(step * i, ALPHABET.length - 1)];
    ranks.push(firstChar + MID_CHAR.repeat(5));
  }
  
  return ranks;
}

/**
 * Check if ranks need rebalancing (too close together)
 */
export function needsRebalancing(before: string | null, after: string | null): boolean {
  if (!before || !after) return false;
  
  // If the ranks are longer than 12 characters, consider rebalancing
  const middle = generateRankBetween(before, after);
  return middle.length > 12;
}

/**
 * Batch generate ranks for inserting multiple items
 */
export function generateRanksForInsert(
  before: string | null,
  after: string | null,
  count: number
): string[] {
  const ranks: string[] = [];
  let prevRank = before;
  
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const nextRank = isLast ? after : null;
    const newRank = generateRankBetween(prevRank, nextRank);
    ranks.push(newRank);
    prevRank = newRank;
  }
  
  return ranks;
}
