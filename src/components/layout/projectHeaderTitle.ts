/**
 * projectHeaderTitle — route-aware header title for ProjectHeaderChip.
 *
 * Vikram directive 2026-06-11: the project/product header title must be
 * `<KEY> <RouteWord>` (e.g. "BAU Backlog", "BAU Board", "BAU Work",
 * "BAU Filters"), NOT the project name ("Senaei BAU"). The project key is
 * always first; the route word reflects which hub route you are on. The
 * project icon still renders ahead of this text in the chip.
 *
 * Vikram directive 2026-06-14: product-hub routes prefix "Product" before
 * the route word (e.g. "INV Product Backlog", "INV Product Work").
 *
 * Zero-assumption rule (CLAUDE.md 2026-06-11): when the route is not a
 * recognised hub route, return null so the caller can fall back to the
 * real project name rather than fabricate a word.
 */

/** project-hub route segment → display word. */
const PROJECT_ROUTE_WORD_MAP: Record<string, string> = {
  backlog: 'Backlog',
  board: 'Board',
  boards: 'Board',
  allwork: 'Work',
  list: 'Work',
  filters: 'Filters',
  dashboard: 'Dashboard',
  settings: 'Settings',
  timeline: 'Timeline',
  releases: 'Releases',
  reports: 'Reports',
};

/** product-hub route segment → display word (prefixed "Product"). */
const PRODUCT_ROUTE_WORD_MAP: Record<string, string> = {
  backlog: 'Product Backlog',
  board: 'Product Board',
  boards: 'Product Board',
  allwork: 'Product Work',
  list: 'Product Work',
  filters: 'Product Filters',
  dashboard: 'Product Dashboard',
  settings: 'Settings',
};

/**
 * Derive the route word from a hub pathname.
 * Matches `/project-hub/:key/<segment>` and `/product-hub/:key/<segment>`.
 * Product-hub routes return the word prefixed with "Product" per directive.
 * Returns null when the pathname is not a hub route or has no segment
 * after the key (the bare `/project-hub/:key`).
 */
export function deriveRouteWord(pathname: string): string | null {
  const m = pathname.match(/\/(project|product)-hub\/[^/]+\/([^/?#]+)/);
  if (!m) return null;
  const [, hubType, rawSeg] = m;
  const seg = rawSeg.toLowerCase();
  if (hubType === 'product') {
    return PRODUCT_ROUTE_WORD_MAP[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1));
  }
  return PROJECT_ROUTE_WORD_MAP[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1));
}

/**
 * Build the chip title. `key` is the project/product key (already known —
 * it is the URL :key the chip mounts with). When the route is unrecognised
 * or the key is missing, returns null so the caller falls back to the
 * project name (never a fabricated value).
 */
export function buildProjectHeaderTitle(pathname: string, key: string | null | undefined): string | null {
  const word = deriveRouteWord(pathname);
  if (!word) return null;
  if (!key) return word;
  return `${key} ${word}`;
}
