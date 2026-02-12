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
  // Strategy Hub routes - Core (no section breadcrumb per Command Center header standard)
  '/strategyhub/strategy-room': { section: '', pageTitle: 'Strategy Room' },
  '/strategyhub/snapshots': { section: '', pageTitle: 'Strategic Snapshots' },
  '/strategyhub/backlog': { section: '', pageTitle: 'Strategic Backlog' },
  '/strategyhub/okr-hub': { section: '', pageTitle: 'Objectives Tree' },
  '/strategyhub/okr-tree': { section: '', pageTitle: 'Objective Tree' },
  '/strategyhub/okr-heatmap': { section: '', pageTitle: 'OKR Heatmap' },
  '/strategyhub/roadmaps': { section: '', pageTitle: 'Enterprise Roadmap' },
  '/strategyhub/risks': { section: '', pageTitle: 'Risks' },
  '/strategyhub/capacity': { section: '', pageTitle: 'Capacity Planner' },
  '/strategyhub/budget-planner': { section: '', pageTitle: 'Budget Planner' },
  '/enterprise/work-tree': { section: '', pageTitle: 'Work Tree' },
  '/enterprise/kanban-boards': { section: '', pageTitle: 'Kanban Boards' },
  
  // Strategy Hub routes - Items (legacy /enterprise paths)
  '/enterprise/ideation': { section: '', pageTitle: 'Ideation' },
  '/enterprise/impediments': { section: '', pageTitle: 'Impediments' },
  '/enterprise/epics': { section: '', pageTitle: 'Epics' },
  '/enterprise/features': { section: '', pageTitle: 'Features' },
  '/enterprise/stories': { section: '', pageTitle: 'Stories' },
  '/enterprise/defects': { section: '', pageTitle: 'Defects' },
  '/enterprise/tasks': { section: '', pageTitle: 'Tasks' },
  '/enterprise/objectives': { section: '', pageTitle: 'Objectives' },
  '/enterprise/dependencies': { section: '', pageTitle: 'Dependencies' },
  '/enterprise/sprints': { section: '', pageTitle: 'Sprints' },
  '/enterprise/program-increments': { section: '', pageTitle: 'Program Increments' },
  '/enterprise/release-vehicles': { section: '', pageTitle: 'Release Vehicles' },
  '/enterprise/success-criteria': { section: '', pageTitle: 'Success Criteria' },
  '/enterprise/skills-inventory': { section: '', pageTitle: 'Skills Inventory' },
  
  // Strategy Hub routes - Reports
  '/enterprise/reports/demand-capacity': { section: '', pageTitle: 'Capacity Planning' },
  '/enterprise/reports/work-tree': { section: '', pageTitle: 'Work Tree Report' },
  '/enterprise/reports/assessment': { section: '', pageTitle: 'Assessment' },
  '/enterprise/reports/cumulative-effort': { section: '', pageTitle: 'Cumulative Effort' },
  '/enterprise/reports/strategic-balancing': { section: '', pageTitle: 'Strategic Balancing' },
  
  // Product routes
  '/product/room': { section: 'PRODUCT', pageTitle: 'Product Room' },
  '/product/capacity': { section: 'PRODUCT', pageTitle: 'Capacity' },
  '/product/requirement-assist': { section: 'PRODUCT', pageTitle: 'Requirement Assist' },
  
  // Product routes (Industry paths)
  '/industry/backlog': { section: 'PRODUCT', pageTitle: 'Product Backlog' },
  '/industry/kanban': { section: 'PRODUCT', pageTitle: 'Product Kanban' },
  '/industry/table': { section: 'PRODUCT', pageTitle: 'Demand Table' },
  '/industry/roadmaps': { section: 'PRODUCT', pageTitle: 'Product Roadmap' },
  
  // Ideas routes
  '/industry/ideas': { section: 'IDEAS', pageTitle: 'Ideas Hub' },
  '/industry/ideas/all': { section: 'IDEAS', pageTitle: 'All Ideas' },
  '/industry/ideas/initiatives': { section: 'IDEAS', pageTitle: 'Initiatives' },
  '/industry/ideas/initiatives/:id': { section: 'IDEAS', pageTitle: 'Initiative Details' },
  '/industry/ideas/matrix': { section: 'IDEAS', pageTitle: 'Priority Matrix' },
  '/industry/ideas/scoring': { section: 'IDEAS', pageTitle: 'Scoring Queue' },
  '/industry/ideas/submit': { section: 'IDEAS', pageTitle: 'Submit Idea' },
  '/industry/ideas/analytics': { section: 'IDEAS', pageTitle: 'Analytics' },
  '/industry/ideas/ai-insights': { section: 'IDEAS', pageTitle: 'AI Insights' },
  '/industry/ideas/admin': { section: 'IDEAS', pageTitle: 'Settings' },
  '/industry/ideas/:id': { section: 'IDEAS', pageTitle: 'Idea Details' },
  
  // Spaces routes
  '/spaces': { section: 'SPACES', pageTitle: 'Spaces Directory' },
  '/spaces/backlog': { section: 'SPACES', pageTitle: 'Spaces Backlog' },
  '/spaces/:spaceId/summary': { section: 'SPACES', pageTitle: 'Summary' },
  '/spaces/:spaceId/board': { section: 'SPACES', pageTitle: 'Board' },
  '/spaces/:spaceId/backlog': { section: 'SPACES', pageTitle: 'Backlog' },
  '/spaces/:spaceId/timeline': { section: 'SPACES', pageTitle: 'Timeline' },
  '/spaces/:spaceId/settings': { section: 'SPACES', pageTitle: 'Settings' },
  
  // Program routes
  '/program/:programId/room': { section: 'PROGRAM', pageTitle: 'Program Room' },
  '/program/:programId/epic-backlog': { section: 'PROGRAM', pageTitle: 'Epic Backlog' },
  '/program/:programId/feature-backlog': { section: 'PROGRAM', pageTitle: 'Feature Backlog' },
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
