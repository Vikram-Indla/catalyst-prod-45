/** Maps a URL pathname to a canonical Catalyst hub name */
export function deriveHubFromPath(pathname: string): string | undefined {
  const HUB_MAP: Record<string, string> = {
    '/strategy': 'StrategyHub',
    '/product': 'ProductHub',
    '/project-hub': 'ProjectHub',
    '/release-hub': 'ReleaseHub',
    '/testhub': 'TestHub',
    '/incident-hub': 'IncidentHub',
    '/task-hub': 'TaskHub',
    '/plan-hub': 'PlanHub',
    '/wiki': 'WikiHub',
  };
  // Match against the first segment(s) of the pathname
  for (const [prefix, hub] of Object.entries(HUB_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return hub;
    }
  }
  return undefined;
}

/** Maps a URL pathname to a human-readable page name */
export function derivePageFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  const last = segments[segments.length - 1];
  return last
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
