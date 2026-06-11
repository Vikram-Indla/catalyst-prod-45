/**
 * Split a text body into plain-text and @mention parts using a roster of
 * known names as the boundary oracle.
 *
 * Why a roster — not a regex:
 *   `@Maria Garcia Lopez how are you` is ambiguous to any pure regex. Is the
 *   mention "Maria", "Maria Garcia", or "Maria Garcia Lopez"? Capping at N
 *   words (1, 2, 3…) is always wrong for some name. The only deterministic
 *   boundary is whether the candidate substring is an actual person in the
 *   roster. Longest-match against the roster wins, so 3+ word names render
 *   correctly.
 *
 * Fallback:
 *   If no roster entry matches, a single-word `@token` still renders as a
 *   mention pill so unknown / stale handles aren't swallowed silently.
 */

export type MentionPart =
  | { type: 'text'; value: string }
  | { type: 'mention'; raw: string; name: string; userId: string | null };

const BOUNDARY_BEFORE = /\s|[(\[<,;:"']/;
const BOUNDARY_AFTER = /[\s.,;:!?)\]>'"]/;
const FALLBACK_WORD = /^@[A-Za-z][A-Za-z'.-]*/;

/**
 * `roster` is an array of `{ name, userId }` entries. The `name` is the
 * canonical full name (any number of words) and `userId` is the
 * `profiles.id` so each matched mention can be tagged for the canonical
 * `data-mention-id` paint contract.
 */
export interface MentionRosterEntry {
  name: string;
  userId: string | null;
}

export function parseMentions(
  text: string,
  roster: readonly MentionRosterEntry[],
): MentionPart[] {
  // Longest-first so a multi-word name wins over its prefix
  // (`Maria Garcia Lopez` beats `Maria Garcia` beats `Maria`).
  // Dedupe by lowercased name so we don't try two identical candidates.
  const seen = new Set<string>();
  const sorted: MentionRosterEntry[] = [];
  for (const entry of roster) {
    const trimmed = entry?.name?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sorted.push({ name: trimmed, userId: entry.userId ?? null });
  }
  sorted.sort((a, b) => b.name.length - a.name.length);

  const parts: MentionPart[] = [];
  let buffer = '';
  let i = 0;

  const flushText = () => {
    if (buffer.length > 0) {
      parts.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  const isBoundaryBefore = (idx: number): boolean => {
    if (idx === 0) return true;
    return BOUNDARY_BEFORE.test(text[idx - 1]);
  };

  const isBoundaryAfter = (idx: number): boolean => {
    if (idx >= text.length) return true;
    return BOUNDARY_AFTER.test(text[idx]);
  };

  while (i < text.length) {
    if (text[i] === '@' && isBoundaryBefore(i)) {
      let matched: { raw: string; name: string; userId: string | null } | null = null;
      for (const entry of sorted) {
        const slice = text.slice(i + 1, i + 1 + entry.name.length);
        if (
          slice.length === entry.name.length &&
          slice.toLowerCase() === entry.name.toLowerCase() &&
          isBoundaryAfter(i + 1 + entry.name.length)
        ) {
          // Preserve the writer's casing so `@maria garcia` and `@Maria Garcia`
          // both render but as the writer typed them. userId comes from the
          // roster entry — that's what powers the `data-mention-id` paint.
          matched = { raw: `@${slice}`, name: slice, userId: entry.userId };
          break;
        }
      }

      if (matched) {
        flushText();
        parts.push({ type: 'mention', ...matched });
        i += matched.raw.length;
        continue;
      }

      const fallback = text.slice(i).match(FALLBACK_WORD);
      if (fallback) {
        flushText();
        const raw = fallback[0];
        parts.push({ type: 'mention', raw, name: raw.slice(1), userId: null });
        i += raw.length;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }

  flushText();
  return parts;
}
