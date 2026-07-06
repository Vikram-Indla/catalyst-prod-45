/**
 * projectHeaderTitle — route-aware header title for ProjectHeaderChip.
 *
 * Vikram directive 2026-06-11: the project/product header title must be
 * `<KEY> <RouteWord>` (e.g. "BAU Backlog", "BAU Board", "BAU Work",
 * "BAU Filters"), NOT the project name ("Senaei BAU"). The project key is
 * always first; the route word reflects which hub route you are on. The
 * project icon still renders ahead of this text in the chip.
 *
 * Vikram directive 2026-06-14: product-hub routes use bare nouns, same as
 * project-hub (e.g. "INV Backlog", "INV Work"). Matches sidebar nav convention.
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
  sprints: 'Sprints',
  milestones: 'Milestones',
  roadmaps: 'Roadmaps',
};

/** product-hub route segment → display word (bare nouns, mirrors PROJECT_ROUTE_WORD_MAP). */
const PRODUCT_ROUTE_WORD_MAP: Record<string, string> = {
  backlog: 'Backlog',
  board: 'Board',
  boards: 'Board',
  allwork: 'Work',
  list: 'Work',
  filters: 'Filters',
  dashboard: 'Dashboard',
  settings: 'Settings',
  milestones: 'Milestones',
  releases: 'Releases',
  roadmaps: 'Roadmaps',
};

/**
 * Global-hub route segment → display word. Incident-, release-, and testhub
 * routes have NO :key segment (e.g. `/incident-hub/dashboard`, `/testhub/cycles`),
 * so the first segment after the hub IS the route word. Sentence-case labels
 * (ADS), with explicit overrides where bare title-case would read wrong
 * (acronyms, multi-word).
 */
const GLOBAL_HUB_ROUTE_WORD_MAP: Record<string, string> = {
  // incident-hub
  'all-incidents': 'Incidents',
  board: 'Board',
  kanban: 'Kanban',
  filters: 'Filters',
  timeline: 'Timeline',
  dashboard: 'Dashboard',
  work: 'Work',
  analytics: 'Analytics',
  insights: 'Insights',
  reports: 'Reports',
  'committee-queue': 'Committee queue',
  backlog: 'Backlog',
  // release-hub
  overview: 'Dashboard',
  releases: 'Releases',
  'releases-management': 'Releases',
  'release-kanban': 'Board',
  'all-releases': 'Releases',
  'production-events': 'Production events',
  calendar: 'Calendar',
  changes: 'Changes',
  'sop-templates': 'SOP templates',
  'sign-off-queue': 'Sign-off queue',
  'freeze-windows': 'Freeze windows',
  settings: 'Settings',
  'command-center': 'Command center',
  compare: 'Compare',
  triage: 'Triage',
  // testhub
  'my-work': 'My work',
  repository: 'Test repository',
  cycles: 'Test cycles',
  sets: 'Test sets',
  defects: 'Defects',
  traceability: 'Traceability',
};

/** Sentence-case an unknown segment: hyphens → spaces, capitalise first letter only. */
function sentenceCaseSegment(seg: string): string {
  const s = seg.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Derive the route word from a hub pathname.
 * Matches `/project-hub/:key/<segment>`, `/product-hub/:key/<segment>`, and the
 * global hubs `/incident-hub/<segment>`, `/release-hub/<segment>`, and
 * `/testhub/<segment>` (no :key).
 * Product-hub routes use bare nouns (same map shape as project-hub).
 * Returns null when the pathname is not a hub route or has no segment
 * after the key/hub (e.g. the bare `/project-hub/:key` or `/incident-hub`).
 */

/** STRATA hub route words — /strata/<segment> (no :key). */
const STRATA_ROUTE_WORD_MAP: Record<string, string> = {
  strategy: 'Strategy room',
  scorecards: 'Scorecards',
  kpis: 'KPI library',
  execution: 'Execution',
  portfolio: 'Portfolio & VMO',
  data: 'Data pipeline',
  reviews: 'Reviews & decisions',
  admin: 'Administration',
};

export function deriveRouteWord(pathname: string): string | null {
  // STRATA global hub — /strata root is "Command center"; /strata/<seg> maps.
  if (pathname === '/strata' || pathname === '/strata/') return 'Command center';
  const st = pathname.match(/\/strata\/([^/?#]+)/);
  if (st) {
    const seg = st[1].toLowerCase();
    return STRATA_ROUTE_WORD_MAP[seg] ?? sentenceCaseSegment(seg);
  }
  // Global hubs first — no :key segment between hub and route word.
  const g = pathname.match(/\/(?:(incident|release)-hub|(testhub))\/([^/?#]+)/);
  if (g) {
    const seg = g[3].toLowerCase();
    return GLOBAL_HUB_ROUTE_WORD_MAP[seg] ?? sentenceCaseSegment(seg);
  }
  const m = pathname.match(/\/(project|product)-hub\/[^/]+\/([^/?#]+)/);
  if (!m) return null;
  const [, hubType, rawSeg] = m;
  const seg = rawSeg.toLowerCase();
  if (hubType === 'product') {
    return PRODUCT_ROUTE_WORD_MAP[seg] ?? sentenceCaseSegment(seg);
  }
  return PROJECT_ROUTE_WORD_MAP[seg] ?? sentenceCaseSegment(seg);
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
