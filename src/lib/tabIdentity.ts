/** Maps a URL pathname to a canonical Catalyst hub name */
export function deriveHubFromPath(pathname: string): string | undefined {
  const HUB_MAP: [string, string][] = [
    ['/project-hub', 'ProjectHub'],
    ['/release-hub', 'ReleaseHub'],
    ['/releasehub', 'ReleaseHub'],
    ['/incident-hub', 'IncidentHub'],
    ['/task-hub', 'TaskHub'],
    ['/taskhub', 'TaskHub'],
    ['/testhub', 'TestHub'],
    ['/planhub', 'PlanHub'],
    ['/plan-hub', 'PlanHub'],
    ['/producthub', 'ProductHub'],
    ['/product', 'ProductHub'],
    ['/wiki', 'WikiHub'],
    ['/strategy', 'StrategyHub'],
    ['/release', 'ReleaseHub'],
    ['/priorities', 'TaskHub'],
  ];
  for (const [prefix, hub] of HUB_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return hub;
    }
  }
  return undefined;
}

/**
 * Hub slugs that should NEVER appear as a tab title page name.
 * When the last URL segment matches one of these, derivePageFromPath
 * returns a friendly page name (or an empty string for hub landings)
 * rather than leaking "Project-hub" / "Strategyhub" into the browser tab.
 */
const HUB_SLUGS = new Set([
  'project-hub',
  'release-hub',
  'releasehub',
  'incident-hub',
  'task-hub',
  'taskhub',
  'testhub',
  'planhub',
  'plan-hub',
  'producthub',
  'product',
  'wiki',
  'strategy',
  'strategyhub',
  'release',
  'for-you',
]);

/** Friendly names for known top-level slugs (used when the last URL segment IS a hub slug). */
const HUB_LANDING_LABEL: Record<string, string> = {
  'for-you': 'Home',
  'wiki': 'Wiki',
  'strategy': 'Strategy',
  'strategyhub': 'Strategy',
  'project-hub': 'Projects',
  'release-hub': 'Releases',
  'releasehub': 'Releases',
  'release': 'Releases',
  'testhub': 'Tests',
  'incident-hub': 'Incidents',
  'task-hub': 'Tasks',
  'taskhub': 'Tasks',
  'planhub': 'Plan',
  'plan-hub': 'Plan',
  'producthub': 'Products',
  'product': 'Products',
  'priorities': 'Priorities',
  'admin': 'Admin',
  'profile': 'Profile',
};

/** Maps a URL pathname to a human-readable page name (never a hub label). */
export function derivePageFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';

  const last = segments[segments.length - 1];

  // If the last segment IS a hub slug, return the landing label so the tab
  // never shows "Strategyhub" / "Project-hub".
  if (HUB_SLUGS.has(last)) {
    return HUB_LANDING_LABEL[last] ?? '';
  }

  // If the last segment looks like a UUID or issue key (e.g. BAU-5389, MOIM-42),
  // walk back to the most recent non-hub, non-id segment.
  const isIdLike = /^[A-Z]+-\d+$/i.test(last) || /^[0-9a-f]{8}-/.test(last);
  if (isIdLike) {
    for (let i = segments.length - 2; i >= 0; i--) {
      const seg = segments[i];
      if (HUB_SLUGS.has(seg)) continue;
      return formatSegment(seg);
    }
    return '';
  }

  return formatSegment(last);
}

function formatSegment(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
