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
  // Enterprise routes - Core
  '/enterprise/strategy-room': { section: 'ENTERPRISE', pageTitle: 'Strategy Room' },
  '/enterprise/snapshots': { section: 'ENTERPRISE', pageTitle: 'Strategic Snapshots' },
  '/enterprise/backlog': { section: 'ENTERPRISE', pageTitle: 'Strategic Backlog' },
  '/enterprise/okr-hub': { section: 'ENTERPRISE', pageTitle: 'OKR Hub' },
  '/enterprise/okr-tree': { section: 'ENTERPRISE', pageTitle: 'Objective Tree' },
  '/enterprise/okr-heatmap': { section: 'ENTERPRISE', pageTitle: 'OKR Heatmap' },
  '/enterprise/roadmaps': { section: 'ENTERPRISE', pageTitle: 'Roadmaps' },
  '/enterprise/risks': { section: 'ENTERPRISE', pageTitle: 'Risks' },
  '/enterprise/work-tree': { section: 'ENTERPRISE', pageTitle: 'Work Tree' },
  '/enterprise/kanban-boards': { section: 'ENTERPRISE', pageTitle: 'Kanban Boards' },
  
  // Enterprise routes - Items
  '/enterprise/ideation': { section: 'ENTERPRISE', pageTitle: 'Ideation' },
  '/enterprise/impediments': { section: 'ENTERPRISE', pageTitle: 'Impediments' },
  '/enterprise/epics': { section: 'ENTERPRISE', pageTitle: 'Epics' },
  '/enterprise/features': { section: 'ENTERPRISE', pageTitle: 'Features' },
  '/enterprise/stories': { section: 'ENTERPRISE', pageTitle: 'Stories' },
  '/enterprise/defects': { section: 'ENTERPRISE', pageTitle: 'Defects' },
  '/enterprise/tasks': { section: 'ENTERPRISE', pageTitle: 'Tasks' },
  '/enterprise/objectives': { section: 'ENTERPRISE', pageTitle: 'Objectives' },
  '/enterprise/dependencies': { section: 'ENTERPRISE', pageTitle: 'Dependencies' },
  '/enterprise/sprints': { section: 'ENTERPRISE', pageTitle: 'Sprints' },
  '/enterprise/program-increments': { section: 'ENTERPRISE', pageTitle: 'Program Increments' },
  '/enterprise/release-vehicles': { section: 'ENTERPRISE', pageTitle: 'Release Vehicles' },
  '/enterprise/success-criteria': { section: 'ENTERPRISE', pageTitle: 'Success Criteria' },
  '/enterprise/skills-inventory': { section: 'ENTERPRISE', pageTitle: 'Skills Inventory' },
  
  // Enterprise routes - Reports
  '/enterprise/reports/demand-capacity': { section: 'ENTERPRISE', pageTitle: 'Capacity Planning' },
  '/enterprise/reports/work-tree': { section: 'ENTERPRISE', pageTitle: 'Work Tree Report' },
  '/enterprise/reports/assessment': { section: 'ENTERPRISE', pageTitle: 'Assessment' },
  '/enterprise/reports/cumulative-effort': { section: 'ENTERPRISE', pageTitle: 'Cumulative Effort' },
  '/enterprise/reports/strategic-balancing': { section: 'ENTERPRISE', pageTitle: 'Strategic Balancing' },
  
  // Product routes
  '/product/room': { section: 'PRODUCT', pageTitle: 'Product Room' },
  '/product/capacity': { section: 'PRODUCT', pageTitle: 'Capacity' },
  
  // Industry routes (part of Product)
  '/industry/backlog': { section: 'INDUSTRY', pageTitle: 'Industry Backlog' },
  '/industry/kanban': { section: 'INDUSTRY', pageTitle: 'Industry Kanban' },
  '/industry/roadmaps': { section: 'INDUSTRY', pageTitle: 'Industry Roadmaps' },
  
  // Program routes
  '/program/:programId/room': { section: 'PROGRAM', pageTitle: 'Program Room' },
  '/program/:programId/epic-backlog': { section: 'PROGRAM', pageTitle: 'Epic Backlog' },
  '/program/:programId/features': { section: 'PROGRAM', pageTitle: 'Features' },
  '/program/:programId/roadmaps': { section: 'PROGRAM', pageTitle: 'Roadmaps' },
  '/program/:programId/dependencies': { section: 'PROGRAM', pageTitle: 'Dependencies' },
  '/program/:programId/epic-balancing': { section: 'PROGRAM', pageTitle: 'Epic Balancing' },
  '/program/:programId/objectives-tree': { section: 'PROGRAM', pageTitle: 'Objectives Tree' },
  '/program/:programId/okr-hub': { section: 'PROGRAM', pageTitle: 'OKR Hub' },
  '/program/:programId/forecast': { section: 'PROGRAM', pageTitle: 'Forecast' },
  '/program/:programId/capacity': { section: 'PROGRAM', pageTitle: 'Capacity' },
  '/program/:programId/quarters': { section: 'PROGRAM', pageTitle: 'Quarters' },
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
