/**
 * normalizeEntities — deterministic Catalyst-entity post-pass
 * (CAT-DICTATION-INTELLIGENCE-20260708-001 S1).
 *
 * ASR output writes ticket keys the way they sound: "cat 1234",
 * "CAT dash 1234", "bau-42". This rewrites them to canonical KEY-123 form —
 * but ONLY for keys the workspace actually has (zero-assumption: "meeting
 * 2024" or an unknown "abc 12" is never touched). Pure and synchronous so
 * it can run on every result with no latency cost.
 */

/** Cache the compiled pattern per key-set (keys change rarely). */
let cached: { signature: string; re: RegExp } | null = null;

function buildPattern(projectKeys: string[]): RegExp | null {
  const keys = [...new Set(projectKeys.map((k) => k.trim().toUpperCase()).filter((k) => /^[A-Z][A-Z0-9]{1,9}$/.test(k)))];
  if (!keys.length) return null;
  const signature = keys.sort().join(',');
  if (cached?.signature === signature) return cached.re;
  // "cat 1234" | "cat-1234" | "cat dash 1234" — spoken separators between a
  // known key and its number. Word-bounded so "concat 12" never matches.
  const re = new RegExp(
    `\\b(${keys.join('|')})(?:[\\s-]+|\\s+dash\\s+)(\\d{1,6})\\b`,
    'gi',
  );
  cached = { signature, re };
  return re;
}

export function normalizeEntities(text: string, projectKeys: string[]): string {
  if (!text) return text;
  const re = buildPattern(projectKeys);
  if (!re) return text;
  re.lastIndex = 0;
  return text.replace(re, (_m, key: string, num: string) => `${key.toUpperCase()}-${num}`);
}
