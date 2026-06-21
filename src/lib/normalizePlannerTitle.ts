/**
 * Normalizes a work item title for fuzzy duplicate detection.
 * Strips punctuation, lowercases, collapses whitespace.
 */
export function normalizePlannerTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
