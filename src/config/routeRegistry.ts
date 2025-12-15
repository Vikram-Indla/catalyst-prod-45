/**
 * Route Registry - Single source of truth for page header metadata
 * 
 * All routes in scope inherit their breadcrumb/title from this registry.
 * Pages should NOT hardcode their own breadcrumbs.
 */

export interface RouteConfig {
  section: string;
  pageTitle: string;
}

/**
 * Route Registry Map
 * Key: route path (use exact paths, dynamic params use :param syntax)
 */
export const ROUTE_REGISTRY: Record<string, RouteConfig> = {
  // Enterprise routes
  '/enterprise/strategy-room': { section: 'ENTERPRISE', pageTitle: 'Strategy Room' },
  '/enterprise/snapshots': { section: 'ENTERPRISE', pageTitle: 'Strategic Snapshots' },
  '/enterprise/backlog': { section: 'ENTERPRISE', pageTitle: 'Strategic Backlog' },
  '/enterprise/okr-hub': { section: 'ENTERPRISE', pageTitle: 'OKR Hub' },
  '/enterprise/roadmaps': { section: 'ENTERPRISE', pageTitle: 'Roadmaps' },
  '/enterprise/risks': { section: 'ENTERPRISE', pageTitle: 'Risks' },
  
  // Product routes
  '/product/room': { section: 'PRODUCT', pageTitle: 'Product Room' },
  '/product/capacity': { section: 'PRODUCT', pageTitle: 'Capacity' },
  
  // Industry routes (part of Product)
  '/industry/backlog': { section: 'INDUSTRY', pageTitle: 'Industry Backlog' },
  '/industry/kanban': { section: 'INDUSTRY', pageTitle: 'Industry Kanban' },
  '/industry/roadmaps': { section: 'INDUSTRY', pageTitle: 'Industry Roadmaps' },
};

/**
 * Get route config for a given pathname
 * Falls back to deriving from path segments if not found
 */
export function getRouteConfig(pathname: string): RouteConfig {
  // Direct match
  if (ROUTE_REGISTRY[pathname]) {
    return ROUTE_REGISTRY[pathname];
  }

  // Check pattern matches (for dynamic routes like /program/:programId/...)
  for (const [pattern, config] of Object.entries(ROUTE_REGISTRY)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(pathname)) {
        return config;
      }
    }
  }

  // Fallback: derive from path segments
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { section: 'HOME', pageTitle: 'Dashboard' };
  }

  const section = segments[0].toUpperCase();
  const lastSegment = segments[segments.length - 1];
  const pageTitle = lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { section, pageTitle };
}
