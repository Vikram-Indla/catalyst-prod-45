/**
 * Workspace Context Configuration
 * Single source of truth for context-aware navigation
 */

export type WorkspaceType = 'home' | 'enterprise' | 'product' | 'program' | 'project' | 'tests' | 'releases' | 'operations' | 'taskhub' | 'testhub' | 'workhub' | 'releasehub';

export interface WorkspaceContext {
  type: WorkspaceType;
  selectedProgramId: string | null;
  selectedProjectId: string | null;
  selectedProductId: string | null;
  programName?: string;
  projectName?: string;
  productName?: string;
}

/**
 * Derive workspace context PURELY from route
 * This is the SINGLE SOURCE OF TRUTH for workspace type
 */
export function deriveWorkspaceType(pathname: string): WorkspaceType {
  
  // WorkHub/ProjectHub module - Jira integration & portfolio management
  if (pathname.startsWith('/workhub') || pathname.startsWith('/projecthub')) {
    return 'workhub';
  }
  
  // TestHub module - Test Case Repository & Execution
  if (pathname.startsWith('/testhub')) {
    return 'testhub';
  }
  
  // Taskhub module - includes /taskhub/* and /aqd/* (AQD is part of Taskhub)
  if (pathname.startsWith('/taskhub') || pathname.startsWith('/aqd')) {
    return 'taskhub';
  }
  
  // Home - includes /for-you which is the main home route
  if (pathname === '/' || pathname === '/home' || pathname === '/for-you') {
    return 'home';
  }
  
  // ReleaseHub module - Release Management
  if (pathname.startsWith('/releasehub')) {
    return 'releasehub';
  }
  
  // Releases & Test Management routes (legacy - being transitioned to releasehub)
  if (pathname.startsWith('/releases')) {
    return 'releases';
  }
  
  // Test Management routes (legacy tests module)
  if (pathname.startsWith('/tests')) {
    return 'tests';
  }
  
  // Operations routes (incidents, changes, etc.)
  if (pathname.startsWith('/release')) {
    return 'operations';
  }
  
  // Enterprise tier routes
  if (pathname.startsWith('/enterprise') || pathname.startsWith('/strategy')) {
    return 'enterprise';
  }
  
  // Product tier routes
  if (pathname.startsWith('/product') || pathname.startsWith('/industry') || pathname.startsWith('/mining')) {
    return 'product';
  }
  
  // Program tier routes - use /program/ singular
  if (pathname.startsWith('/program/')) {
    return 'program';
  }
  
  // Project tier routes - use /programs/ plural (legacy) or /project/ singular
  if (pathname.startsWith('/programs/') || pathname.startsWith('/project/') || pathname.startsWith('/projects/')) {
    return 'project';
  }
  
  // Admin/Settings routes - no nav item should be highlighted
  if (pathname.startsWith('/admin')) {
    return 'home'; // Neutral - won't highlight any specific nav item
  }
  
  // Default to enterprise for other routes
  return 'enterprise';
}

/**
 * Legacy function for backward compatibility
 */
export function deriveWorkspaceContext(
  pathname: string,
  selectedProgramId: string | null,
  selectedProjectId: string | null,
  selectedProductId: string | null
): WorkspaceType {
  return deriveWorkspaceType(pathname);
}

/**
 * Get the active nav item based on workspace context
 */
export function getActiveNavItem(workspaceType: WorkspaceType): string {
  switch (workspaceType) {
    case 'home':
      return 'Home';
    case 'enterprise':
      return 'StrategyHub';
    case 'product':
      return 'ProductHub';
    case 'program':
      return 'Program';
    case 'project':
      return 'Project';
    case 'tests':
      return 'Tests';
    case 'releases':
      return 'Releases';
    case 'releasehub':
      return 'ReleaseHub';
    case 'operations':
      return 'Operations';
    case 'taskhub':
      return 'Taskhub';
    case 'testhub':
      return 'TestHub';
    case 'workhub':
      return 'ProjectHub';
    default:
      return '';
  }
}

/**
 * Get landing route for each workspace type
 * Programs land on Epic Backlog, Projects land on Backlog
 */
export function getProgramLandingRoute(programId: string): string {
  return `/program/${programId}/epic-backlog`;
}

export function getProjectLandingRoute(projectId: string): string {
  return `/projects/${projectId}/work`;
}

/**
 * Navigation configuration by workspace type
 */
export interface SidebarMenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: string;
}

// Project context sidebar menu (simplified per spec)
export const projectSidebarItems: SidebarMenuItem[] = [
  { id: 'work-tree', label: 'Work tree', path: '/work-tree', icon: 'Network' },
  { id: 'dependencies', label: 'Dependencies', path: '/dependencies', icon: 'GitBranch' },
  { id: 'forecast', label: 'Forecast', path: '/forecast', icon: 'Grid3x3' },
  { id: 'capacity', label: 'Capacity', path: '/capacity', icon: 'Users', badge: 'NEW' },
  { id: 'quarters', label: 'Quarters', path: '/quarters', icon: 'Calendar' },
  { id: 'reports', label: 'Reports', path: '/reports-discovery', icon: 'FileText' },
];

// Program context sidebar menu (per spec)
export const programSidebarItems: SidebarMenuItem[] = [
  { id: 'program-room', label: 'Program Room', path: '/program-room', icon: 'LayoutDashboard' },
  { id: 'work-tree', label: 'Work tree', path: '/work-tree', icon: 'Network' },
  { id: 'dependencies', label: 'Dependencies', path: '/dependencies', icon: 'GitBranch' },
  { id: 'roadmaps', label: 'Roadmaps', path: '/roadmaps', icon: 'Map' },
  { id: 'objectives-tree', label: 'Objectives Tree', path: '/objectives-tree', icon: 'Target' },
  { id: 'forecast', label: 'Forecast', path: '/forecast', icon: 'Grid3x3' },
  { id: 'capacity', label: 'Capacity', path: '/capacity', icon: 'Users', badge: 'NEW' },
  { id: 'quarters', label: 'Quarters', path: '/quarters', icon: 'Calendar' },
  { id: 'reports', label: 'Reports', path: '/reports-discovery', icon: 'FileText' },
];

/**
 * Items dropdown configuration by workspace type
 */
export interface ItemConfig {
  label: string;
  icon: string;
  color: string;
  path: string;
}

// Project Items (no Epics, no Program Incidents)
export const projectItems: ItemConfig[] = [
  { label: 'Features', icon: 'Box', color: 'text-workitem-feature', path: '/features' },
  { label: 'Stories', icon: 'FileText', color: 'text-workitem-story', path: '/stories' },
  { label: 'Defects', icon: 'Bug', color: 'text-workitem-defect', path: '/items/defects' },
  { label: 'Incidents', icon: 'AlertOctagon', color: 'text-destructive', path: '/release/incidents' },
  { label: 'Risks', icon: 'AlertTriangle', color: 'text-destructive', path: '/enterprise/risks' },
  { label: 'Dependencies', icon: 'GitBranch', color: 'text-warning', path: '/dependencies' },
  { label: 'Quarters', icon: 'Calendar', color: 'text-info', path: '/quarters' },
];

// Program Items (Epics, Risks, Dependencies only)
export const programItems: ItemConfig[] = [
  { label: 'Epics', icon: 'Square', color: 'text-workitem-epic', path: '/items/epics' },
  { label: 'Risks', icon: 'AlertTriangle', color: 'text-destructive', path: '/enterprise/risks' },
  { label: 'Dependencies', icon: 'GitBranch', color: 'text-warning', path: '/dependencies' },
];
