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

/** Maps a URL pathname to a human-readable page name */
export function derivePageFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';
  const last = segments[segments.length - 1];
  return last
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
