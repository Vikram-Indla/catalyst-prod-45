/**
 * parseWorkItemKey — Extract a work item key (e.g., BAU-1234) from raw text, URL, or key string.
 * Supports:
 *   - Direct key: "BAU-1234"
 *   - Browse URL: "https://host/browse/BAU-1234"
 *   - Path URL: "https://host/issue/BAU-1234"
 *   - Whitespace-padded: "  BAU-1234  "
 */

const KEY_PATTERN = /\b([A-Z][A-Z0-9_]+-\d+)\b/;

export function parseWorkItemKey(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct key match
  const match = trimmed.match(KEY_PATTERN);
  if (match) return match[1];

  // Try URL parsing
  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Check last segment for key
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const segMatch = pathParts[i].match(KEY_PATTERN);
      if (segMatch) return segMatch[1];
    }
  } catch {
    // Not a URL, already tried direct match
  }

  return null;
}

/**
 * Check if a string looks like a work item key
 */
export function isWorkItemKey(input: string): boolean {
  return KEY_PATTERN.test(input.trim());
}
