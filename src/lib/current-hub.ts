/**
 * resolveCurrentHub — maps a location pathname to the active hub identity.
 *
 * Used by CatalystHeader to render a hub name beside the Catalyst wordmark
 * (UX-2, Apr 2026). The left cluster previously showed only the product
 * wordmark; Jira shows "Jira · <site name>" alongside the logo so users
 * always know which workspace they're in. Catalyst has one workspace but
 * ten hubs, so we substitute the active hub's label in the same slot.
 *
 * Returns `null` for /for-you, /admin, /auth, and any unknown path so the
 * chip can be suppressed entirely (showing "Home" on /for-you feels
 * redundant next to the wordmark).
 *
 * Order matters — the most specific prefix wins, because routes like
 * `/release-hub/*` share a common ancestor. Keep the ordering stable.
 */
import type { HubKey } from './hub-colors';

export interface HubIdentity {
  key: HubKey;
  label: string;
}

interface HubRoute {
  key: HubKey;
  label: string;
  /** Path prefixes that belong to this hub. Most-specific first. */
  prefixes: readonly string[];
}

const HUB_ROUTES: readonly HubRoute[] = [
  { key: 'strategy', label: 'StrategyHub', prefixes: ['/strategyhub'] },
  { key: 'product',  label: 'ProductHub',  prefixes: ['/producthub', '/product/', '/features'] },
  { key: 'project',  label: 'ProjectHub',  prefixes: ['/project-hub', '/projects/', '/project/'] },
  { key: 'release',  label: 'ReleaseHub',  prefixes: ['/release-hub', '/releasehub', '/releases', '/release'] },
  { key: 'test',     label: 'TestHub',     prefixes: ['/testhub', '/tests'] },
  { key: 'incident', label: 'IncidentHub', prefixes: ['/incident-hub'] },
  { key: 'task',     label: 'TaskHub',     prefixes: ['/taskhub', '/priorities', '/items/tasks'] },
  { key: 'plan',     label: 'PlanHub',     prefixes: ['/planhub'] },
  { key: 'wiki',     label: 'WikiHub',     prefixes: ['/wiki'] },
];

export function resolveCurrentHub(pathname: string): HubIdentity | null {
  for (const route of HUB_ROUTES) {
    for (const prefix of route.prefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?')) {
        return { key: route.key, label: route.label };
      }
      // Bare prefix match without trailing slash (e.g. "/strategyhub" itself)
      if (pathname === prefix.replace(/\/$/, '')) {
        return { key: route.key, label: route.label };
      }
    }
  }
  return null;
}
